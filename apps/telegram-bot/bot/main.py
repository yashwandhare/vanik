"""Main entrypoint for the VANIK Telegram Bot worker."""

import logging
import sys
from typing import Any

from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from bot.client import BackendClient
from bot.config import BotSettings
from bot.handlers.adversarial_test import adversarial_test_handler
from bot.handlers.create_agent import create_agent_handler
from bot.handlers.deal_auth import auth_deal_handler
from bot.handlers.ganesh_onboarding import ganesh_agent_handler, ganesh_kirana_handler
from bot.handlers.help import help_handler
from bot.handlers.link import link_handler
from bot.handlers.natural_chat import natural_chat_handler
from bot.handlers.sale import sale_handler
from bot.handlers.start import start_handler
from bot.handlers.status import status_handler
from bot.handlers.task import task_handler
from bot.worker import NotificationWorker

logger = logging.getLogger("vanik.bot")


class SecretTokenFilter(logging.Filter):
    """Redacts secret bot tokens from all log messages."""

    def __init__(self, token: str = "", *secrets: str):
        super().__init__()
        self.secrets = tuple(secret for secret in (token, *secrets) if secret)

    def filter(self, record: logging.LogRecord) -> bool:
        if not self.secrets:
            return True
        record.msg = record.getMessage()
        record.args = ()
        if record.exc_info:
            record.exc_text = logging.Formatter().formatException(record.exc_info)
            record.exc_info = None
        for secret in self.secrets:
            record.msg = str(record.msg).replace(secret, "[REDACTED_BOT_TOKEN]")
            if record.exc_text:
                record.exc_text = record.exc_text.replace(secret, "[REDACTED_BOT_TOKEN]")
            if record.stack_info:
                record.stack_info = record.stack_info.replace(secret, "[REDACTED_BOT_TOKEN]")
        return True


def configure_logging(token: str = "", bot_secret: str = "") -> None:
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

    if token or bot_secret:
        token_filter = SecretTokenFilter(token, bot_secret)
        # Handler filters also see records propagated from child/transport loggers.
        for handler in logging.getLogger().handlers:
            handler.addFilter(token_filter)


async def start_worker(application: Application[Any, Any, Any, Any, Any, Any]) -> None:
    worker: NotificationWorker = application.bot_data["worker"]
    worker.start()


async def stop_worker(application: Application[Any, Any, Any, Any, Any, Any]) -> None:
    worker: NotificationWorker = application.bot_data["worker"]
    await worker.stop()


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Do not log updates (PII/link codes) or raw Telegram/HTTP transport exceptions.
    logger.error("Telegram update failed (%s)", type(context.error).__name__)


def build_application(
    settings: BotSettings | None = None,
) -> Application[Any, Any, Any, Any, Any, Any]:
    """Configures and builds the Telegram Application with all handlers registered."""
    settings = settings or BotSettings()
    token = settings.telegram_bot_token.get_secret_value()
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN is required to build the application")

    configure_logging(token, settings.telegram_webhook_secret.get_secret_value())

    app = (
        Application.builder()
        .token(token)
        .post_init(start_worker)
        .post_stop(stop_worker)
        .post_shutdown(stop_worker)
        .build()
    )
    backend = BackendClient(settings)
    app.bot_data["settings"] = settings
    app.bot_data["backend"] = backend
    app.bot_data["worker"] = NotificationWorker(
        backend, app.bot, settings.telegram_worker_interval_seconds
    )

    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("ganesh_kirana", ganesh_kirana_handler))
    app.add_handler(CommandHandler("ganesh_agent", ganesh_agent_handler))
    app.add_handler(CommandHandler("link", link_handler))
    app.add_handler(CommandHandler("status", status_handler))
    app.add_handler(CommandHandler("help", help_handler))
    app.add_handler(CommandHandler("create_agent", create_agent_handler))
    app.add_handler(CommandHandler("task", task_handler))
    app.add_handler(CommandHandler("auth_deal", auth_deal_handler))
    app.add_handler(CommandHandler("test", adversarial_test_handler))
    app.add_handler(CommandHandler("sale", sale_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, natural_chat_handler), group=1)
    app.add_error_handler(error_handler)

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

    if len(settings.telegram_webhook_secret.get_secret_value()) < 32:
        logger.error("TELEGRAM_WEBHOOK_SECRET must contain at least 32 characters. Exiting.")
        sys.exit(1)
    if not settings.public_app_url:
        logger.error("PUBLIC_APP_URL must be configured as the public HTTPS web origin. Exiting.")
        sys.exit(1)

    app = build_application(settings)
    logger.info("Starting VANIK Telegram Bot worker (polling mode)...")
    app.run_polling()


if __name__ == "__main__":
    main()
