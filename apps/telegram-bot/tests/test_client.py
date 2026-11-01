"""Unit tests for the secret-authenticated backend transport."""

from typing import Any
from unittest.mock import AsyncMock, patch

# Installed in the Bot venv; the root editor server uses the separate API venv.
import httpx  # pyright: ignore[reportMissingImports]
import pytest
from pydantic import SecretStr

from bot.client import BackendApiError, BackendClient
from bot.config import BotSettings


@pytest.fixture
def client() -> BackendClient:
    return BackendClient(
        BotSettings(
            api_base_url="https://api.example.test/",
            telegram_webhook_secret=SecretStr("synthetic-backend-secret"),
        )
    )


@pytest.mark.asyncio
async def test_complete_link_success(client: BackendClient) -> None:
    response = httpx.Response(200, json={"telegram_user_id": "999888777", "user_id": "user-id"})
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = response
        result = await client.complete_link("VANIK-LINK-1234567890", "999888777")
    assert result["telegram_user_id"] == "999888777"
    request.assert_awaited_once_with(
        "POST",
        "https://api.example.test/v1/telegram/link/complete",
        json={"link_code": "VANIK-LINK-1234567890", "telegram_user_id": "999888777"},
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Telegram-Bot-Secret": "synthetic-backend-secret",
        },
    )


@pytest.mark.asyncio
async def test_complete_link_invalid_code(client: BackendClient) -> None:
    response = httpx.Response(
        400, json={"error": {"code": "invalid_link_code", "message": "Expired or invalid"}}
    )
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = response
        with pytest.raises(BackendApiError) as error:
            await client.complete_link("INVALID_CODE", "999888777")
    assert error.value.status_code == 400
    assert error.value.code == "invalid_link_code"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("operation", "path", "payload", "response", "expected"),
    [
        (
            "create_task_from_text",
            "/v1/operator/telegram/tasks/from-text",
            {"telegram_user_id": "123", "text": "Buy rice"},
            {"id": "task-id", "status": "draft"},
            {"id": "task-id", "status": "draft"},
        ),
        (
            "process_proactive",
            "/v1/operator/proactive/process",
            {},
            {"processed": 2},
            {"processed": 2},
        ),
        (
            "claim_notifications",
            "/v1/operator/notifications/claim",
            {},
            {"items": [{"id": "notification-id", "telegram_user_id": "123", "text": "Update"}]},
            [{"id": "notification-id", "telegram_user_id": "123", "text": "Update"}],
        ),
        (
            "ack_notification",
            "/v1/operator/notifications/notification-id/ack",
            {"delivered": True},
            {"status": "delivered"},
            None,
        ),
    ],
)
async def test_operator_apis(
    client: BackendClient,
    operation: str,
    path: str,
    payload: dict[str, Any],
    response: dict[str, Any],
    expected: Any,
) -> None:
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = httpx.Response(200, json=response)
        result: Any
        if operation == "create_task_from_text":
            result = await client.create_task_from_text("123", "Buy rice")
        elif operation == "ack_notification":
            await client.ack_notification("notification-id", True)
            result = None
        else:
            result = await getattr(client, operation)()
    assert result == expected
    assert request.call_args.args == ("POST", f"https://api.example.test{path}")
    assert request.call_args.kwargs["json"] == payload
    assert request.call_args.kwargs["headers"]["X-Telegram-Bot-Secret"] == client.bot_secret


@pytest.mark.asyncio
@pytest.mark.parametrize("network_error", [httpx.ConnectError, httpx.ReadTimeout])
async def test_network_errors_are_safe(
    client: BackendClient, network_error: type[httpx.RequestError]
) -> None:
    secret = client.bot_secret
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.side_effect = network_error(f"https://transport.test/{secret}")
        with pytest.raises(BackendApiError) as error:
            await client.create_task_from_text("123", "Buy rice")
    assert error.value.status_code == 502
    assert error.value.code == "network_error"
    assert secret not in str(error.value)
    assert error.value.__cause__ is None
    assert error.value.__suppress_context__
    request.assert_awaited_once()  # Non-idempotent task POST is never retried.


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(500, text="synthetic-backend-secret"),
        httpx.Response(400, json={"error": "synthetic-backend-secret"}),
        httpx.Response(
            400, json={"error": {"code": "synthetic-backend-secret", "message": "secret"}}
        ),
        httpx.Response(502, content=b"not json"),
    ],
)
async def test_server_errors_never_expose_raw_body(
    client: BackendClient, response: httpx.Response
) -> None:
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = response
        with pytest.raises(BackendApiError) as error:
            await client.complete_link("code", "123")
    assert client.bot_secret not in str(error.value)
    assert client.bot_secret not in error.value.code


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [httpx.Response(204), httpx.Response(200)])
async def test_empty_success_ack(client: BackendClient, response: httpx.Response) -> None:
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = response
        await client.ack_notification("notification-id", False)
    assert request.call_args.kwargs["json"] == {"delivered": False}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response", [httpx.Response(200, text="invalid"), httpx.Response(200, json=[])]
)
async def test_invalid_success_body(client: BackendClient, response: httpx.Response) -> None:
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = response
        with pytest.raises(BackendApiError, match="Invalid response"):
            await client.process_proactive()


@pytest.mark.asyncio
@pytest.mark.parametrize("body", [{}, {"items": None}, {"items": ["not an object"]}])
async def test_invalid_claim_body(client: BackendClient, body: dict[str, Any]) -> None:
    with patch.object(httpx.AsyncClient, "request", new_callable=AsyncMock) as request:
        request.return_value = httpx.Response(200, json=body)
        with pytest.raises(BackendApiError, match="Invalid notification response"):
            await client.claim_notifications()
