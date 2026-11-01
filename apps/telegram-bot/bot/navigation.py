"""Validated navigation to the authenticated web application, not bot authorization."""

from urllib.parse import urlencode
from uuid import UUID

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from bot.config import BotSettings


def canonical_reference(value: str) -> str:
    reference = str(UUID(value))
    if reference != value.lower():
        raise ValueError("Expected a canonical UUID reference")
    return reference


def miniapp_url(settings: BotSettings, view: str, reference: str) -> str | None:
    fields = {
        "approval": "dealId",
        "mandate": "taskId",
        "timeline": "taskId",
        "passport": "agentId",
    }
    reference = canonical_reference(reference)
    field = fields[view]
    if not settings.public_app_url:
        return None
    return f"{settings.public_app_url}/miniapp?{urlencode({'view': view, field: reference})}"


def navigation_keyboard(
    url: str | None, label: str = "Open VANIK web app"
) -> InlineKeyboardMarkup | None:
    if url is None:
        return None
    return InlineKeyboardMarkup([[InlineKeyboardButton(label, url=url)]])
