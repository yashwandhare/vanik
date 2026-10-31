import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.contracts.identity import RegisterRequest


def test_validation_error_does_not_echo_credentials(
    application: FastAPI, client: TestClient
) -> None:
    @application.post("/test-only/register")
    def validate_registration(body: RegisterRequest) -> dict[str, str]:
        return {"email": str(body.email)}

    response = client.post(
        "/test-only/register",
        json={"email": "demo@example.com", "password": "secret", "display_name": "Demo"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "body.password"
    assert "secret" not in response.text
    assert response.json()["error"]["code"] == "validation_error"


def test_unexpected_error_is_standard_and_redacted(
    application: FastAPI, caplog: pytest.LogCaptureFixture
) -> None:
    @application.get("/test-only/failure")
    def fail() -> None:
        raise RuntimeError("secret-database-password")

    with TestClient(application) as client:
        response = client.get("/test-only/failure", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.json()["error"]["code"] == "internal_error"
    assert response.json()["error"]["request_id"] == response.headers["X-Request-ID"]
    assert "secret" not in response.text
    assert "secret" not in caplog.text
    assert "RuntimeError" in caplog.text
