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

logger = logging.getLogger("vanik.bot")


class SecretTokenFilter(logging.Filter):
    """Redacts secret bot tokens from all log messages."""

    def __init__(self, token: str = ""):
        super().__init__()
        self.token = token

    def filter(self, record: logging.LogRecord) -> bool:
        if self.token and isinstance(record.msg, str) and self.token in record.msg:
            record.msg = record.msg.replace(self.token, "[REDACTED_BOT_TOKEN]")
        return True


def configure_logging(token: str = "") -> None:
    """Configures application logging and silences transport logs containing URL secrets."""
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO,
    )
    # Silence HTTPX/HTTPCore transport loggers that log request URLs with tokens
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("telegram").setLevel(logging.WARNING)
    logging.getLogger("telegram.ext").setLevel(logging.INFO)

    if token:
        token_filter = SecretTokenFilter(token)
        logging.getLogger().addFilter(token_filter)


def build_application(
    settings: BotSettings | None = None,
) -> Application[Any, Any, Any, Any, Any, Any]:
    """Configures and builds the Telegram Application with all handlers registered."""
    settings = settings or BotSettings()
    token = settings.telegram_bot_token.get_secret_value() or "DUMMY_TOKEN_FOR_TESTS:123456789"

    configure_logging(token)

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
