"""Tests for public web URL validation and dependency-free worker wiring."""

from unittest.mock import MagicMock

import pytest
from pydantic import SecretStr, ValidationError

# Installed in the Bot venv; the root editor server uses the separate API venv.
from telegram.ext import CommandHandler  # pyright: ignore[reportMissingImports]

from bot.config import BotSettings
from bot.main import build_application, error_handler, start_worker, stop_worker


def test_default_config() -> None:
    settings = BotSettings(public_app_url="")
    assert settings.api_base_url.startswith("http")
    assert settings.public_app_url == ""
    assert settings.telegram_worker_interval_seconds == 30


@pytest.mark.parametrize(
    "url",
    [
        "http://vanik.example.test",
        "javascript:alert(1)",
        "https://user:secret@vanik.example.test",
        "https://vanik.example.test/miniapp",
        "https://vanik.example.test?token=secret",
        "https://vanik.example.test/#secret",
        "https://vanik.example.test/\n",
    ],
)
def test_invalid_public_url_rejected(url: str) -> None:
    with pytest.raises(ValidationError, match="PUBLIC_APP_URL"):
        BotSettings(public_app_url=url)


def test_public_url_normalized() -> None:
    settings = BotSettings(public_app_url="https://vanik.example.test/")
    assert settings.public_app_url == "https://vanik.example.test"


@pytest.mark.asyncio
async def test_application_wires_real_worker_lifecycle_and_commands() -> None:
    app = build_application(
        BotSettings(
            telegram_bot_token=SecretStr("123456789:synthetic-test-token"),
            telegram_webhook_secret=SecretStr("synthetic-backend-secret"),
            public_app_url="https://vanik.example.test",
        )
    )
    commands: set[str] = set()
    for handler in app.handlers[0]:
        assert isinstance(handler, CommandHandler)  # No approval/settlement callbacks.
        commands.update(handler.commands)
    assert commands == {
        "start",
        "link",
        "task",
        "help",
        "status",
        "ganesh_kirana",
        "ganesh_agent",
        "create_agent",
        "auth_deal",
        "test",
        "sale",
        "miniapp",
        "disconnect",
        "reset",
    }
    assert app.post_init is start_worker
    assert app.post_stop is stop_worker
    assert app.post_shutdown is stop_worker
    assert error_handler in app.error_handlers
    assert app.bot_data["worker"].bot is app.bot
    assert app.bot_data["worker"].backend is app.bot_data["backend"]
    # Build does not require optional JobQueue/APScheduler dependencies or network.
    await app.shutdown()


@pytest.mark.asyncio
async def test_registered_lifecycle_hooks_start_and_stop_worker() -> None:
    app = MagicMock()
    worker = MagicMock()
    from unittest.mock import AsyncMock

    worker.stop = AsyncMock()
    app.bot_data = {"worker": worker}
    await start_worker(app)
    await stop_worker(app)
    worker.start.assert_called_once()
    worker.stop.assert_awaited_once()


def test_application_does_not_substitute_fake_credentials() -> None:
    with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN"):
        build_application(BotSettings(telegram_bot_token=SecretStr("")))
