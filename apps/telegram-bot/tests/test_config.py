"""Unit tests for bot configuration."""

from bot.config import BotSettings


def test_default_config() -> None:
    settings = BotSettings()
    assert settings.api_base_url.startswith("http")
    assert settings.telegram_link_ttl_minutes == 10
    assert not settings.telegram_bot_enabled or settings.telegram_bot_enabled is True
