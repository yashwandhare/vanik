"""Handler for onboarding and validated navigation deep links."""

from telegram import Update
from telegram.ext import ContextTypes

from bot.config import BotSettings
from bot.handlers.status import status_handler
from bot.navigation import canonical_reference, miniapp_url, navigation_keyboard


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Open references in the web app without claiming their existence or status."""
    if not update.effective_message:
        return
    settings: BotSettings = context.bot_data["settings"]
    if context.args:
        payload = context.args[0]
        if payload == "status" and len(context.args) == 1:
            await status_handler(update, context)
            return
        routes = {
            "deal": ("approval", "Deal review", "Deal"),
            "task": ("mandate", "Task details", "Task"),
            "timeline": ("timeline", "Negotiation timeline", "Task"),
            "rounds": ("timeline", "Negotiation timeline", "Task"),
            "passport": ("passport", "Agent passport", "Agent"),
        }
        prefix, separator, reference = payload.partition("_")
        try:
            if len(context.args) != 1 or not separator or prefix not in routes:
                raise ValueError("Invalid deep link")
            reference = canonical_reference(reference)
            view, title, entity = routes[prefix]
            url = miniapp_url(settings, view, reference)
        except ValueError:
            await update.effective_message.reply_text(
                "Invalid VANIK reference. Open the web portal or use /help."
            )
            return
        text = (
            f"{title}\n\n{entity} reference: {reference}\n\n"
            "Sign in to the VANIK web app to check access and current details. "
            "Opening this link does not approve a deal. "
            "Deal approval requires human review in the authenticated web app."
        )
        if url is None:
            text += "\n\nWeb navigation is not configured. Contact the bot operator."
        await update.effective_message.reply_text(text, reply_markup=navigation_keyboard(url))
        return
    text = (
        "Welcome to VANIK\n\n"
        "Link your account to receive backend notifications and submit buyer tasks.\n\n"
        "1. Sign in to the VANIK web portal.\n"
        "2. Generate a Telegram link code in your business principal profile.\n"
        "3. Send /link <CODE> here in a private chat.\n\n"
        "Use /task <request> to create a task for your authorized buyer. "
        "Review offers and approve deals in the authenticated web app, not in this chat.\n\n"
        "Use /help for commands."
    )
    if not settings.public_app_url:
        text += "\n\nWeb navigation is not configured. Contact the bot operator."
    await update.effective_message.reply_text(
        text, reply_markup=navigation_keyboard(settings.public_app_url or None)
    )
