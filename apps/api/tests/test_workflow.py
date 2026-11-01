from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.contracts.workflow import AgentEnvelope
from app.db.models import (
    Agent,
    Inventory,
    PrincipalMember,
    SellerProfile,
    TelegramLink,
    UserSession,
)
from app.db.workflow_models import (
    AgentMessage,
    Deal,
    MockPayment,
    Negotiation,
    Notification,
    SecurityIncident,
)
from app.fixtures.diwali import DIWALI_PRODUCTS
from app.seed import demo_id, seed_demo
from app.services.events import ack_notification, claim_notifications
from app.services.protocol import ProtocolError, validate_envelope

ORIGIN = "http://localhost:3000"


def login_buyer(application: FastAPI, client: TestClient) -> dict[str, str]:
    response = client.post(
        "/v1/auth/login",
        headers={"Origin": ORIGIN},
        json={
            "email": "buyer-kirana@example.com",
            "password": application.state.settings.demo_account_password.get_secret_value(),
        },
    )
    assert response.status_code == 200
    return {"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]}


def task_payload() -> dict[str, object]:
    now = datetime.now(UTC)
    return {
        "principal_id": str(demo_id("principal", "buyer-kirana")),
        "agent_id": str(demo_id("agent", "buyer-kirana")),
        "objective": "Restock the full synthetic Diwali basket",
        "category": "procurement",
        "lines": [
            {"sku": sku, "quantity": "1.000", "unit": unit}
            for sku, _name, _category, unit, _price in DIWALI_PRODUCTS
        ],
        "budget": "100000.00",
        "currency": "INR",
        "delivery_deadline": (now + timedelta(days=10)).isoformat(),
        "expires_at": (now + timedelta(days=1)).isoformat(),
        "priorities": {
            "price": "0.55",
            "reliability": "0.20",
            "delivery": "0.15",
            "credit": "0.10",
        },
        "allowed_tools": ["marketplace_search", "benchmark_compare"],
        "permitted_actions": ["request_quote", "evaluate_offers"],
        "max_rounds": 3,
        "min_credit_days": 0,
        "max_upfront_pct": "100",
        "requires_human_approval": True,
    }


def test_full_demo_workflow_is_deterministic_and_human_approved(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    application.state.settings.telegram_bot_enabled = True
    application.state.settings.telegram_webhook_secret = SecretStr(
        "synthetic-workflow-telegram-secret-for-tests"
    )
    seed_demo(db, application.state.settings)
    headers = login_buyer(application, client)
    created = client.post("/v1/tasks", headers=headers, json=task_payload())
    assert created.status_code == 201, created.text
    task_id = created.json()["id"]
    assert len(created.json()["mandate"]["lines"]) == 40

    launched = client.post(f"/v1/tasks/{task_id}/launch", headers=headers)
    assert launched.status_code == 200, launched.text
    assert client.post(f"/v1/tasks/{task_id}/launch", headers=headers).status_code == 409
    body = launched.json()
    assert len(body["items"]) == 4
    assert body["recommendation_offer_id"]
    stored_message = db.scalar(select(AgentMessage).order_by(AgentMessage.created_at))
    assert stored_message is not None
    stored_negotiation = db.get(Negotiation, stored_message.negotiation_id)
    assert stored_negotiation is not None
    envelope = AgentEnvelope.model_validate(stored_message.envelope)
    with pytest.raises(ProtocolError, match="replay"):
        validate_envelope(db, stored_negotiation, envelope)
    tampered = envelope.model_copy(
        update={
            "message_id": UUID("ffffffff-0000-4000-8000-000000000001"),
            "nonce": "different-synthetic-nonce",
            "payload": {"tampered": True},
        }
    )
    original_state = stored_negotiation.state
    stored_negotiation.state = {
        "REQUEST_FOR_QUOTE": "rfq_sent",
        "OFFER": "rfq_sent",
        "FINAL_OFFER": "rfq_sent",
        "COUNTER_OFFER": "evaluating",
    }.get(envelope.message_type, original_state)
    with pytest.raises(ProtocolError, match="hash"):
        validate_envelope(db, stored_negotiation, tampered)
    stored_negotiation.state = original_state
    db.commit()  # Release the deliberate tampering-test row lock before the API request.
    valid_latest = []
    for negotiation in body["items"]:
        assert negotiation["round_no"] >= 1
        if negotiation["offers"]:
            latest = max(negotiation["offers"], key=lambda item: item["version"])
            if latest["valid"]:
                valid_latest.append((negotiation, latest))
                assert latest["ranking"]["factors"]
                assert len(latest["terms"]["lines"]) == 40
    assert len(valid_latest) >= 3
    assert (db.scalar(select(func.count()).select_from(SecurityIncident)) or 0) >= 2

    selected_neg, selected_offer = next(
        pair for pair in valid_latest if pair[1]["id"] == body["recommendation_offer_id"]
    )
    locked = client.post(
        f"/v1/negotiations/{selected_neg['id']}/accept",
        headers=headers,
        json={"offer_id": selected_offer["id"]},
    )
    assert locked.status_code == 200, locked.text
    deal = locked.json()
    assert deal["status"] == "locked"
    assert deal["label"] == "SIMULATED / NO REAL PAYMENT"
    assert len(deal["snapshot"]["line_items"]) == 40

    challenge = client.post(f"/v1/deals/{deal['id']}/approval-challenge", headers=headers)
    assert challenge.status_code == 200
    wrong = {
        "challenge_id": challenge.json()["challenge_id"],
        "deal_version": challenge.json()["deal_version"],
        "terms_hash": challenge.json()["terms_hash"],
        "nonce": "wrong-nonce-value-long-enough",
    }
    assert (
        client.post(f"/v1/deals/{deal['id']}/approve", headers=headers, json=wrong).status_code
        == 409
    )
    approved = client.post(
        f"/v1/deals/{deal['id']}/approve",
        headers=headers,
        json={
            "challenge_id": challenge.json()["challenge_id"],
            "deal_version": challenge.json()["deal_version"],
            "terms_hash": challenge.json()["terms_hash"],
            "nonce": challenge.json()["nonce"],
        },
    )
    assert approved.status_code == 200 and approved.json()["status"] == "approved"

    payment_headers = headers | {"Idempotency-Key": "synthetic-settlement-key-0001"}
    receipt = client.post(f"/v1/deals/{deal['id']}/settle", headers=payment_headers)
    again = client.post(f"/v1/deals/{deal['id']}/settle", headers=payment_headers)
    assert receipt.status_code == again.status_code == 200
    assert receipt.json() == again.json()
    assert receipt.json()["label"] == "MOCK UPI / NO FUNDS MOVED"
    assert db.scalar(select(func.count()).select_from(MockPayment)) == 1
    deal_record = db.get(Deal, UUID(deal["id"]))
    assert deal_record is not None and deal_record.status == "settled"

    replay = client.get(f"/v1/tasks/{task_id}/replay")
    assert replay.status_code == 200
    event_types = {event["event_type"] for event in replay.json()["events"]}
    assert {
        "task.created",
        "offer.validated",
        "deal.locked",
        "deal.approved",
        "payment.simulated",
    } <= event_types
    security = client.get(f"/v1/tasks/{task_id}/security")
    assert security.status_code == 200
    assert {item["incident_type"] for item in security.json()["items"]} >= {
        "prompt_injection",
        "fake_discount",
    }
    memories = client.get(f"/v1/principals/{demo_id('principal', 'buyer-kirana')}/supplier-memory")
    assert memories.status_code == 200 and memories.json()["items"]
    processed = client.post(
        "/v1/operator/proactive/process",
        headers={"X-Telegram-Bot-Secret": "synthetic-workflow-telegram-secret-for-tests"},
    )
    assert processed.json()["processed"] == 1
    assert (
        client.post(
            "/v1/operator/proactive/process",
            headers={"X-Telegram-Bot-Secret": "synthetic-workflow-telegram-secret-for-tests"},
        ).json()["processed"]
        == 0
    )
    notes = client.get("/v1/notifications")
    assert notes.status_code == 200 and len(notes.json()["items"]) >= 2
    claimed = client.post(
        "/v1/operator/notifications/claim",
        headers={"X-Telegram-Bot-Secret": "synthetic-workflow-telegram-secret-for-tests"},
    )
    assert claimed.status_code == 200
    for notification in claimed.json()["items"]:
        assert (
            client.post(
                f"/v1/operator/notifications/{notification['id']}/ack",
                headers={"X-Telegram-Bot-Secret": "synthetic-workflow-telegram-secret-for-tests"},
                json={"delivered": True},
            ).status_code
            == 200
        )
    memory_id = memories.json()["items"][0]["id"]
    disputed = client.post(
        f"/v1/supplier-memory/{memory_id}/dispute",
        headers=headers,
        json={"reason": "Synthetic evidence review"},
    )
    assert disputed.status_code == 200 and disputed.json()["status"] == "disputed"
    corrected = client.post(
        f"/v1/supplier-memory/{memory_id}/correct",
        headers=headers,
        json={"score": "0.9000", "confidence": "0.9500", "reason": "Synthetic correction"},
    )
    assert corrected.status_code == 200 and corrected.json()["status"] == "corrected"

    reservations = list(
        db.scalars(
            select(Inventory).where(
                Inventory.principal_id == UUID(selected_neg["seller_principal_id"])
            )
        )
    )
    assert all(item.reserved_qty == Decimal(0) for item in reservations)


def lock_demo(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> tuple[dict[str, str], dict[str, object]]:
    seed_demo(db, application.state.settings)
    headers = login_buyer(application, client)
    created = client.post("/v1/tasks", headers=headers, json=task_payload())
    assert created.status_code == 201
    task_id = created.json()["id"]
    launched = client.post(f"/v1/tasks/{task_id}/launch", headers=headers)
    assert launched.status_code == 200, launched.text
    selected = launched.json()["recommendation_offer_id"]
    neg = next(
        item
        for item in launched.json()["items"]
        if any(offer["id"] == selected for offer in item["offers"])
    )
    result = client.post(
        f"/v1/negotiations/{neg['id']}/accept",
        headers=headers,
        json={"offer_id": selected},
    )
    assert result.status_code == 200, result.text
    return headers, result.json()


@pytest.mark.parametrize("failure", ["expired", "changed_snapshot", "revoked_agent"])
def test_settlement_rejects_expired_changed_or_revoked_deal(
    application: FastAPI,
    client: TestClient,
    db: Session,
    failure: str,
) -> None:
    headers, locked = lock_demo(application, client, db)
    deal_id = locked["id"]
    challenge = client.post(f"/v1/deals/{deal_id}/approval-challenge", headers=headers).json()
    payload = {
        key: challenge[key] for key in ("challenge_id", "deal_version", "terms_hash", "nonce")
    }
    assert (
        client.post(f"/v1/deals/{deal_id}/approve", headers=headers, json=payload).status_code
        == 200
    )
    record = db.get(Deal, UUID(str(deal_id)))
    assert record is not None
    if failure == "expired":
        record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    elif failure == "changed_snapshot":
        record.snapshot = record.snapshot | {"amount": "1.00"}
    else:
        agent = db.get(Agent, demo_id("agent", "buyer-kirana"))
        assert agent is not None
        agent.status = "revoked"
    db.commit()
    result = client.post(
        f"/v1/deals/{deal_id}/settle",
        headers=headers
        | {
            "Idempotency-Key": "synthetic-refused-payment-key",
        },
    )
    assert result.status_code == 409, result.text
    assert db.scalar(select(func.count()).select_from(MockPayment)) == 0


def test_reject_and_expiry_release_reservations(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> None:
    from app.services.deals import expire_deals

    headers, locked = lock_demo(application, client, db)
    assert client.post(f"/v1/deals/{locked['id']}/reject", headers=headers).status_code == 200
    assert all(item.reserved_qty == 0 for item in db.scalars(select(Inventory)))
    headers, locked = lock_demo(application, client, db)
    deal = db.get(Deal, UUID(str(locked["id"])))
    assert deal is not None
    deal.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert expire_deals(db) == 1
    assert expire_deals(db) == 0
    assert all(item.reserved_qty == 0 for item in db.scalars(select(Inventory)))


def test_revoked_membership_cannot_read_replay_security_or_memory(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> None:
    _headers, locked = lock_demo(application, client, db)
    member = db.get(
        PrincipalMember, (demo_id("principal", "buyer-kirana"), demo_id("user", "buyer-kirana"))
    )
    assert member is not None
    member.status = "revoked"
    db.commit()
    assert client.get(f"/v1/tasks/{locked['task_id']}/replay").status_code == 404
    assert client.get(f"/v1/tasks/{locked['task_id']}/security").status_code == 404
    assert client.get(f"/v1/principals/{member.principal_id}/supplier-memory").status_code == 404


def test_notification_lease_reclaim_and_idempotent_ack(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> None:
    from app.services.events import process_proactive

    seed_demo(db, application.state.settings)
    user_id = demo_id("user", "buyer-kirana")
    db.add(TelegramLink(user_id=user_id, telegram_user_id="123456789"))
    db.commit()
    assert process_proactive(db) == 1
    first = claim_notifications(db)
    assert len(first) == 1
    note_id = UUID(str(first[0]["id"]))
    assert claim_notifications(db) == []
    note = db.get(Notification, note_id)
    assert note is not None
    note.claimed_at = datetime.now(UTC) - timedelta(minutes=6)
    db.commit()
    assert claim_notifications(db)[0]["id"] == str(note_id)
    ack_notification(db, note_id, False)
    assert claim_notifications(db)[0]["id"] == str(note_id)
    ack_notification(db, note_id, True)
    ack_notification(db, note_id, True)
    assert claim_notifications(db) == []


def test_linked_bot_task_creates_no_browser_session(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> None:
    seed_demo(db, application.state.settings)
    application.state.settings.telegram_bot_enabled = True
    secret = "synthetic-bot-task-secret-at-least-32-characters"
    application.state.settings.telegram_webhook_secret = SecretStr(secret)
    db.add(TelegramLink(user_id=demo_id("user", "buyer-kirana"), telegram_user_id="123456789"))
    db.commit()
    before = db.scalar(select(func.count()).select_from(UserSession))
    body = {"telegram_user_id": "123456789", "text": "Restock full Diwali basket within INR 50000"}
    assert client.post("/v1/operator/telegram/tasks/from-text", json=body).status_code == 401
    result = client.post(
        "/v1/operator/telegram/tasks/from-text",
        json=body,
        headers={"X-Telegram-Bot-Secret": secret},
    )
    assert result.status_code == 200, result.text
    assert Decimal(result.json()["mandate"]["budget"]) == Decimal("50000")
    assert len(result.json()["mandate"]["lines"]) == 40
    assert db.scalar(select(func.count()).select_from(UserSession)) == before
    body["text"] = "Buy rice"
    assert (
        client.post(
            "/v1/operator/telegram/tasks/from-text",
            json=body,
            headers={"X-Telegram-Bot-Secret": secret},
        ).status_code
        == 422
    )


def test_procurement_policy_requires_owner_and_enforces_ceiling(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> None:
    seed_demo(db, application.state.settings)
    headers = login_buyer(application, client)
    principal_id = demo_id("principal", "buyer-kirana")
    path = f"/v1/tasks/policies/{principal_id}"
    payload = {"max_budget_inr": "10000", "max_credit_days": 15, "max_rounds": 3}
    assert client.post(path, headers=headers, json=payload).status_code == 200
    assert client.get(path).json()["max_budget_inr"] == "10000.00"
    assert client.post("/v1/tasks", headers=headers, json=task_payload()).status_code == 422
    member = db.get(PrincipalMember, (principal_id, demo_id("user", "buyer-kirana")))
    assert member is not None
    member.role = "operator"
    db.commit()
    assert client.post(path, headers=headers, json=payload).status_code == 403


def test_seller_failure_is_isolated_and_budget_private(
    application: FastAPI,
    client: TestClient,
    db: Session,
) -> None:
    seed_demo(db, application.state.settings)
    profile = db.get(SellerProfile, demo_id("principal", "seller-risk"))
    assert profile is not None
    profile.public_policies = profile.public_policies | {"simulate_timeout": True}
    db.commit()
    headers = login_buyer(application, client)
    created = client.post("/v1/tasks", headers=headers, json=task_payload()).json()
    response = client.post(f"/v1/tasks/{created['id']}/launch", headers=headers)
    assert response.status_code == 200
    assert any(item["state"] == "expired" for item in response.json()["items"])
    assert response.json()["recommendation_offer_id"]
    for item in response.json()["items"]:
        for wire in item["messages"]:
            if wire["message_type"] == "REQUEST_FOR_QUOTE":
                assert "budget" not in wire["payload"]
                assert "100000" not in str(wire["payload"])
