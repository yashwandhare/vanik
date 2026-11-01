"""Handler for the /status command."""

from telegram import Update
from telegram.ext import ContextTypes


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Report only information observed from the current update."""
    if not update.effective_message or not update.effective_user:
        return
    text = (
        "VANIK Bot Status (Informational)\n\n"
        f"Telegram user ID: {update.effective_user.id}\n"
        "This command confirms only that the bot can respond to this message. "
        "It does not verify account linking, task activity or notification delivery.\n\n"
        "Sign in to the web portal to check your linked account and current tasks. "
        "Use /link <CODE> to link an account, or /help for instructions."
    )
    await update.effective_message.reply_text(text)
