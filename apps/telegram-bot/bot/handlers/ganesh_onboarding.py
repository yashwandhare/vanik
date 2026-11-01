"""Handlers for pre-seeded live onboarding: /ganesh_kirana and /ganesh_agent."""

import asyncio

from telegram import Update
from telegram.ext import ContextTypes


async def ganesh_kirana_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Pre-seeded principal onboarding: registers Shree Ganesh Kirana Store."""
    if not update.effective_message:
        return

    init_msg = await update.effective_message.reply_text(
        "📝 *Transmitting Business Principal Credentials to VANIK Network...*\n\n"
        "• *Principal Name:* `Rameshwar Patil`\n"
        "• *Trade Entity:* `Shree Ganesh Kirana Store`\n"
        "• *Location:* `Market Yard, Gultekdi, Pune, MH 411037`\n"
        "• *GSTIN:* `27AABCS1429B1Z8`\n\n"
        "⏳ _Registering business entity on immutable principal ledger..._",
        parse_mode="Markdown",
    )

    await asyncio.sleep(0.6)

    success_text = (
        "✅ *Business Principal Successfully Verified on VANIK!*\n\n"
        "🏪 *Principal Profile:*\n"
        "• *Trade Name:* *Shree Ganesh Kirana Store*\n"
        "• *Owner / Authorized Signatory:* *Rameshwar Patil*\n"
        "• *Location:* Market Yard, Gultekdi, Pune, Maharashtra 411037\n"
        "• *Category:* Retail Kirana & Festive Provisions\n"
        "• *Verified GSTIN:* `27AABCS1429B1Z8` (Synthetic Mandi Verified)\n"
        "• *Annual Turnover:* `₹45,00,000.00` | *Mandi Credit Rating:* `Grade A`\n"
        "• *Principal ID:* `20000000-0000-4000-8000-000000000001`\n\n"
        "───────────────────────────────\n"
        "🤖 *Step 2 of 2: Deploy Your Autonomous Trading Agent*\n\n"
        "Now, let's configure your AI agent on the marketplace:\n"
        "1️⃣ What is the agent designation & purpose?\n"
        "2️⃣ What commodity basket & budget ceiling should it manage?\n"
        "3️⃣ What negotiation strategy should it deploy?\n\n"
        "💡 *Live Demo Shortcut:* Send `/ganesh_agent` to immediately spawn your "
        "*Diwali Bulk Procurement Agent* with pre-configured mandate & Ed25519 keys!"
    )

    await init_msg.edit_text(success_text, parse_mode="Markdown", disable_web_page_preview=True)


async def ganesh_agent_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Pre-seeded agent mandate creation: spawns Diwali Kirana Buyer Agent."""
    if not update.effective_message:
        return

    agent_id = "30000000-0000-4000-8000-000000000001"
    key_fingerprint = "sha256:21fe31dfa154a261626bf854046fd2271b7bed4b6abe45aa58877ef47f9721b9"

    msg = await update.effective_message.reply_text(
        "⚙️ *Compiling Autonomous Buyer Agent Mandate Specification...*\n\n"
        "• *Designation:* `Diwali Kirana Buyer Agent`\n"
        "• *Principal:* `Shree Ganesh Kirana Store (Pune)`\n"
        "• *Objective:* Restock 40 Diwali festival SKUs under budget\n"
        "• *Reservation Budget:* `₹85,000.00` _(Strictly masked from sellers)_\n"
        "• *Strategy:* `Volume Clearance Discount Maximizer`\n\n"
        "⏳ _Commencing cryptographic Ed25519 key generation & passport minting..._",
        parse_mode="Markdown",
    )

    await asyncio.sleep(0.5)

    progress_text = (
        "🛡️ *VANIK Cryptographic Agent Passport Minting*\n\n"
        "• *Agent:* `Diwali Kirana Buyer Agent`\n"
        "✓ [1/4] 🏛️ *Principal Identity Bound:*\n"
        "      • *Entity:* `Shree Ganesh Kirana Store`\n"
        "      • *Owner:* `Rameshwar Patil (Pune)`\n"
        "✓ [2/4] 🔑 *Generated Ed25519 Signing Keypair:*\n"
        f"      `{key_fingerprint}`\n"
        f"✓ [3/4] 📜 *Minted Persistent Agent Passport:*\n"
        f"      `ID: {agent_id}`\n"
        "✓ [4/4] 🌐 *Registered on VANIK Live Marketplace*\n"
        "      • *Scopes:* `request_quote`, `evaluate_offers`, `counter_offer`\n"
        "      • *Allowed Tools:* `marketplace_search`, `benchmark_compare`\n"
        "      • *Budget Ceiling:* `INR ₹85,000.00`\n\n"
        "🎉 *Buyer Agent Live & Visible on Dashboard & Mini App!*\n\n"
        f"👉 [Inspect Passport in Dashboard](http://localhost:3000/agents?agentId={agent_id})\n"
        f"👉 [Open in Mini App](http://localhost:3000/miniapp?view=passport&agentId={agent_id})\n\n"
        "🚀 *Next Step:* Send `/task` to dispatch parallel negotiations across wholesale sellers!"
    )

    await msg.edit_text(progress_text, parse_mode="Markdown", disable_web_page_preview=True)
