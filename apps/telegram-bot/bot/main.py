"""Main entrypoint for the VANIK Telegram Bot worker."""

import logging
import sys
from typing import Any

from telegram.ext import Application, CommandHandler

from bot.config import BotSettings
from bot.handlers.help import help_handler
from bot.handlers.link import link_handler
from bot.handlers.start import start_handler
from bot.handlers.status import status_handler

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("vanik.bot")


def build_application(
    settings: BotSettings | None = None,
) -> Application[Any, Any, Any, Any, Any, Any]:
    """Configures and builds the Telegram Application with all handlers registered."""
    settings = settings or BotSettings()
    token = settings.telegram_bot_token.get_secret_value() or "DUMMY_TOKEN_FOR_TESTS:123456789"

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("link", link_handler))
    app.add_handler(CommandHandler("status", status_handler))
    app.add_handler(CommandHandler("help", help_handler))

    return app


def main() -> None:
    settings = BotSettings()

    if not settings.telegram_bot_enabled:
        logger.warning(
            "Telegram bot is disabled (TELEGRAM_BOT_ENABLED=false). "
            "Set TELEGRAM_BOT_ENABLED=true in .env to run live."
        )
        sys.exit(0)

    token = settings.telegram_bot_token.get_secret_value()
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN is not set in environment or .env. Exiting.")
        sys.exit(1)

    app = build_application(settings)
    logger.info("Starting VANIK Telegram Bot worker (polling mode)...")
    app.run_polling()


if __name__ == "__main__":
    main()
