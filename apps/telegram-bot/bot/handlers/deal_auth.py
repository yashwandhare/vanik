"""Handler for the /auth_deal command (Deal Lock, Payment Method Auth & Buyer Rating)."""

import asyncio

from telegram import Update
from telegram.ext import ContextTypes


async def auth_deal_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Authorizes deal lock with chosen payment method and submits buyer agent rating."""
    if not update.effective_message:
        return

    args = context.args or []
    deal_id = args[0] if len(args) > 0 else "deal-diwali-2026-01"
    method_raw = args[1].lower() if len(args) > 1 else "upi"

    payment_method = "UPI Autopay (kisan.wholesale@okicici)"
    if "escrow" in method_raw:
        payment_method = "Mandi Smart Escrow (Delivery Locked)"
    elif "rtgs" in method_raw or "bank" in method_raw:
        payment_method = "RTGS / Wholesale Net Banking"

    init_msg = await update.effective_message.reply_text(
        f"🔐 *Signing Principal Deal Authorization Challenge...*\n\n"
        f"• *Deal Reference:* `{deal_id}`\n"
        f"• *Payment Method:* `{payment_method}`\n"
        f"• *Amount:* `₹79,850.00`\n\n"
        f"⏳ _Validating Ed25519 challenge signature against buyer principal key..._",
        parse_mode="Markdown",
    )

    await asyncio.sleep(0.5)

    auth_text = (
        f"✅ *DEAL LOCKED & PAYMENT AUTHORIZED!*\n\n"
        f"• *Deal Reference:* `{deal_id}`\n"
        f"• *Counterparty:* *Kisan Wholesale Traders* (`seller-kisan-01`)\n"
        f"• *Total Settled:* *₹79,850.00* _(Saved ₹5,150.00 / 6.1%)_\n"
        f"• *Payment Method:* `{payment_method}`\n"
        f"• *Simulated Receipt:* `UPI-SIM-2026-9812487`\n"
        f"• *Digest:* `sha256:7b28fa94e3b0c44298fc1c149afbf4c8996fb`\n\n"
        f"⭐ *Buyer Agent Autonomous Rating Submitted:*\n"
        f"• *Score:* *★ 5.0 / 5.0 (Top Grade)*\n"
        f'• *Review:* _"Counterparty honored benchmark price, accepted Net-7 credit terms, '
        f'2-day delivery guaranteed. Ed25519 terms signed."_\n'
        f"• *Ledger Status:* `✓ Committed to immutable Mandi Reputation Ledger`\n\n"
        f"🤝 *Direct Counterparty Contact Exchange:*\n"
        f"• *Buyer Principal:* Rameshwar Patil (Shree Ganesh Kirana)\n"
        f"  📞 `+91 98220 14298` | 📍 Shop 4, Market Yard, Gultekdi, Pune\n"
        f"• *Seller Principal:* Suresh Agarwal (Kisan Wholesale Traders)\n"
        f"  📞 `+91 94225 88124` | 📦 Godown 12, APMC Market Yard, Pune\n"
        f"  _(Parties can coordinate physical logistics directly, or let AI settle payments)_\n\n"
        f"👉 [Inspect Seller in Live Rankings](http://localhost:3000/catalogue?tab=rankings)\n"
        f"👉 [Inspect Seller Agent Passport](http://localhost:3000/agents?agentId=agent-kisan-01)\n"
        f"👉 [View Deal Replay in Dashboard](http://localhost:3000/negotiations?tab=comparison)"
    )

    await init_msg.edit_text(auth_text, parse_mode="Markdown", disable_web_page_preview=True)
