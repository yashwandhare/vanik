"""Handler for the /start command."""

from telegram import Update
from telegram.ext import ContextTypes


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Welcomes the user and explains how to link their VANIK account."""
    if not update.effective_message:
        return

    text = (
        "👋 *Welcome to VANIK B2B Agentic Marketplace Bot*\n\n"
        "This bot provides real-time notification alerts, cryptographic deal challenges, "
        "and agent progress reports for your verified business principal.\n\n"
        "🔗 *Account Linking:*\n"
        "1. Open the VANIK web portal at `http://localhost:3000`\n"
        "2. Navigate to *Business Principal Profile*\n"
        "3. Click *Generate Telegram Link Code*\n"
        "4. Reply here with: `/link <YOUR_CODE>`\n\n"
        "Type `/help` to see all available commands."
    )
    await update.effective_message.reply_text(text, parse_mode="Markdown")
