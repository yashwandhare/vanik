"""Create buyer tasks from a linked Telegram user's request."""

import logging

from telegram import Update
from telegram.ext import ContextTypes

from bot.client import BackendApiError, BackendClient
from bot.config import BotSettings
from bot.navigation import miniapp_url, navigation_keyboard

logger = logging.getLogger("vanik.bot.task")


async def task_handler(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    client: BackendClient | None = None,
) -> None:
    if not update.effective_message or not update.effective_user:
        return
    if not update.effective_chat or update.effective_chat.type != "private":
        await update.effective_message.reply_text(
            "Submit /task requests in a private chat with this bot."
        )
        return
    text = " ".join(context.args or []).strip()
    if not text or len(text) > 2000:
        await update.effective_message.reply_text(
            "Usage: /task <buyer request> (up to 2000 characters).\n"
            "Example: /task Buy 100 kg rice at up to INR 60 per kg"
        )
        return
    backend = client or context.bot_data["backend"]
    settings: BotSettings = context.bot_data["settings"]
    try:
        result = await backend.create_task_from_text(str(update.effective_user.id), text)
        url = miniapp_url(settings, "mandate", str(result.get("id", "")))
    except BackendApiError as exc:
        logger.warning("Task submission failed (backend HTTP %s)", exc.status_code)
        if exc.status_code in {403, 404}:
            message = (
                "No authorized linked buyer was found. Sign in to the web portal, "
                "check your buyer membership and use /link <CODE>."
            )
        elif exc.status_code in {400, 422}:
            message = "The request could not be accepted. Check the quantity, product and budget."
        else:
            # A timed-out POST can have committed: never resubmit it automatically.
            message = (
                "Task creation could not be confirmed. Check your tasks in the web app "
                "before submitting again."
            )
        await update.effective_message.reply_text(message)
        return
    except ValueError:
        logger.error("Task submission returned an invalid reference")
        await update.effective_message.reply_text(
            "The backend response could not be verified. Check the web app before submitting again."
        )
        return
    message = (
        f"Task created.\nReference: {result['id']}\n\n"
        "Sign in to the web app to review the task and its current status. "
        "This is not a deal approval or a settlement receipt."
    )
    if url is None:
        message += "\n\nWeb navigation is not configured. Contact the bot operator."
    await update.effective_message.reply_text(message, reply_markup=navigation_keyboard(url))
