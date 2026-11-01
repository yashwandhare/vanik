from copy import deepcopy
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.tasks import router as tasks_router
from app.db.models import Agent, AgentKey, AuditEvent, Principal, PrincipalMember, Product
from app.db.task_models import PrincipalProcurementPolicy, Task, TaskLine
from app.seed import SELLERS, demo_id, seed_demo

ORIGIN = "http://localhost:3000"


@pytest.fixture  # type: ignore[untyped-decorator, unused-ignore]
def client(application: FastAPI) -> TestClient:
    application.include_router(tasks_router)
    return TestClient(application)


def login(client: TestClient, application: FastAPI, email: str) -> dict[str, str]:
    response = client.post(
        "/v1/auth/login",
        headers={"Origin": ORIGIN},
        json={
            "email": email,
            "password": application.state.settings.demo_account_password.get_secret_value(),
        },
    )
    assert response.status_code == 200
    return {"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]}


def add_buyer_policy(
    db: Session,
    *,
    max_budget: Decimal = Decimal("10000.00"),
    max_credit_days: int = 30,
    max_rounds: int = 5,
) -> PrincipalProcurementPolicy:
    principal_id = demo_id("principal", "buyer-kirana")
    policy = db.get(PrincipalProcurementPolicy, principal_id)
    if policy is None:
        policy = PrincipalProcurementPolicy(principal_id=principal_id)
        db.add(policy)
    policy.max_budget_inr = max_budget
    policy.max_credit_days = max_credit_days
    policy.max_rounds = max_rounds
    policy.credit_score = 80
    db.commit()
    return policy


def setup_buyer(
    client: TestClient, application: FastAPI, db: Session, *, policy: bool = True
) -> tuple[dict[str, str], UUID, UUID]:
    seed_demo(db, application.state.settings)
    if policy:
        add_buyer_policy(db)
    else:
        seeded = db.get(PrincipalProcurementPolicy, demo_id("principal", "buyer-kirana"))
        if seeded is not None:
            db.delete(seeded)
            db.commit()
    headers = login(client, application, "buyer-kirana@example.com")
    return (
        headers,
        demo_id("principal", "buyer-kirana"),
        demo_id("agent", "buyer-kirana"),
    )


def valid_payload(principal_id: UUID, agent_id: UUID) -> dict[str, object]:
    now = datetime.now(UTC)
    return {
        "principal_id": str(principal_id),
        "agent_id": str(agent_id),
        "objective": "Restock rice before the Diwali rush",
        "category": "procurement",
        "lines": [
            {"sku": "STP-RICE-BAS-5K", "quantity": "12.500", "unit": "bag"},
            {"sku": "SPC-CARD-50", "quantity": "4.000", "unit": "pack"},
        ],
        "budget": "9500.00",
        "currency": "INR",
        "delivery_deadline": (now + timedelta(days=5)).isoformat(),
        "expires_at": (now + timedelta(days=2)).isoformat(),
        "priorities": {"price": "0.70", "delivery": "0.30"},
        "allowed_tools": ["marketplace_search", "benchmark_compare"],
        "permitted_actions": ["request_quote", "evaluate_offers"],
        "max_rounds": 3,
        "min_credit_days": 15,
        "max_upfront_pct": "25.00",
        "requires_human_approval": True,
    }


def test_create_get_list_and_immutable_line_snapshots(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    headers, principal_id, agent_id = setup_buyer(client, application, db)
    response = client.post("/v1/tasks", headers=headers, json=valid_payload(principal_id, agent_id))
    assert response.status_code == 201
    created = response.json()
    task_id = UUID(created["id"])
    assert created["status"] == "created" and created["version"] == 1
    assert created["mandate"]["budget"] == "9500.00"
    assert created["mandate"]["requires_human_approval"] is True
    assert created["mandate"]["lines"][0]["quantity"] == "12.500"
    assert created["mandate"]["delivery_deadline"].endswith("Z")
    assert "payment" not in str(created["mandate"])

    task = db.get(Task, task_id)
    lines = list(db.scalars(select(TaskLine).where(TaskLine.task_id == task_id)))
    event = db.scalar(select(AuditEvent).where(AuditEvent.entity_id == task_id))
    assert task is not None and len(lines) == 2
    assert {line.sku for line in lines} == {"STP-RICE-BAS-5K", "SPC-CARD-50"}
    assert all(isinstance(line.quantity, Decimal) for line in lines)
    assert event is not None and event.event_type == "task.created"

    product = db.scalar(select(Product).where(Product.sku == "STP-RICE-BAS-5K"))
    assert product is not None
    product.sku = "STP-RICE-BAS-5K-RENAMED"
    product.unit = "case"
    db.commit()
    fetched = client.get(f"/v1/tasks/{task_id}")
    assert fetched.status_code == 200
    assert fetched.json()["mandate"]["lines"][0] == created["mandate"]["lines"][0]

    second_payload = valid_payload(principal_id, agent_id)
    second_payload["lines"] = [{"sku": "SPC-CARD-50", "quantity": "1.000", "unit": "pack"}]
    second = client.post("/v1/tasks", headers=headers, json=second_payload)
    assert second.status_code == 201
    listed = client.get("/v1/tasks?limit=1&offset=1")
    assert listed.status_code == 200
    assert listed.json()["pagination"] == {"limit": 1, "offset": 1, "total": 2}
    all_tasks = client.get("/v1/tasks?limit=100").json()["items"]
    assert [(item["created_at"], item["id"]) for item in all_tasks] == sorted(
        (item["created_at"], item["id"]) for item in all_tasks
    )
    assert client.post(f"/v1/tasks/{task_id}/launch", headers=headers).status_code == 404


def test_policy_is_required_and_enforces_budget_credit_and_round_limits(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    headers, principal_id, agent_id = setup_buyer(client, application, db, policy=False)
    payload = valid_payload(principal_id, agent_id)
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 409

    add_buyer_policy(db, max_budget=Decimal("9000.00"), max_credit_days=10, max_rounds=2)
    for field, value in (
        ("budget", "9000.01"),
        ("min_credit_days", 11),
        ("max_rounds", 3),
    ):
        candidate = deepcopy(payload)
        candidate[field] = value
        assert client.post("/v1/tasks", headers=headers, json=candidate).status_code == 422
    assert db.scalar(select(func.count()).select_from(Task)) == 0
    assert (
        db.scalar(
            select(func.count()).select_from(AuditEvent).where(AuditEvent.event_type.like("task.%"))
        )
        == 0
    )


@pytest.mark.parametrize(  # type: ignore[untyped-decorator, unused-ignore]
    ("mutation", "value"),
    [
        ("duplicate_sku", None),
        ("bad_sku", None),
        ("inactive_sku", None),
        ("bad_unit", None),
        ("expired", None),
        ("expiry_after_deadline", None),
        ("bad_weights", None),
        ("duplicate_permission", None),
        ("payment_permission", None),
        ("place_order_permission", None),
        ("wrong_currency", None),
        ("no_approval", None),
        ("upfront_precision", None),
        ("naive_expiry", None),
    ],
)
def test_invalid_mandates_are_rejected(
    application: FastAPI,
    client: TestClient,
    db: Session,
    mutation: str,
    value: object,
) -> None:
    del value
    headers, principal_id, agent_id = setup_buyer(client, application, db)
    payload = valid_payload(principal_id, agent_id)
    now = datetime.now(UTC)
    if mutation == "duplicate_sku":
        payload["lines"] = [payload["lines"][0], payload["lines"][0]]  # type: ignore[index]
    elif mutation == "bad_sku":
        payload["lines"] = [{"sku": "UNKNOWN", "quantity": "1", "unit": "bag"}]
    elif mutation == "inactive_sku":
        product = db.scalar(select(Product).where(Product.sku == "STP-RICE-BAS-5K"))
        assert product is not None
        product.active = False
        db.commit()
        payload["lines"] = [{"sku": "STP-RICE-BAS-5K", "quantity": "1", "unit": "bag"}]
    elif mutation == "bad_unit":
        payload["lines"] = [{"sku": "STP-RICE-BAS-5K", "quantity": "1", "unit": "kilogram"}]
    elif mutation == "expired":
        payload["expires_at"] = (now - timedelta(minutes=1)).isoformat()
    elif mutation == "expiry_after_deadline":
        payload["expires_at"] = (now + timedelta(days=6)).isoformat()
    elif mutation == "bad_weights":
        payload["priorities"] = {"price": "0.60", "delivery": "0.39"}
    elif mutation == "duplicate_permission":
        payload["allowed_tools"] = ["marketplace_search", "marketplace_search"]
    elif mutation == "payment_permission":
        payload["allowed_tools"] = ["execute_payment"]
    elif mutation == "place_order_permission":
        payload["permitted_actions"] = ["request_quote", "place_order"]
    elif mutation == "wrong_currency":
        payload["currency"] = "USD"
    elif mutation == "no_approval":
        payload["requires_human_approval"] = False
    elif mutation == "upfront_precision":
        payload["max_upfront_pct"] = "25.001"
    elif mutation == "naive_expiry":
        payload["expires_at"] = (now + timedelta(days=1)).replace(tzinfo=None).isoformat()
    response = client.post("/v1/tasks", headers=headers, json=payload)
    assert response.status_code == 422
    assert db.scalar(select(func.count()).select_from(Task)) == 0


def test_principal_agent_and_current_key_must_remain_authorized(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    headers, principal_id, agent_id = setup_buyer(client, application, db)
    payload = valid_payload(principal_id, agent_id)
    seller_slug = SELLERS[0][0]
    seller_principal_id = demo_id("principal", seller_slug)
    seller_agent_id = demo_id("agent", seller_slug)

    cross_principal = deepcopy(payload)
    cross_principal["agent_id"] = str(seller_agent_id)
    assert client.post("/v1/tasks", headers=headers, json=cross_principal).status_code == 404

    agent = db.get(Agent, agent_id)
    principal = db.get(Principal, principal_id)
    key = db.scalar(select(AgentKey).where(AgentKey.agent_id == agent_id))
    assert agent is not None and principal is not None and key is not None
    agent.status = "paused"
    db.commit()
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 403
    agent.status = "active"
    db.commit()
    agent.status = "revoked"
    db.commit()
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 403
    agent.status = "active"
    key.status = "revoked"
    db.commit()
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 403
    key.status = "active"
    principal.status = "suspended"
    db.commit()
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 403
    principal.status = "active"
    principal.verification_status = "pending"
    db.commit()
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 403
    principal.verification_status = "demo_verified"
    db.commit()

    seller_headers = login(client, application, f"{seller_slug}@example.com")
    seller_payload = valid_payload(seller_principal_id, seller_agent_id)
    assert client.post("/v1/tasks", headers=seller_headers, json=seller_payload).status_code == 403
    assert client.post("/v1/tasks", headers=seller_headers, json=payload).status_code == 404
    assert client.get(f"/v1/tasks/{demo_id('task', 'absent')}").status_code == 404
    assert db.scalar(select(func.count()).select_from(Task)) == 0


def test_viewer_cannot_mutate_and_cancellation_is_terminal(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    headers, principal_id, agent_id = setup_buyer(client, application, db)
    payload = valid_payload(principal_id, agent_id)
    created = client.post("/v1/tasks", headers=headers, json=payload)
    assert created.status_code == 201
    task_id = UUID(created.json()["id"])
    membership = db.get(PrincipalMember, (principal_id, demo_id("user", "buyer-kirana")))
    assert membership is not None
    membership.role = "viewer"
    db.commit()
    assert client.get(f"/v1/tasks/{task_id}").status_code == 200
    assert client.get("/v1/tasks").json()["pagination"]["total"] == 1
    assert client.post("/v1/tasks", headers=headers, json=payload).status_code == 403
    assert client.post(f"/v1/tasks/{task_id}/cancel", headers=headers).status_code == 403

    membership.role = "operator"
    db.commit()
    cancelled = client.post(f"/v1/tasks/{task_id}/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["version"] == 2
    assert client.post(f"/v1/tasks/{task_id}/cancel", headers=headers).status_code == 409
    events = list(
        db.scalars(
            select(AuditEvent)
            .where(AuditEvent.entity_id == task_id)
            .order_by(AuditEvent.created_at, AuditEvent.id)
        )
    )
    assert [event.event_type for event in events] == ["task.created", "task.cancelled"]
    assert db.scalar(select(func.count()).select_from(TaskLine)) == 2


def test_revoked_membership_is_concealed_from_get_and_list(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    headers, principal_id, agent_id = setup_buyer(client, application, db)
    created = client.post("/v1/tasks", headers=headers, json=valid_payload(principal_id, agent_id))
    task_id = created.json()["id"]
    membership = db.get(PrincipalMember, (principal_id, demo_id("user", "buyer-kirana")))
    assert membership is not None
    membership.status = "revoked"
    db.commit()
    assert client.get(f"/v1/tasks/{task_id}").status_code == 404
    assert client.get("/v1/tasks").json()["pagination"]["total"] == 0
