"""Handler for the /help command."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import ContextTypes

from bot.handlers.miniapp import resolve_base_url


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Lists available bot commands and interaction workflows."""
    if not update.effective_message:
        return

    base_url = resolve_base_url(context)

    text = (
        "📖 *VANIK Telegram Bot Commands*\n\n"
        "• `/start` — Welcome message and deep-link processor\n"
        "• `/ganesh_kirana` — Onboard pre-seeded Shree Ganesh Kirana Store (Pune)\n"
        "• `/ganesh_agent` — Spawn pre-seeded Diwali Bulk Procurement Agent\n"
        "• `/link <CODE>` — Link your Telegram user ID using a single-use code\n"
        "• `/create_agent` — Conversational creation of your buyer/seller AI agent\n"
        "• `/task <MANDATE>` — Launch parallel procurement negotiation across sellers\n"
        "• `/miniapp` — Open interactive Mini App for visual comparison & approval\n"
        "• `/auth_deal [DEAL] [METHOD]` — Authorize payment (UPI/Escrow) & rate counterparty\n"
        "• `/test` — Simulate a malicious adversarial seller attack & buyer defense\n"
        "• `/sale <SKU> <PRICE> <QTY>` — Put an item on sale live from Telegram\n"
        "• `/disconnect` — Reset demo state to rerun presentation from scratch\n"
        "• `/status` — View your account connection and agent status\n"
        "• `/help` — Display this command reference\n\n"
        "📱 *Mini App:* Access structured offer comparisons, cryptographic Passport verification, "
        f"and deal sign-offs directly inside Telegram or at `{base_url}/miniapp`."
    )

    markup = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "📱 Open Mini App",
                    web_app=WebAppInfo(url=f"{base_url}/miniapp"),
                )
            ]
        ]
    )

    await update.effective_message.reply_text(text, reply_markup=markup, parse_mode="Markdown")
