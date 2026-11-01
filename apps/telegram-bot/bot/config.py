"""Telegram Bot configuration and settings."""

from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
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
    public_app_url: str = ""
    telegram_worker_interval_seconds: float = Field(default=30.0, ge=1, le=300)

    @field_validator("public_app_url")
    @classmethod
    def validate_public_app_url(cls, value: str) -> str:
        if not value:
            return ""
        parsed = urlsplit(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or any(character.isspace() for character in value)
        ):
            raise ValueError("PUBLIC_APP_URL must be an HTTPS origin without credentials")
        return value.rstrip("/")
