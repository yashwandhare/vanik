"""Tests for truthful commands, authorization boundaries and web navigation."""

import logging
from unittest.mock import AsyncMock, MagicMock

import pytest

from bot.client import BackendApiError
from bot.config import BotSettings
from bot.handlers.help import help_handler
from bot.handlers.link import link_handler
from bot.handlers.start import start_handler
from bot.handlers.status import status_handler
from bot.handlers.task import task_handler

REFERENCE = "70000000-0000-4000-8000-000000000001"


@pytest.fixture
def command() -> tuple[MagicMock, MagicMock]:
    update = MagicMock()
    update.effective_user.id = 123456789
    update.effective_chat.type = "private"
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = []
    backend = MagicMock()
    backend.complete_link = AsyncMock(return_value={"linked_at": "2026-10-31T12:00:00Z"})
    backend.create_task_from_text = AsyncMock(return_value={"id": REFERENCE, "status": "draft"})
    context.bot_data = {
        "settings": BotSettings(public_app_url="https://vanik.example.test"),
        "backend": backend,
    }
    return update, context


@pytest.mark.asyncio
async def test_start_handler(command: tuple[MagicMock, MagicMock]) -> None:
    update, context = command
    await start_handler(update, context)
    reply = update.effective_message.reply_text.call_args
    assert "Welcome to VANIK" in reply.args[0]
    assert "/link" in reply.args[0]
    assert "localhost" not in reply.args[0]
    assert reply.kwargs["reply_markup"].inline_keyboard[0][0].url == "https://vanik.example.test"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("prefix", "view", "field"),
    [
        ("deal", "approval", "dealId"),
        ("task", "mandate", "taskId"),
        ("timeline", "timeline", "taskId"),
        ("rounds", "timeline", "taskId"),
        ("passport", "passport", "agentId"),
    ],
)
async def test_validated_deep_links(
    command: tuple[MagicMock, MagicMock], prefix: str, view: str, field: str
) -> None:
    update, context = command
    context.args = [f"{prefix}_{REFERENCE}"]
    await start_handler(update, context)
    reply = update.effective_message.reply_text.call_args
    assert REFERENCE in reply.args[0]
    assert "does not approve" in reply.args[0]
    assert "Active" not in reply.args[0]
    url = reply.kwargs["reply_markup"].inline_keyboard[0][0].url
    assert url == f"https://vanik.example.test/miniapp?view={view}&{field}={REFERENCE}"
    assert "parse_mode" not in reply.kwargs


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        "deal_fake",
        "task_70000000-0001",
        "task_x](https://evil.test)",
        "passport_<script>",
        "unknown",
        "link_code",
    ],
)
async def test_invalid_deep_links(command: tuple[MagicMock, MagicMock], payload: str) -> None:
    update, context = command
    context.args = [payload]
    await start_handler(update, context)
    reply = update.effective_message.reply_text.call_args
    assert "Invalid VANIK reference" in reply.args[0]
    assert payload not in reply.args[0]
    assert "reply_markup" not in reply.kwargs


@pytest.mark.asyncio
async def test_multiple_deep_link_arguments_rejected(command: tuple[MagicMock, MagicMock]) -> None:
    update, context = command
    context.args = [f"task_{REFERENCE}", "extra"]
    await start_handler(update, context)
    assert "Invalid VANIK reference" in update.effective_message.reply_text.call_args.args[0]


@pytest.mark.asyncio
@pytest.mark.parametrize("args", [[], [f"deal_{REFERENCE}"]])
async def test_missing_public_url_has_no_fake_link(
    command: tuple[MagicMock, MagicMock], args: list[str]
) -> None:
    update, context = command
    context.args = args
    context.bot_data["settings"] = BotSettings(public_app_url="")
    await start_handler(update, context)
    reply = update.effective_message.reply_text.call_args
    assert "not configured" in reply.args[0]
    assert "localhost" not in reply.args[0]
    assert reply.kwargs["reply_markup"] is None


@pytest.mark.asyncio
async def test_help_handler(command: tuple[MagicMock, MagicMock]) -> None:
    update, context = command
    await help_handler(update, context)
    text = update.effective_message.reply_text.call_args.args[0]
    assert "VANIK Telegram Bot Commands" in text
    assert "/task <request>" in text
    assert "localhost" not in text


@pytest.mark.asyncio
@pytest.mark.parametrize("deep_link", [False, True])
async def test_status_is_not_fake_monitoring(
    command: tuple[MagicMock, MagicMock], deep_link: bool
) -> None:
    update, context = command
    if deep_link:
        context.args = ["status"]
        await start_handler(update, context)
    else:
        await status_handler(update, context)
    text = update.effective_message.reply_text.call_args.args[0]
    assert "123456789" in text
    assert "Bot Status (Informational)" in text
    assert "does not verify" in text
    assert "Monitoring" not in text
    assert "Online" not in text


@pytest.mark.asyncio
async def test_link_handler_missing_code(command: tuple[MagicMock, MagicMock]) -> None:
    update, context = command
    await link_handler(update, context)
    assert "Missing Link Code" in update.effective_message.reply_text.call_args.args[0]
    context.bot_data["backend"].complete_link.assert_not_called()


@pytest.mark.asyncio
async def test_link_handler_success(command: tuple[MagicMock, MagicMock]) -> None:
    update, context = command
    context.args = ["VANIK-LINK-94821411223344"]
    await link_handler(update, context)
    context.bot_data["backend"].complete_link.assert_awaited_once_with(
        link_code="VANIK-LINK-94821411223344", telegram_user_id="123456789"
    )
    assert "Account Linked Successfully" in update.effective_message.reply_text.call_args.args[0]


@pytest.mark.asyncio
async def test_link_failure_does_not_echo_secrets(
    command: tuple[MagicMock, MagicMock], caplog: pytest.LogCaptureFixture
) -> None:
    update, context = command
    context.args = ["secret-link-code"]
    context.bot_data["backend"].complete_link.side_effect = BackendApiError(
        502, "secret-transport-token"
    )
    with caplog.at_level(logging.WARNING):
        await link_handler(update, context)
    assert "secret-transport-token" not in update.effective_message.reply_text.call_args.args[0]
    assert "secret" not in caplog.text


@pytest.mark.asyncio
async def test_task_creates_only_for_message_sender(command: tuple[MagicMock, MagicMock]) -> None:
    update, context = command
    context.args = ["Buy", "100", "kg", "rice"]
    await task_handler(update, context)
    context.bot_data["backend"].create_task_from_text.assert_awaited_once_with(
        "123456789", "Buy 100 kg rice"
    )
    reply = update.effective_message.reply_text.call_args
    assert "Task created" in reply.args[0]
    assert "draft" not in reply.args[0]  # No unverified backend status claims.
    assert REFERENCE in reply.kwargs["reply_markup"].inline_keyboard[0][0].url


@pytest.mark.asyncio
@pytest.mark.parametrize("args", [[], ["x" * 2001]])
async def test_task_requires_bounded_text(
    command: tuple[MagicMock, MagicMock], args: list[str]
) -> None:
    update, context = command
    context.args = args
    await task_handler(update, context)
    context.bot_data["backend"].create_task_from_text.assert_not_called()
    assert "Usage: /task" in update.effective_message.reply_text.call_args.args[0]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (404, "authorized linked buyer"),
        (422, "could not be accepted"),
        (502, "before submitting again"),
    ],
)
async def test_task_failure_is_safe_and_not_retried(
    command: tuple[MagicMock, MagicMock],
    status: int,
    expected: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    update, context = command
    context.args = ["Buy rice"]
    backend = context.bot_data["backend"]
    backend.create_task_from_text.side_effect = BackendApiError(status, "transport-secret")
    await task_handler(update, context)
    reply = update.effective_message.reply_text.call_args
    assert expected in reply.args[0]
    assert "transport-secret" not in reply.args[0] + caplog.text
    backend.create_task_from_text.assert_awaited_once()


@pytest.mark.asyncio
async def test_task_invalid_backend_reference_is_not_echoed(
    command: tuple[MagicMock, MagicMock],
) -> None:
    update, context = command
    context.args = ["Buy rice"]
    context.bot_data["backend"].create_task_from_text.return_value = {"id": "[injection]"}
    await task_handler(update, context)
    text = update.effective_message.reply_text.call_args.args[0]
    assert "could not be verified" in text
    assert "[injection]" not in text


@pytest.mark.asyncio
@pytest.mark.parametrize("handler", [link_handler, task_handler])
async def test_sensitive_commands_require_private_chat(
    command: tuple[MagicMock, MagicMock], handler: AsyncMock
) -> None:
    update, context = command
    update.effective_chat.type = "group"
    context.args = ["sensitive"]
    await handler(update, context)
    context.bot_data["backend"].complete_link.assert_not_called()
    context.bot_data["backend"].create_task_from_text.assert_not_called()
    assert "private chat" in update.effective_message.reply_text.call_args.args[0]
