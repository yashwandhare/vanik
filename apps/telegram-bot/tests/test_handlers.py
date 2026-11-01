"""Unit tests for bot command handlers."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from bot.handlers.adversarial_test import adversarial_test_handler
from bot.handlers.create_agent import create_agent_handler
from bot.handlers.help import help_handler
from bot.handlers.link import link_handler
from bot.handlers.sale import sale_handler
from bot.handlers.start import start_handler
from bot.handlers.status import status_handler
from bot.handlers.task import task_handler


@pytest.mark.asyncio
async def test_start_handler() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = []

    await start_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "Welcome to VANIK" in call_args
    assert "/link" in call_args


@pytest.mark.asyncio
async def test_start_handler_deal_deep_link() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = ["deal_diwali-2026-8812"]

    await start_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "VANIK Deal Approval Challenge" in call_args
    assert "deal_diwali-2026-8812" in call_args or "diwali-2026-8812" in call_args
    assert "miniapp?view=approval&dealId=diwali-2026-8812" in call_args


@pytest.mark.asyncio
async def test_start_handler_task_deep_link() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = ["task_70000000-0001"]

    await start_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "VANIK Task Mandate Orchestration" in call_args
    assert "miniapp?view=mandate&taskId=70000000-0001" in call_args


@pytest.mark.asyncio
async def test_start_handler_passport_deep_link() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = ["passport_30000000-0001"]

    await start_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "Agent Passport Verification" in call_args
    assert "miniapp?view=passport&agentId=30000000-0001" in call_args


@pytest.mark.asyncio
async def test_help_handler() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()

    await help_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "VANIK Telegram Bot Commands" in call_args
    assert "/status" in call_args


@pytest.mark.asyncio
async def test_status_handler() -> None:
    update = MagicMock()
    update.effective_user = MagicMock()
    update.effective_user.id = 123456789
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()

    await status_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "123456789" in call_args
    assert "Bot Status (Informational)" in call_args


@pytest.mark.asyncio
async def test_link_handler_missing_code() -> None:
    update = MagicMock()
    update.effective_user = MagicMock()
    update.effective_user.id = 123456789
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = []

    await link_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "Missing Link Code" in call_args


@pytest.mark.asyncio
async def test_link_handler_success() -> None:
    update = MagicMock()
    update.effective_user = MagicMock()
    update.effective_user.id = 123456789
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = ["VANIK-LINK-94821411223344"]

    mock_client = MagicMock()
    mock_client.complete_link = AsyncMock(
        return_value={
            "id": "link-uuid",
            "user_id": "user-uuid",
            "telegram_user_id": "123456789",
            "linked_at": "2026-10-31T12:00:00Z",
        }
    )

    await link_handler(update, context, client=mock_client)
    mock_client.complete_link.assert_called_once_with(
        link_code="VANIK-LINK-94821411223344",
        telegram_user_id="123456789",
    )
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "Account Linked Successfully" in call_args


@pytest.mark.asyncio
async def test_create_agent_handler() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    mock_msg = MagicMock()
    mock_msg.edit_text = AsyncMock()
    update.effective_message.reply_text = AsyncMock(return_value=mock_msg)
    context = MagicMock()
    context.args = ["Shree Ganesh Kirana", "|", "Diwali Buyer", "|", "buyer", "|", "default"]

    await create_agent_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    mock_msg.edit_text.assert_called_once()
    edit_args = mock_msg.edit_text.call_args[0][0]
    assert "Shree Ganesh Kirana" in edit_args
    assert "Minting Persistent Agent Passport" in edit_args
    assert "Ed25519" in edit_args


@pytest.mark.asyncio
async def test_task_handler() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    mock_msg = MagicMock()
    mock_msg.edit_text = AsyncMock()
    update.effective_message.reply_text = AsyncMock(return_value=mock_msg)
    context = MagicMock()
    context.args = ["Restock", "Diwali", "SKUs"]

    await task_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    mock_msg.edit_text.assert_called_once()
    edit_args = mock_msg.edit_text.call_args[0][0]
    assert "Parallel Negotiation Complete" in edit_args
    assert "Utsav Distributors" in edit_args
    assert "₹79,850.00" in edit_args


@pytest.mark.asyncio
async def test_adversarial_test_handler() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    mock_msg = MagicMock()
    mock_msg.edit_text = AsyncMock()
    update.effective_message.reply_text = AsyncMock(return_value=mock_msg)
    context = MagicMock()
    context.args = []

    await adversarial_test_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    mock_msg.edit_text.assert_called_once()
    edit_args = mock_msg.edit_text.call_args[0][0]
    assert "SECURITY INCIDENT REPORT" in edit_args
    assert "Synthetic Red Team Seller" in edit_args
    assert "PROMPT_INJECTION_ATTEMPT" in edit_args


@pytest.mark.asyncio
async def test_sale_handler() -> None:
    update = MagicMock()
    update.effective_message = MagicMock()
    update.effective_message.reply_text = AsyncMock()
    context = MagicMock()
    context.args = ["STP-RICE-BAS-5K", "580", "500"]

    await sale_handler(update, context)
    update.effective_message.reply_text.assert_called_once()
    call_args = update.effective_message.reply_text.call_args[0][0]
    assert "Flash Sale Live" in call_args
    assert "STP-RICE-BAS-5K" in call_args
    assert "₹580.00" in call_args
