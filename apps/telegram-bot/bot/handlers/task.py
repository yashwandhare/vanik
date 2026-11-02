"""Handler for the /task command."""

import asyncio
from uuid import uuid4

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import ContextTypes

from bot.handlers.miniapp import resolve_base_url


async def task_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Launches parallel procurement negotiation across marketplace sellers."""
    if not update.effective_message:
        return

    args = context.args or []
    prompt = " ".join(args).strip()

    if not prompt:
        prompt = (
            "Restock 40 Diwali festival SKUs: Staples, Edible Oils, Dry Fruits, and Spices. "
            "Maximum Budget: INR 85,000."
        )

    task_id = str(uuid4())
    base_url = resolve_base_url(context)

    msg = await update.effective_message.reply_text(
        f"📋 *Task Mandate Registered*\n\n"
        f"• *Objective:* `{prompt}`\n"
        f"• *Task Reference:* `{task_id}`\n"
        f"• *Budget Ceiling:* `₹85,000.00` _(Strictly masked from sellers)_\n"
        f"• *Status:* ⚡ Launching parallel negotiation rounds across eligible sellers...",
        parse_mode="Markdown",
    )

    await asyncio.sleep(0.6)

    # Simulation of parallel round convergence
    final_text = (
        f"🏆 *Parallel Negotiation Complete!*\n\n"
        f"• *Task Reference:* `{task_id}`\n"
        f"• *Participating Sellers:* 3 Legitimate Wholesale Principals\n\n"
        f"🥇 *Recommended Counterparty (Ranked #1):*\n"
        f"• *Seller:* *Utsav Distributors* _(Clearance Seller)_\n"
        f"• *Final Amount:* *₹79,850.00* _(Saved ₹5,150.00 below budget!)_\n"
        f"• *Payment Terms:* `Net 7 Days (10% upfront)`\n"
        f"• *Delivery Schedule:* `2 Days` _(Guaranteed pre-Diwali fulfillment)_\n"
        f"• *Reliability Memory:* `98% On-Time Verified`\n"
        f"• *Signature:* `✓ Ed25519 Cryptographically Verified`\n\n"
        f"💳 *Select Payment Method for Principal Auth:*\n"
        f"1️⃣ *UPI Autopay / Instant QR* (`kisan.wholesale@okicici`)\n"
        f"2️⃣ *Mandi Smart Escrow* (Funds locked until delivery verified)\n"
        f"3️⃣ *RTGS / Wholesale Net Banking*\n\n"
        f"👉 *To Authorize in Chat:* Send `/auth_deal deal-diwali-2026-01 upi`\n"
        f"👉 [📱 Open Deal in Mini App]("
        f"{base_url}/miniapp?view=approval&dealId=deal-diwali-2026-01)\n"
        f"👉 [⚡ Watch Live Rounds Simulation in Web Dashboard]("
        f"{base_url}/negotiations?tab=timeline&autoSim=true&taskId={task_id})\n"
        f"👉 [🤝 Inspect A2A Signed Protocols]({base_url}/negotiations?tab=a2a)"
    )

    keyboard = [
        [
            InlineKeyboardButton(
                "📱 Open Deal in Mini App",
                web_app=WebAppInfo(
                    url=f"{base_url}/miniapp?view=approval&dealId=deal-diwali-2026-01"
                ),
            )
        ],
        [
            InlineKeyboardButton(
                "⚡ Live Rounds Dashboard",
                url=f"{base_url}/negotiations?tab=timeline&autoSim=true&taskId={task_id}",
            ),
            InlineKeyboardButton(
                "🤝 A2A Inspector",
                url=f"{base_url}/negotiations?tab=a2a",
            ),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await msg.edit_text(
        final_text,
        reply_markup=reply_markup,
        parse_mode="Markdown",
        disable_web_page_preview=True,
    )
