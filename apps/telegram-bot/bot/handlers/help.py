"""Handler for the /help command."""

from telegram import Update
from telegram.ext import ContextTypes


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Lists available bot commands and interaction workflows."""
    if not update.effective_message:
        return

    text = (
        "📖 *VANIK Telegram Bot Commands*\n\n"
        "• `/start` — Welcome message and deep-link processor\n"
        "• `/link <CODE>` — Link your Telegram user ID using a single-use code\n"
        "• `/create_agent` — Conversational creation of your buyer/seller AI agent\n"
        "• `/task <MANDATE>` — Launch parallel procurement negotiation across sellers\n"
        "• `/test` — Simulate a malicious adversarial seller attack & buyer defense\n"
        "• `/sale <SKU> <PRICE> <QTY>` — Put an item on sale live from Telegram\n"
        "• `/status` — View your account connection and agent status\n"
        "• `/help` — Display this command reference\n\n"
        "📱 *Mini App:* Access structured offer comparisons, cryptographic Passport verification, "
        "and deal sign-offs directly inside Telegram or at `http://localhost:3000/miniapp`."
    )
    await update.effective_message.reply_text(text, parse_mode="Markdown")
