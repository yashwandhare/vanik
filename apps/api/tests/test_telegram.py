from datetime import UTC, datetime, timedelta
from typing import Any, cast

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import digest_token
from app.db.models import TelegramLink, TelegramLinkToken

ORIGIN = "http://localhost:3000"
PASSWORD = "demo-not-a-real-password"
BOT_SECRET = "synthetic-telegram-secret-value-12345"


def authenticated(client: TestClient, email: str = "telegram@example.com") -> str:
    client.post(
        "/v1/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": "Telegram Owner"},
        headers={"Origin": ORIGIN},
    )
    response = client.post(
        "/v1/auth/login",
        json={"email": email, "password": PASSWORD},
        headers={"Origin": ORIGIN},
    )
    return cast(str, response.json()["csrf_token"])


def enable_bot(application: FastAPI) -> None:
    application.state.settings.telegram_bot_enabled = True
    application.state.settings.telegram_webhook_secret = SecretStr(BOT_SECRET)


def start_link(client: TestClient, csrf: str) -> dict[str, str]:
    response = client.post(
        "/v1/telegram/link/start",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
    )
    return cast(dict[str, str], response.json())


def complete_link(client: TestClient, code: str, telegram_user_id: str) -> Any:
    return client.post(
        "/v1/telegram/link/complete",
        json={"link_code": code, "telegram_user_id": telegram_user_id},
        headers={"X-Telegram-Bot-Secret": BOT_SECRET},
    )


def test_link_code_is_hashed_single_use_and_previous_code_is_invalidated(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    enable_bot(application)
    csrf = authenticated(client)
    first = start_link(client, csrf)
    second = start_link(client, csrf)
    tokens = list(db.scalars(select(TelegramLinkToken).order_by(TelegramLinkToken.created_at)))
    assert len(tokens) == 2
    assert tokens[0].used_at is not None
    assert tokens[1].token_hash == digest_token(second["link_code"])
    assert second["link_code"] not in tokens[1].token_hash
    assert complete_link(client, first["link_code"], "10001").status_code == 400
    linked = complete_link(client, second["link_code"], "10001")
    assert linked.status_code == 200
    assert linked.json()["telegram_user_id"] == "10001"
    assert complete_link(client, second["link_code"], "10001").status_code == 400


def test_complete_requires_enabled_bot_and_matching_secret(
    application: FastAPI, client: TestClient
) -> None:
    csrf = authenticated(client)
    code = start_link(client, csrf)["link_code"]
    disabled = client.post(
        "/v1/telegram/link/complete",
        json={"link_code": code, "telegram_user_id": "10002"},
        headers={"X-Telegram-Bot-Secret": BOT_SECRET},
    )
    assert disabled.status_code == 503
    enable_bot(application)
    wrong = client.post(
        "/v1/telegram/link/complete",
        json={"link_code": code, "telegram_user_id": "10002"},
        headers={"X-Telegram-Bot-Secret": "wrong"},
    )
    assert wrong.status_code == 401


def test_relink_revokes_old_link_and_unlink_is_idempotent(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    enable_bot(application)
    csrf = authenticated(client)
    first = start_link(client, csrf)
    assert complete_link(client, first["link_code"], "20001").status_code == 200
    second = start_link(client, csrf)
    assert complete_link(client, second["link_code"], "20002").status_code == 200
    links = list(db.scalars(select(TelegramLink).order_by(TelegramLink.linked_at)))
    assert len(links) == 2
    assert links[0].revoked_at is not None
    assert links[1].revoked_at is None
    for _ in range(2):
        response = client.delete(
            "/v1/telegram/link",
            headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        )
        assert response.status_code == 204
    db.expire_all()
    assert all(link.revoked_at is not None for link in links)


def test_expired_code_and_cross_user_telegram_claim_are_rejected(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    enable_bot(application)
    first_csrf = authenticated(client, "first@example.com")
    first = start_link(client, first_csrf)
    assert complete_link(client, first["link_code"], "30001").status_code == 200

    second_csrf = authenticated(client, "second@example.com")
    expired = start_link(client, second_csrf)
    token = db.scalar(
        select(TelegramLinkToken).where(
            TelegramLinkToken.token_hash == digest_token(expired["link_code"])
        )
    )
    assert token is not None
    token.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert complete_link(client, expired["link_code"], "30002").status_code == 400

    valid = start_link(client, second_csrf)
    assert complete_link(client, valid["link_code"], "30001").status_code == 409
