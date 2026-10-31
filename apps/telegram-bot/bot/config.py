"""Telegram Bot configuration and settings."""

from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class BotSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    telegram_bot_token: SecretStr = SecretStr("")
    telegram_bot_enabled: bool = False
    telegram_webhook_secret: SecretStr = SecretStr("")
    api_base_url: str = Field(default="http://localhost:8000")
    telegram_link_ttl_minutes: int = Field(default=10, ge=1, le=60)
