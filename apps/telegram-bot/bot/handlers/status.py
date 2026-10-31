"""Handler for the /status command."""

from telegram import Update
from telegram.ext import ContextTypes


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Displays informational status; live authorized query is pending Phase 6 contracts."""
    if not update.effective_message or not update.effective_user:
        return

    user_id = str(update.effective_user.id)
    text = (
        "ℹ️ *VANIK Bot Status (Informational)*\n\n"
        f"• *Telegram User ID:* `{user_id}`\n"
        "• *Bot Worker:* Online\n"
        "• *Account Link:* Submit `/link <CODE>` with a 10-minute token from the web portal\n"
        "• *Backend Status:* Live membership query pending Phase 6 notification API\n\n"
        "Use `/help` for command instructions."
    )
    await update.effective_message.reply_text(text, parse_mode="Markdown")
