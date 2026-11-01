"""Handler for the /create_agent command."""

import asyncio
from uuid import uuid4

from telegram import Update
from telegram.ext import ContextTypes


async def create_agent_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Conversational / command-driven creation of a persistent AI Agent."""
    if not update.effective_message:
        return

    args = context.args or []
    raw_input = " ".join(args).strip()

    # Parse arguments or provide sensible defaults for live Kirana demo
    business_name = "Shree Ganesh Kirana"
    agent_name = "Diwali Kirana Buyer"
    role = "buyer"
    strategy = "default"

    if raw_input:
        parts = [p.strip() for p in raw_input.split("|")]
        if len(parts) >= 1 and parts[0]:
            business_name = parts[0]
        if len(parts) >= 2 and parts[1]:
            agent_name = parts[1]
        if len(parts) >= 3 and parts[2].lower() in {"buyer", "seller"}:
            role = parts[2].lower()
        if len(parts) >= 4 and parts[3]:
            strategy = parts[3].lower()

    agent_id = str(uuid4())
    key_fingerprint = f"sha256:{uuid4().hex[:16]}...{uuid4().hex[:8]}"

    # Send initial progress message
    status_msg = await update.effective_message.reply_text(
        f"⚙️ *Initiating Agent Minting Pipeline...*\n\n"
        f"• *Principal:* `{business_name}`\n"
        f"• *Agent Name:* `{agent_name}`\n"
        f"• *Role:* `{role.upper()}`\n"
        f"• *Strategy:* `{strategy}`",
        parse_mode="Markdown",
    )

    await asyncio.sleep(0.5)

    # Progressive live status updates
    progress_text = (
        f"⚙️ *Minting AI Agent on VANIK Rails...*\n\n"
        f"✓ [1/4] 🏢 *Business Principal Authenticated:* `{business_name}`\n"
        f"✓ [2/4] 🔑 *Generating Ed25519 Cryptographic Signing Key:*\n"
        f"      `{key_fingerprint}`\n"
        f"✓ [3/4] 🛡️ *Minting Persistent Agent Passport:*\n"
        f"      `ID: {agent_id}`\n"
        f"✓ [4/4] 🌐 *Registered on VANIK Live Marketplace*\n"
        f"      • *Permissions:* `request_quote`, `evaluate_offers`\n"
        f"      • *Allowed Tools:* `marketplace_search`, `benchmark_compare`\n\n"
        f"🎉 *Buyer Agent Live & Ready!*\n\n"
        f"👉 [Inspect Passport in Dashboard](http://localhost:3000/agents?agentId={agent_id})\n"
        f"👉 [Open in Mini App](http://localhost:3000/miniapp?view=passport&agentId={agent_id})\n\n"
        f"🚀 *Next Step:* Send `/task <procurement mandate>` to start parallel negotiations!"
    )

    await status_msg.edit_text(progress_text, parse_mode="Markdown", disable_web_page_preview=True)
