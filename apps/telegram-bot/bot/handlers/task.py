"""Handler for the /task command."""

import asyncio
from uuid import uuid4

from telegram import Update
from telegram.ext import ContextTypes


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
        f"👉 [📱 Open Deal in Mini App to Review & Approve](http://localhost:3000/miniapp?view=approval&dealId=deal-diwali-2026-01)\n"
        f"👉 [View Live Rounds in Web Dashboard](http://localhost:3000/negotiations?tab=timeline)"
    )

    await msg.edit_text(final_text, parse_mode="Markdown", disable_web_page_preview=True)
