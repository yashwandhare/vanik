from collections.abc import Iterator
from unittest.mock import Mock
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.contracts.common import ErrorResponse, HealthResponse
from app.db.session import get_session


def test_liveness_does_not_need_a_database(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "untrusted-client-value"})
    assert response.status_code == 200
    health = HealthResponse.model_validate(response.json())
    assert health.service == "VANIK API"
    assert health.version == "0.3.0"
    UUID(response.headers["X-Request-ID"])


def test_readiness_executes_database_query(application: FastAPI, client: TestClient) -> None:
    engine = create_engine("sqlite://")

    def sqlite_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    application.dependency_overrides[get_session] = sqlite_session
    try:
        response = client.get("/health/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ready", "database": "ok"}
    finally:
        engine.dispose()


def test_database_failure_is_unavailable_without_credentials(
    application: FastAPI, client: TestClient
) -> None:
    session = Mock(spec=Session)
    session.execute.side_effect = OperationalError("secret-query", {}, Exception("secret-password"))
    application.dependency_overrides[get_session] = lambda: session
    response = client.get("/health/ready")
    assert response.status_code == 503
    error = ErrorResponse.model_validate(response.json()).error
    assert error.code == "service_unavailable"
    assert str(error.request_id) == response.headers["X-Request-ID"]
    assert "secret" not in response.text


def test_unimplemented_commerce_is_not_a_fake_success(client: TestClient) -> None:
    response = client.post("/v1/tasks", json={})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_wrong_method_uses_standard_error(client: TestClient) -> None:
    response = client.post("/health")
    assert response.status_code == 405
    assert response.headers["allow"] == "GET"
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_cors_allows_only_explicit_origins(client: TestClient) -> None:
    for origin, expected in [("http://localhost:3000", 200), ("https://attacker.invalid", 400)]:
        response = client.options(
            "/health",
            headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
        )
        assert response.status_code == expected
        if expected == 200:
            assert response.headers["access-control-allow-origin"] == origin
        else:
            assert "access-control-allow-origin" not in response.headers
