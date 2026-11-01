"""Handler for the /help command."""

from telegram import Update
from telegram.ext import ContextTypes

from bot.config import BotSettings
from bot.navigation import navigation_keyboard


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_message:
        return
    settings: BotSettings = context.bot_data["settings"]
    text = (
        "VANIK Telegram Bot Commands\n\n"
        "/start — Onboarding and web navigation\n"
        "/link <CODE> — Link your account with a single-use web portal code\n"
        "/task <request> — Create a task for your authorized linked buyer\n"
        "/status — Show your Telegram ID (not a live backend status check)\n"
        "/help — Command reference\n\n"
        "Send link codes and task requests only in a private chat. "
        "Sign in to the web app to review offers and approve deals. "
        "The bot does not authorize deals or issue settlement receipts."
    )
    await update.effective_message.reply_text(
        text, reply_markup=navigation_keyboard(settings.public_app_url or None)
    )
