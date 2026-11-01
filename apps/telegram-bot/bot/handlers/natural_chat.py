"""Natural conversation handler for VANIK Telegram Bot (strictly bounded to VANIK)."""

from telegram import Update
from telegram.ext import ContextTypes


async def natural_chat_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Answers natural language questions about VANIK, its features, and demo flows."""
    if not update.effective_message or not update.effective_message.text:
        return

    query = update.effective_message.text.strip().lower()

    if any(k in query for k in ["hi", "hello", "namaste", "hey", "vanik", "what is"]):
        response = (
            "🌾 *Welcome to VANIK B2B Autonomous Mandi Network!*\n\n"
            "VANIK is an autonomous agentic marketplace connecting retail kirana stores "
            "with wholesale suppliers. AI agents negotiate prices, terms, and fulfillment "
            "in parallel using verified Mandi benchmark prices and Ed25519 Passports.\n\n"
            "💡 *Ready for the live demo?*\n"
            "• Send `/ganesh_kirana` to onboard Shree Ganesh Kirana Store\n"
            "• Send `/ganesh_agent` to spawn your autonomous buyer agent\n"
            "• Send `/task` to run parallel negotiations across sellers\n"
            "• Send `/test` to simulate red-team adversarial seller defense\n"
            "• Send `/auth_deal` to lock payment and rate counterparty"
        )
    elif any(k in query for k in ["passport", "agent", "ed25519", "key"]):
        response = (
            "🛡️ *Cryptographic Agent Passports in VANIK*\n\n"
            "Every autonomous trading agent is minted with an immutable Ed25519 keypair "
            "and signed capability bounds:\n"
            "• *Delegation Scopes:* `request_quote`, `counter_offer`, `place_order`\n"
            "• *Authority Bounds:* Spend ceiling (e.g. ₹85,000 max)\n"
            "• *Reputation Score:* Dynamic star rating based on settled trade memory\n\n"
            "👉 Try sending `/ganesh_agent` to mint your live agent passport, or inspect "
            "[Agent Passports in Dashboard](http://localhost:3000/agents)!"
        )
    elif any(k in query for k in ["negotiat", "bargain", "round", "task", "deal", "best"]):
        response = (
            "⚡ *Autonomous Parallel Negotiation Engine*\n\n"
            "When you launch a procurement mandate, your buyer agent:\n"
            "1. Broadcasts structured RFQs to eligible wholesale sellers simultaneously\n"
            "2. Strictly *masks* your maximum reservation budget from counterparties\n"
            "3. Analyzes competing quotes against 40-SKU trusted Mandi benchmark prices\n"
            "4. Issues multi-round automated counter-offers leveraging basket volume\n"
            "5. Recommends the optimal deal (Price 40%, Reliability 25%, Delivery 20%)\n\n"
            "👉 Send `/task` to watch parallel rounds converge, or view the "
            "[Live Negotiation Workspace](http://localhost:3000/negotiations?tab=timeline)!"
        )
    elif any(k in query for k in ["malicious", "attack", "injection", "fake", "security", "test"]):
        response = (
            "🚨 *Adversarial Red-Team Seller Defense*\n\n"
            "VANIK defends buyer agents against adversarial marketplace participants:\n"
            "1. *Fake Discount Protection:* Deterministic validator compares line prices "
            "against trusted Mandi benchmark ledger, catching inflated reference prices.\n"
            "2. *Prompt Injection Neutralization:* Free-text seller notes are strictly "
            "quarantined; buyer agents never execute directives parsed from untrusted text.\n\n"
            "👉 Send `/test` to trigger a simulated malicious seller attack and observe "
            "the buyer agent turn down and quarantine the adversary!"
        )
    elif any(k in query for k in ["pay", "settle", "escrow", "upi", "rtgs", "contact", "phone"]):
        response = (
            "💳 *Human-Authorized Settlement & Contact Exchange*\n\n"
            "When a winning deal is finalized:\n"
            "• *Payment Methods:* Pick UPI Instant (`kisan.wholesale@okicici`), "
            "Mandi Smart Escrow (locked until delivery), or RTGS Net Banking.\n"
            "• *Principal Challenge:* Deal terms bind to SHA256 basket hash and require "
            "one-touch authorization (`/auth_deal` or in the Mini App).\n"
            "• *Contact Exchange:* Verified business contacts (Rameshwar Patil & Suresh Agarwal) "
            "are revealed for physical goods dispatch.\n"
            "• *Buyer Rating:* Buyer agent automatically rates the seller on the Mandi ledger!"
        )
    elif any(k in query for k in ["ganesh", "kirana", "rameshwar", "store"]):
        response = (
            "🏪 *Shree Ganesh Kirana Store (Demo Principal)*\n\n"
            "• *Owner:* Rameshwar Patil\n"
            "• *Location:* Market Yard, Gultekdi, Pune, Maharashtra 411037\n"
            "• *GSTIN:* `27AABCS1429B1Z8` (Synthetic Mandi Verified)\n"
            "• *Category:* Retail Kirana & Festive Provisions\n\n"
            "👉 Send `/ganesh_kirana` to onboard this principal instantly, or `/ganesh_agent` "
            "to formulate its Diwali procurement agent!"
        )
    elif any(k in query for k in ["seller", "ranking", "leaderboard", "rating", "catalogue"]):
        response = (
            "🏆 *Mandi Wholesale Sellers & Rankings*\n\n"
            "All sellers are ranked objectively on the immutable reputation ledger:\n"
            "• 🥇 *Kisan Wholesale Traders* (Clearance) — ★ 4.9 (142 deals), 99.4% on-time\n"
            "• 🥈 *Utsav Distributors* (Volume) — ★ 4.8 (98 deals), 98.6% on-time\n"
            "• 🥉 *Mahalaxmi Agro* (Margin) — ★ 4.6 (76 deals), 96.2% on-time\n\n"
            "👉 Inspect live rankings at [Catalogue & Leaderboard]"
            "(http://localhost:3000/catalogue?tab=rankings)!"
        )
    else:
        response = (
            "🌾 *VANIK B2B Mandi Assistant*\n\n"
            "I specialize exclusively in autonomous wholesale procurement, agent passports, "
            "Mandi negotiations, and trade settlements on VANIK.\n\n"
            "💡 *Try these live demo commands:*\n"
            "• `/ganesh_kirana` — Onboard Shree Ganesh Kirana Store\n"
            "• `/ganesh_agent` — Spawn Diwali procurement agent\n"
            "• `/task` — Launch parallel negotiations\n"
            "• `/auth_deal` — Authorize payment and rate seller\n"
            "• `/test` — Simulate malicious seller attack\n"
            "• `/help` — Command directory"
        )

    await update.effective_message.reply_text(
        response, parse_mode="Markdown", disable_web_page_preview=True
    )
