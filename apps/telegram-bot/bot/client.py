"""API Client for communication between Telegram Bot worker and VANIK backend."""

from typing import Any

import httpx

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

    async def complete_link(self, link_code: str, telegram_user_id: str) -> dict[str, Any]:
        """Calls POST /v1/telegram/link/complete with X-Telegram-Bot-Secret header."""
        url = f"{self.base_url}/v1/telegram/link/complete"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Telegram-Bot-Secret": self.bot_secret,
        }
        payload = {
            "link_code": link_code,
            "telegram_user_id": str(telegram_user_id),
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.RequestError as exc:
                raise BackendApiError(
                    status_code=502,
                    message=f"Failed to connect to VANIK API: {exc}",
                    code="network_error",
                ) from exc

            if response.status_code == 200:
                data: dict[str, Any] = response.json()
                return data

            try:
                body = response.json()
                error_envelope = body.get("error", {})
                message = error_envelope.get("message", response.text)
                code = error_envelope.get("code", f"http_{response.status_code}")
            except Exception:
                message = response.text or f"HTTP {response.status_code}"
                code = f"http_{response.status_code}"

            raise BackendApiError(status_code=response.status_code, message=message, code=code)
