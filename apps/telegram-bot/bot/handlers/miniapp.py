"""Handler for the /miniapp command."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes


async def miniapp_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Provides direct Telegram Mini App launch buttons and deep links."""
    if not update.effective_message:
        return

    # Base URLs
    miniapp_url = "http://localhost:3000/miniapp"
    agent_id = "7a1bd7b3-308a-5f49-ba8a-0dd1ec451c88"

    # Telegram native WebAppInfo requires HTTPS; prepare inline buttons gracefully
    keyboard_buttons = []
    keyboard_buttons.append([InlineKeyboardButton("🌐 Open VANIK Mini App", url=miniapp_url)])
    keyboard_buttons.append(
        [
            InlineKeyboardButton(
                "🛡️ View Agent Passport", url=f"http://localhost:3000/agents?agentId={agent_id}"
            ),
            InlineKeyboardButton(
                "⚡ Live Negotiations",
                url="http://localhost:3000/negotiations?tab=timeline&autoSim=true",
            ),
        ]
    )
    keyboard_buttons.append(
        [
            InlineKeyboardButton(
                "🤝 A2A Protocol Inspector", url="http://localhost:3000/negotiations?tab=a2a"
            ),
            InlineKeyboardButton(
                "💳 Settle Deal", url="http://localhost:3000/miniapp?view=approval"
            ),
        ]
    )

    reply_markup = InlineKeyboardMarkup(keyboard_buttons)

    text = (
        "📱 *VANIK Interactive Telegram Mini App*\n\n"
        "Experience the full autonomous B2B mandi interface directly inside Telegram:\n\n"
        "• 📋 *Procurement Mandate:* Configure 40-SKU basket & budget bounds\n"
        "• 🛡️ *Agent Passport:* Inspect live Ed25519 signing key & reputation\n"
        "• ⚡ *Parallel Rounds:* Watch multi-seller bargaining in real time\n"
        "• 📊 *Comparison Matrix:* Review side-by-side pricing, credit & delivery\n"
        "• 💳 *Cryptographic Settlement:* Authorize winning deal with UPI / Escrow\n\n"
        "👇 *Tap a button below to launch the view:*"
    )

    await update.effective_message.reply_text(
        text,
        reply_markup=reply_markup,
        parse_mode="Markdown",
        disable_web_page_preview=True,
    )
