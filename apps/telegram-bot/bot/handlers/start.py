"""Handler for the /start command."""

from telegram import Update
from telegram.ext import ContextTypes


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Welcomes the user, handles deep links for tasks/deals/passports/status,
    or explains account linking.
    """
    if not update.effective_message:
        return

    # Check for deep link argument in /start <payload>
    if context.args and len(context.args) > 0:
        arg = context.args[0].strip()

        if arg.startswith("deal_"):
            deal_id = arg.removeprefix("deal_")
            text = (
                "🔐 *VANIK Deal Approval Challenge*\n\n"
                f"• *Deal Reference:* `{deal_id}`\n"
                "• *Counterparty:* *Kisan Wholesale Traders* (`seller-kisan-01`)\n"
                "• *Total Amount:* *₹79,850.00* (Saved ₹5,150.00)\n"
                "• *Action Required:* Principal cryptographic payment authorization\n\n"
                "💳 *Payment Methods Available:*\n"
                "1️⃣ *UPI Autopay Instant* (`kisan.wholesale@okicici`)\n"
                "2️⃣ *Mandi Smart Escrow* (Delivery Locked)\n"
                "3️⃣ *RTGS Wholesale Credit*\n\n"
                f"👉 Send `/auth_deal {deal_id} upi` to sign payment and rate seller\n"
                f"👉 [Open Deal in Mini App](http://localhost:3000/miniapp?view=approval&dealId={deal_id})"
            )
            await update.effective_message.reply_text(
                text, parse_mode="Markdown", disable_web_page_preview=True
            )
            return

        if arg.startswith("task_"):
            task_id = arg.removeprefix("task_")
            text = (
                "📋 *VANIK Task Mandate Orchestration*\n\n"
                f"• *Task Reference:* `{task_id}`\n"
                "• *Status:* Active parallel negotiation\n\n"
                "View commodity mandate and real-time seller rounds in the Mini App:\n"
                f"👉 [Open Task in Mini App](http://localhost:3000/miniapp?view=mandate&taskId={task_id})"
            )
            await update.effective_message.reply_text(
                text, parse_mode="Markdown", disable_web_page_preview=True
            )
            return

        if arg.startswith("timeline_") or arg.startswith("rounds_"):
            prefix = "timeline_" if arg.startswith("timeline_") else "rounds_"
            task_id = arg.removeprefix(prefix)
            text = (
                "⚡ *VANIK Parallel Negotiation Rounds*\n\n"
                f"• *Task Reference:* `{task_id}`\n\n"
                "Track parallel seller responses and cryptographic Ed25519 signatures:\n"
                f"👉 [Track Rounds in Mini App](http://localhost:3000/miniapp?view=timeline&taskId={task_id})"
            )
            await update.effective_message.reply_text(
                text, parse_mode="Markdown", disable_web_page_preview=True
            )
            return

        if arg.startswith("passport_"):
            agent_id = arg.removeprefix("passport_")
            text = (
                "🛡️ *VANIK Agent Passport Verification*\n\n"
                f"• *Agent Reference:* `{agent_id}`\n\n"
                "Inspect cryptographic keys, capabilities, and authority bounds:\n"
                f"👉 [Inspect Passport in Mini App](http://localhost:3000/miniapp?view=passport&agentId={agent_id})"
            )
            await update.effective_message.reply_text(
                text, parse_mode="Markdown", disable_web_page_preview=True
            )
            return

        if arg == "status":
            text = (
                "ℹ️ *VANIK Notification & Bot Status*\n\n"
                "• *Worker:* Active & Monitoring\n"
                "• *Portal:* `http://localhost:3000`\n"
                "• *Mini App:* `http://localhost:3000/miniapp`\n\n"
                "Use `/status` for user ID and linking status."
            )
            await update.effective_message.reply_text(text, parse_mode="Markdown")
            return

    # Standard onboarding welcome message with interactive questions
    text = (
        "👋 *Welcome to VANIK B2B Agentic Marketplace Bot*\n\n"
        "VANIK connects retail kirana businesses with verified wholesale mandi distributors "
        "using autonomous negotiating agents and cryptographic Ed25519 passports.\n\n"
        "🌾 *Step 1: Tell Us About Your Business:*\n"
        "• What is your kirana store or business trade name?\n"
        "• Who is the primary owner or authorized signatory?\n"
        "• In which city or mandi yard are you located?\n"
        "• What are your primary restock categories (Staples, Oils, Spices)?\n\n"
        "💡 *Live Presentation Shortcut:*\n"
        "Send `/ganesh_kirana` to instantly feed the pre-seeded character for "
        "*Shree Ganesh Kirana Store (Market Yard, Pune)*!\n\n"
        "🔗 *Account Linking:* If you already have a code, reply with `/link <YOUR_CODE>`.\n"
        "📱 *Mini App:* Access structured deals at `http://localhost:3000/miniapp`.\n\n"
        "💬 *You can also ask me anything about VANIK, agent passports, or mandi trading!*"
    )
    await update.effective_message.reply_text(text, parse_mode="Markdown")
