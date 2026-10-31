from pathlib import Path
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

REPOSITORY_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_secret_key: SecretStr = SecretStr("replace-me")
    agent_key_encryption_secret: SecretStr = SecretStr("replace-me")
    database_url: SecretStr = SecretStr("postgresql+psycopg://vanik:vanik@localhost:5432/vanik")
    database_connect_timeout: int = Field(default=5, ge=1, le=30)
    cors_allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    mock_upi_enabled: bool = True
    demo_verification_enabled: bool = True

    @model_validator(mode="after")
    def validate_boundaries(self) -> Self:
        if make_url(self.database_url.get_secret_value()).drivername != "postgresql+psycopg":
            raise ValueError("DATABASE_URL must use the postgresql+psycopg driver")
        if not self.mock_upi_enabled:
            raise ValueError("Only simulated payments are supported; MOCK_UPI_ENABLED must be true")
        for origin in self.cors_allowed_origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username
                or parsed.password
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError("CORS_ALLOWED_ORIGINS must contain exact HTTP(S) origins")
            if self.app_env == "production" and parsed.scheme != "https":
                raise ValueError("Production CORS origins must use HTTPS")
        if self.app_env == "production":
            for secret in (self.app_secret_key, self.agent_key_encryption_secret):
                if len(secret.get_secret_value()) < 32:
                    raise ValueError("Production secrets must contain at least 32 characters")
            if self.app_secret_key == self.agent_key_encryption_secret:
                raise ValueError("Application and signing-key encryption secrets must be different")
        return self
