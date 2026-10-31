"""Unit tests for bot API backend client."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from bot.client import BackendApiError, BackendClient
from bot.config import BotSettings


@pytest.mark.asyncio
async def test_complete_link_success() -> None:
    settings = BotSettings()
    client = BackendClient(settings)

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "id": "60000000-0000-4000-8000-000000000001",
            "user_id": "10000000-0000-4000-8000-000000000001",
            "telegram_user_id": "999888777",
            "linked_at": "2026-10-31T12:00:00Z",
        },
        request=httpx.Request("POST", "http://localhost:8000/v1/telegram/link/complete"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.complete_link("VANIK-LINK-1234567890", "999888777")
        assert res["telegram_user_id"] == "999888777"
        assert res["user_id"] == "10000000-0000-4000-8000-000000000001"


@pytest.mark.asyncio
async def test_complete_link_invalid_code() -> None:
    settings = BotSettings()
    client = BackendClient(settings)

    mock_resp = httpx.Response(
        status_code=400,
        json={"error": {"code": "invalid_link_code", "message": "Link code is expired or invalid"}},
        request=httpx.Request("POST", "http://localhost:8000/v1/telegram/link/complete"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        with pytest.raises(BackendApiError) as exc_info:
            await client.complete_link("INVALID_CODE", "999888777")
        assert exc_info.value.status_code == 400
        assert exc_info.value.code == "invalid_link_code"
