from datetime import UTC, datetime, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Mapper, Session

from app.contracts.identity import PrincipalResponse, SessionResponse, UserResponse
from app.core.rate_limit import AuthAttemptLimiter
from app.core.security import digest_token, token_matches, verify_password
from app.db.models import Principal, PrincipalMember, User, UserSession

ORIGIN = "http://localhost:3000"
PASSWORD = "demo-not-a-real-password"


def registration(email: str = "owner@example.com") -> dict[str, str]:
    return {"email": email, "password": PASSWORD, "display_name": "Demo Owner"}


def register(client: TestClient, email: str = "owner@example.com") -> UserResponse:
    response = client.post(
        "/v1/auth/register", json=registration(email), headers={"Origin": ORIGIN}
    )
    assert response.status_code == 201
    return UserResponse.model_validate(response.json())


def login(client: TestClient, email: str = "owner@example.com") -> SessionResponse:
    response = client.post(
        "/v1/auth/login",
        json={"email": email, "password": PASSWORD},
        headers={"Origin": ORIGIN},
    )
    assert response.status_code == 200
    return SessionResponse.model_validate(response.json())


def principal_payload() -> dict[str, object]:
    return {
        "legal_name": "Synthetic Kirana Demo",
        "trade_name": "Synthetic Kirana",
        "business_type": "retail",
        "address": "Synthetic demo address, Pune",
        "contact_email": "business@example.com",
        "roles": ["buyer"],
    }


def test_registration_hashes_password_and_normalizes_email(client: TestClient, db: Session) -> None:
    user_response = register(client, "Owner@Example.COM")
    user = db.scalar(select(User).where(User.id == user_response.id))
    assert user is not None
    assert user.email == "owner@example.com"
    assert user.password_hash != PASSWORD
    assert verify_password(user.password_hash, PASSWORD)
    assert user.auth_provider == "password"
    assert "password" not in user_response.model_dump(mode="json")


def test_registration_requires_allowed_origin(client: TestClient) -> None:
    response = client.post("/v1/auth/register", json=registration())
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_duplicate_email_is_case_insensitive_and_conflict(client: TestClient) -> None:
    register(client, "owner@example.com")
    response = client.post(
        "/v1/auth/register",
        json=registration("OWNER@EXAMPLE.COM"),
        headers={"Origin": ORIGIN},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"
    assert "owner@example.com" not in response.text


def test_login_issues_opaque_cookie_and_hashed_session(client: TestClient, db: Session) -> None:
    user = register(client)
    authenticated = login(client)
    assert authenticated.user.id == user.id

    session_token = client.cookies.get("vanik_session")
    assert session_token is not None
    stored = db.scalar(select(UserSession).where(UserSession.user_id == user.id))
    assert stored is not None
    assert stored.token_hash == digest_token(session_token)
    assert session_token not in stored.token_hash
    assert token_matches(authenticated.csrf_token, stored.csrf_hash)
    assert "demo-not-a-real-password" not in repr(authenticated)

    set_cookie = client.post(
        "/v1/auth/login",
        json={"email": "owner@example.com", "password": PASSWORD},
        headers={"Origin": ORIGIN},
    ).headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie
    assert "Secure" not in set_cookie


def test_login_requires_allowed_origin(client: TestClient) -> None:
    register(client)
    response = client.post(
        "/v1/auth/login", json={"email": "owner@example.com", "password": PASSWORD}
    )
    assert response.status_code == 403


def test_auth_attempts_are_rate_limited(application: FastAPI, client: TestClient) -> None:
    application.state.auth_limiter = AuthAttemptLimiter(limit=2)
    for expected in (401, 401, 429):
        response = client.post(
            "/v1/auth/login",
            json={"email": "unknown@example.com", "password": PASSWORD},
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == expected
        assert response.headers["cache-control"] == "no-store"
    assert response.headers["retry-after"] == "60"
    assert response.json()["error"]["code"] == "rate_limited"


def test_invalid_login_is_generic_for_unknown_email_and_wrong_password(client: TestClient) -> None:
    register(client)
    for email, password in [
        ("unknown@example.com", PASSWORD),
        ("owner@example.com", "incorrect-password"),
    ]:
        response = client.post(
            "/v1/auth/login",
            json={"email": email, "password": password},
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "unauthenticated"
        assert email not in response.text


def test_session_read_preserves_csrf_for_other_tabs(client: TestClient) -> None:
    register(client)
    initial = login(client)
    for _ in range(2):
        response = client.get("/v1/auth/session")
        assert response.status_code == 200
        current = SessionResponse.model_validate(response.json())
        assert current.csrf_token == initial.csrf_token

    allowed = client.post(
        "/v1/principals",
        json=principal_payload(),
        headers={"Origin": ORIGIN, "X-CSRF-Token": initial.csrf_token},
    )
    assert allowed.status_code == 201


def test_principal_creation_is_atomic_and_owner_can_read(client: TestClient, db: Session) -> None:
    user = register(client)
    authenticated = login(client)
    response = client.post(
        "/v1/principals",
        json=principal_payload(),
        headers={"Origin": ORIGIN, "X-CSRF-Token": authenticated.csrf_token},
    )
    assert response.status_code == 201
    principal = PrincipalResponse.model_validate(response.json())
    assert principal.membership_role == "owner"
    assert principal.verification_status == "not_submitted"

    membership = db.scalar(
        select(PrincipalMember).where(
            PrincipalMember.principal_id == principal.id,
            PrincipalMember.user_id == user.id,
        )
    )
    assert membership is not None
    assert membership.role == "owner"

    read_response = client.get(f"/v1/principals/{principal.id}")
    assert read_response.status_code == 200
    assert read_response.headers["cache-control"] == "no-store"
    assert read_response.json() == response.json()


def test_principal_creation_rolls_back_if_membership_fails(client: TestClient, db: Session) -> None:
    register(client)
    authenticated = login(client)

    def reject_membership(
        _mapper: Mapper[PrincipalMember],
        _connection: Connection,
        _target: PrincipalMember,
    ) -> None:
        raise RuntimeError("synthetic membership failure")

    event.listen(PrincipalMember, "before_insert", reject_membership)
    try:
        response = client.post(
            "/v1/principals",
            json=principal_payload(),
            headers={"Origin": ORIGIN, "X-CSRF-Token": authenticated.csrf_token},
        )
    finally:
        event.remove(PrincipalMember, "before_insert", reject_membership)

    assert response.status_code == 500
    db.expire_all()
    assert db.scalar(select(func.count()).select_from(Principal)) == 0
    assert db.scalar(select(func.count()).select_from(PrincipalMember)) == 0


def test_principal_creation_requires_origin_and_csrf(client: TestClient) -> None:
    register(client)
    authenticated = login(client)
    missing_csrf = client.post(
        "/v1/principals", json=principal_payload(), headers={"Origin": ORIGIN}
    )
    assert missing_csrf.status_code == 403

    wrong_origin = client.post(
        "/v1/principals",
        json=principal_payload(),
        headers={"Origin": "https://attacker.invalid", "X-CSRF-Token": authenticated.csrf_token},
    )
    assert wrong_origin.status_code == 403


def test_principal_is_hidden_from_non_member(client: TestClient) -> None:
    register(client, "owner@example.com")
    owner_session = login(client, "owner@example.com")
    created = client.post(
        "/v1/principals",
        json=principal_payload(),
        headers={"Origin": ORIGIN, "X-CSRF-Token": owner_session.csrf_token},
    )
    principal_id = created.json()["id"]

    register(client, "other@example.com")
    login(client, "other@example.com")
    response = client.get(f"/v1/principals/{principal_id}")
    assert response.status_code == 404
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["error"]["code"] == "not_found"


def test_logout_revokes_session_and_clears_cookie(client: TestClient, db: Session) -> None:
    register(client)
    authenticated = login(client)
    response = client.post(
        "/v1/auth/logout",
        headers={"Origin": ORIGIN, "X-CSRF-Token": authenticated.csrf_token},
    )
    assert response.status_code == 204
    assert not response.content
    assert client.cookies.get("vanik_session") is None
    stored = db.scalar(select(UserSession))
    assert stored is not None and stored.revoked_at is not None
    assert client.get("/v1/auth/session").status_code == 401


def test_expired_and_disabled_sessions_are_rejected(client: TestClient, db: Session) -> None:
    user = register(client)
    login(client)
    stored = db.scalar(select(UserSession).where(UserSession.user_id == user.id))
    assert stored is not None
    stored.created_at = datetime.now(UTC) - timedelta(hours=2)
    stored.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert client.get("/v1/auth/session").status_code == 401

    stored.expires_at = datetime.now(UTC) + timedelta(hours=1)
    account = db.get(User, user.id)
    assert account is not None
    account.status = "disabled"
    db.commit()
    assert client.get("/v1/auth/session").status_code == 401
