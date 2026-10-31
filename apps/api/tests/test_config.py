import pytest  # type: ignore[import-not-found, unused-ignore]
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from app.db.session import create_database_engine


def test_development_uses_demo_defaults() -> None:
    settings = Settings()
    assert settings.mock_upi_enabled
    assert settings.demo_verification_enabled
    assert settings.session_duration_hours == 8
    assert "vanik:vanik" not in repr(settings)


def test_production_rejects_placeholder_secrets() -> None:
    with pytest.raises(ValidationError, match="Production secrets"):
        Settings(app_env="production", cors_allowed_origins=[])


def test_production_requires_different_secrets() -> None:
    with pytest.raises(ValidationError, match="must be different"):
        Settings(
            app_env="production",
            app_secret_key=SecretStr("x" * 32),
            agent_key_encryption_secret=SecretStr("x" * 32),
            cors_allowed_origins=[],
        )


def test_production_accepts_distinct_secrets_and_https() -> None:
    settings = Settings(
        app_env="production",
        app_secret_key=SecretStr("x" * 32),
        agent_key_encryption_secret=SecretStr("y" * 32),
        cors_allowed_origins=["https://web.example.com"],
    )
    assert settings.app_env == "production"


@pytest.mark.parametrize(  # type: ignore[untyped-decorator, unused-ignore]
    "origin",
    ["*", "https://user:password@example.com", "https://example.com/path", "file://example.com"],
)
def test_invalid_cors_origins_are_rejected(origin: str) -> None:
    with pytest.raises(ValidationError, match="exact HTTP"):
        Settings(cors_allowed_origins=[origin])


def test_production_rejects_http_origins() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        Settings(app_env="production")


def test_session_duration_is_fixed_to_eight_hours(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SESSION_DURATION_HOURS", "8")
    assert Settings().session_duration_hours == 8
    monkeypatch.setenv("SESSION_DURATION_HOURS", "24")
    with pytest.raises(ValidationError):
        Settings()


def test_real_payments_cannot_be_enabled() -> None:
    with pytest.raises(ValidationError, match="Only simulated payments"):
        Settings(mock_upi_enabled=False)


def test_non_postgres_driver_is_rejected() -> None:
    with pytest.raises(ValidationError, match="postgresql"):
        Settings(database_url=SecretStr("sqlite://"))


def test_engine_is_lazy_and_redacts_query_parameters() -> None:
    engine = create_database_engine(Settings())
    try:
        assert engine.dialect.name == "postgresql"
        assert engine.hide_parameters
    finally:
        engine.dispose()
