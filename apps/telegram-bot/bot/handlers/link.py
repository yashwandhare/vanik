"""Handler for the /link command."""

import logging

from telegram import Update
from telegram.ext import ContextTypes

from bot.client import BackendApiError, BackendClient

logger = logging.getLogger("vanik.bot.link")


async def link_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    client: BackendClient | None = None,
) -> None:
    """Processes account linking with single-use digest tokens."""
    if not update.effective_message or not update.effective_user:
        return

    if getattr(update.effective_chat, "type", None) in ("group", "supergroup", "channel"):
        await update.effective_message.reply_text("Use /link in a private chat with this bot.")
        return

    args = context.args or []
    if not args:
        await update.effective_message.reply_text(
            "⚠️ *Missing Link Code*\n\n"
            "Usage: `/link <CODE>`\n"
            "Example: `/link VANIK-LINK-948214`\n\n"
            "Generate your code in the VANIK web portal under *Business Principal*.",
            parse_mode="Markdown",
        )
        return

    link_code = args[0].strip()
    telegram_user_id = str(update.effective_user.id)

    backend = client or context.bot_data["backend"]

    try:
        res = await backend.complete_link(
            link_code=link_code,
            telegram_user_id=telegram_user_id,
        )
        linked_at = res.get("linked_at", "now")
        await update.effective_message.reply_text(
            f"✅ *Account Linked Successfully!*\n\n"
            f"• *Telegram User ID:* `{telegram_user_id}`\n"
            f"• *Linked At:* `{linked_at}`\n\n"
            f"Your Telegram account is linked to your business principal. "
            f"Backend notifications will be sent here when available.\n\n"
            f"Use `/task <request>` to submit a buyer task. "
            f"Deal approval requires human review in the authenticated web app.",
            parse_mode="Markdown",
        )
    except BackendApiError as exc:
        logger.warning("Account linking failed (backend HTTP %s)", exc.status_code)
        if exc.status_code == 400:
            await update.effective_message.reply_text(
                "❌ *Invalid or Expired Link Code*\n\n"
                "Single-use link codes expire. "
                "Please generate a fresh code in the VANIK web portal.",
                parse_mode="Markdown",
            )
        elif exc.status_code == 409:
            await update.effective_message.reply_text(
                "⚠️ *Already Linked*\n\n"
                "This Telegram account is already linked to a VANIK user. "
                "To re-link, unlink your account in the web portal first.",
                parse_mode="Markdown",
            )
        elif exc.status_code == 503:
            await update.effective_message.reply_text(
                "⚙️ *Telegram Bot Worker Disabled*\n\n"
                "Telegram integration is disabled in server configuration "
                "(`TELEGRAM_BOT_ENABLED=false`).",
                parse_mode="Markdown",
            )
        else:
            await update.effective_message.reply_text(
                "❌ Linking Failed\n\nThe request could not be confirmed. "
                "Check your linked account in the web portal before trying again.",
                parse_mode="Markdown",
            )
