"""Handler for the /status command."""

from telegram import Update
from telegram.ext import ContextTypes


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Displays the link status, principal membership, and active agent roster."""
    if not update.effective_message or not update.effective_user:
        return

    user_id = str(update.effective_user.id)
    text = (
        "📊 *VANIK Operational Status*\n\n"
        f"• *Telegram User ID:* `{user_id}`\n"
        "• *Service Status:* Active (Polling Mode)\n"
        "• *Marketplace Access:* Enabled\n"
        "• *Active Demo Dataset:* Diwali Kirana Restock Basket (40 SKUs)\n\n"
        "🤖 *Agent Authority:*\n"
        "AI agents operate under delegated principal constraints. You can review and edit "
        "task mandates directly in the Telegram Mini App or via the web portal at `http://localhost:3000/miniapp`.\n\n"
        "Type `/help` to see all available actions."
    )
    await update.effective_message.reply_text(text, parse_mode="Markdown")
