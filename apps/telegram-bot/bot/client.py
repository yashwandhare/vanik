"""API Client for communication between Telegram Bot worker and VANIK backend."""

from contextlib import suppress
from typing import Any

import httpx  # pyright: ignore[reportMissingImports]

from bot.config import BotSettings


class BackendApiError(Exception):
    def __init__(self, status_code: int, message: str, code: str = "api_error"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class BackendClient:
    def __init__(self, settings: BotSettings | None = None):
        self.settings = settings or BotSettings()
        self.base_url = self.settings.api_base_url.rstrip("/")
        self.bot_secret = self.settings.telegram_webhook_secret.get_secret_value()

    async def create_task_from_text(self, telegram_user_id: str, text: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/v1/operator/telegram/tasks/from-text",
            {"telegram_user_id": telegram_user_id, "text": text},
        )

    async def process_proactive(self) -> dict[str, Any]:
        return await self._request("POST", "/v1/operator/proactive/process", {})

    async def claim_notifications(self) -> list[dict[str, Any]]:
        data = await self._request("POST", "/v1/operator/notifications/claim", {})
        items = data.get("items")
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            raise BackendApiError(
                502, "Invalid notification response from VANIK API", "invalid_response"
            )
        return items

    async def ack_notification(self, notification_id: str, delivered: bool) -> None:
        await self._request(
            "POST",
            f"/v1/operator/notifications/{notification_id}/ack",
            {"delivered": delivered},
        )

    async def _request(self, method: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Telegram-Bot-Secret": self.bot_secret,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.request(method, url, json=payload, headers=headers)
            except httpx.RequestError:
                # Transport errors may contain request URLs, headers or credentials.
                raise BackendApiError(
                    502, "Failed to connect to VANIK API", "network_error"
                ) from None
        if response.is_success:
            if response.status_code == 204 or not response.content:
                return {}
            with suppress(ValueError):
                parsed = response.json()
                if isinstance(parsed, dict):
                    return parsed
            raise BackendApiError(502, "Invalid response from VANIK API", "invalid_response")
        body: dict[str, Any] = {}
        with suppress(ValueError):
            parsed = response.json()
            if isinstance(parsed, dict):
                body = parsed
        error = body.get("error", {})
        if not isinstance(error, dict):
            error = {}
        # Never expose raw server/transport messages to chat or logs.
        known_codes = {"invalid_link_code", "already_linked", "telegram_disabled"}
        code = error.get("code")
        if not isinstance(code, str) or code not in known_codes:
            code = f"http_{response.status_code}"
        raise BackendApiError(
            response.status_code, f"VANIK API request failed (HTTP {response.status_code})", code
        )

    async def complete_link(self, link_code: str, telegram_user_id: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/v1/telegram/link/complete",
            {"link_code": link_code, "telegram_user_id": str(telegram_user_id)},
        )
