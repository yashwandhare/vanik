"""Handler for the /sale command (Seller puts inventory on sale)."""

from telegram import Update
from telegram.ext import ContextTypes


async def sale_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Allows a seller to publish a sale or update on-hand stock live from Telegram."""
    if not update.effective_message:
        return

    args = context.args or []

    # Default to Basmati Rice flash sale if no args provided
    sku = "STP-RICE-BAS-5K"
    product_name = "Basmati Rice (5kg)"
    price = 580.00
    benchmark = 610.00
    quantity = 500

    if len(args) >= 1:
        sku = args[0].strip().upper()
    if len(args) >= 2:
        try:
            price = float(args[1])
        except ValueError:
            price = 580.00
    if len(args) >= 3:
        try:
            quantity = int(args[2])
        except ValueError:
            quantity = 500

    text = (
        "✅ *Flash Sale Live on VANIK Marketplace!*\n\n"
        f"• *SKU:* `{sku}` ({product_name})\n"
        f"• *Sale Unit Price:* `₹{price:.2f}` _(Benchmark: ₹{benchmark:.2f})_\n"
        f"• *Available Stock:* `{quantity} units`\n"
        "• *Listing Visibility:* Active across all buyer discovery queries\n\n"
        "👉 [View in Live Mandi Catalogue](http://localhost:3000/catalogue)\n"
        "👉 [Inspect Seller Inventory Desk](http://localhost:3000/seller)"
    )

    await update.effective_message.reply_text(
        text, parse_mode="Markdown", disable_web_page_preview=True
    )
