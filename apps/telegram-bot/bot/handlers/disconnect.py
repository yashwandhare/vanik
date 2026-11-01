"""Handler for the /disconnect and /reset commands."""

import logging

from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger("vanik.bot.disconnect")


async def disconnect_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Resets user session state allowing clean demo rerun from start."""
    if not update.effective_message:
        return

    # Clear any user data session stored in memory
    if context.user_data is not None:
        context.user_data.clear()

    telegram_user_id = str(update.effective_user.id) if update.effective_user else "unknown"
    logger.info("Demo session reset for Telegram user %s", telegram_user_id)

    reset_message = (
        "🔄 *VANIK Session Reset Complete!*\n\n"
        "Your temporary negotiation context, link cache, and demo state have been cleared.\n"
        "You can now run the complete hackathon presentation from the very beginning.\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🎬 *Judge Demo Presentation Sequence:*\n\n"
        "1️⃣ Send `/ganesh_kirana`\n"
        "   └─ _Onboard Shree Ganesh Kirana Store persona_\n\n"
        "2️⃣ Send `/ganesh_agent`\n"
        "   └─ _Mint Ed25519 Cryptographic Buyer Passport_\n\n"
        "3️⃣ Send `/task`\n"
        "   └─ _Dispatch 40-SKU Diwali restock mandate across sellers_\n\n"
        "4️⃣ Send `/miniapp`\n"
        "   └─ _Open Telegram Mini App for visual comparison & settlement_\n\n"
        "5️⃣ Send `/auth_deal`\n"
        "   └─ _Cryptographically authorize winning clearance deal_\n\n"
        "6️⃣ Send `/test`\n"
        "   └─ _Simulate & neutralize red-team seller injection attack_\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "💬 _Tip: You can also ask any questions naturally in Hindi, Hinglish, or English!_"
    )

    await update.effective_message.reply_text(
        reset_message,
        parse_mode="Markdown",
        disable_web_page_preview=True,
    )
