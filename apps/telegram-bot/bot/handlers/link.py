"""Handler for the /link command."""

from telegram import Update
from telegram.ext import ContextTypes

from bot.client import BackendApiError, BackendClient


async def link_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    client: BackendClient | None = None,
) -> None:
    """Processes account linking with single-use digest tokens."""
    if not update.effective_message or not update.effective_user:
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

    backend = client or BackendClient()

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
            f"Your Telegram handle is now authenticated with your business principal. "
            f"You will receive deal challenges and agent updates here.\n\n"
            f"Use `/status` to check active representation.",
            parse_mode="Markdown",
        )
    except BackendApiError as exc:
        if exc.status_code == 400:
            await update.effective_message.reply_text(
                "❌ *Invalid or Expired Link Code*\n\n"
                "Single-use link codes expire after 10 minutes. "
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
                f"❌ *Linking Failed*\n\n{exc}",
                parse_mode="Markdown",
            )
