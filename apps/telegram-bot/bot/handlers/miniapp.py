"""Handler for the /miniapp command."""

import os
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import ContextTypes


def resolve_base_url(context: ContextTypes.DEFAULT_TYPE | None = None) -> str:
    """Resolves public HTTPS base URL for Telegram Mini App."""
    tunnel_file = Path(os.environ.get("VANIK_ROOT", "/home/kazuto/dev/VANIK")) / ".tunnel_url"
    if tunnel_file.exists():
        try:
            url = tunnel_file.read_text().strip()
            if url.startswith("https://"):
                return url.rstrip("/")
        except Exception:
            pass

    if context and hasattr(context, "bot_data"):
        settings = context.bot_data.get("settings")
        if settings and getattr(settings, "public_app_url", None):
            url = str(settings.public_app_url).rstrip("/")
            if (
                url.startswith("https://")
                and "example.test" not in url
                and "vanik.invalid" not in url
            ):
                return url

    return "https://doubt-insider-menus-qualification.trycloudflare.com"


async def miniapp_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Provides direct Telegram Mini App launch buttons and deep links."""
    if not update.effective_message:
        return

    base_url = resolve_base_url(context)
    miniapp_url = f"{base_url}/miniapp"
    agent_id = "7a1bd7b3-308a-5f49-ba8a-0dd1ec451c88"

    keyboard_buttons = [
        [
            InlineKeyboardButton(
                "📱 Open Mini App (Interactive UI)",
                web_app=WebAppInfo(url=miniapp_url),
            )
        ],
        [
            InlineKeyboardButton("🌐 Open in Web Browser", url=miniapp_url),
        ],
        [
            InlineKeyboardButton(
                "🛡️ View Agent Passport",
                url=f"{base_url}/agents?agentId={agent_id}",
            ),
            InlineKeyboardButton(
                "⚡ Live Negotiations",
                url=f"{base_url}/negotiations?tab=timeline&autoSim=true",
            ),
        ],
        [
            InlineKeyboardButton(
                "🤝 A2A Protocol Inspector",
                url=f"{base_url}/negotiations?tab=a2a",
            ),
            InlineKeyboardButton(
                "💳 Settle Deal",
                url=f"{base_url}/miniapp?view=approval",
            ),
        ],
    ]

    reply_markup = InlineKeyboardMarkup(keyboard_buttons)

    text = (
        "📱 *VANIK Interactive Telegram Mini App*\n\n"
        "Experience the full autonomous B2B mandi interface directly inside Telegram:\n\n"
        "• 📋 *Procurement Mandate:* Configure 40-SKU basket & budget bounds\n"
        "• 🛡️ *Agent Passport:* Inspect live Ed25519 signing key & reputation\n"
        "• ⚡ *Parallel Rounds:* Watch multi-seller bargaining in real time\n"
        "• 📊 *Comparison Matrix:* Review side-by-side pricing, credit & delivery\n"
        "• 🤝 *A2A Protocol:* View signed RFC-8785 JSON envelopes & state machine\n"
        "• 💳 *Cryptographic Settlement:* Authorize winning deal with UPI / Escrow\n\n"
        "👇 *Tap a button below to launch the view inside Telegram:*"
    )

    await update.effective_message.reply_text(
        text,
        reply_markup=reply_markup,
        parse_mode="Markdown",
        disable_web_page_preview=True,
    )
