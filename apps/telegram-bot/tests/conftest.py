import pytest

from bot.config import BotSettings


@pytest.fixture(autouse=True)
def isolate_settings_file(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unit tests must never consume real developer credentials from .env."""
    monkeypatch.setitem(BotSettings.model_config, "env_file", None)
