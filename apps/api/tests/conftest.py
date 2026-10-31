import sqlite3
from collections.abc import Iterator

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import ConnectionPoolEntry, StaticPool

from app.core.config import Settings
from app.db.session import Base, get_session
from app.main import create_app


@pytest.fixture(autouse=True)  # type: ignore[untyped-decorator, unused-ignore]
def isolate_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for field in Settings.model_fields:
        monkeypatch.delenv(field.upper(), raising=False)


@pytest.fixture  # type: ignore[untyped-decorator, unused-ignore]
def database_engine() -> Iterator[Engine]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(
        dbapi_connection: sqlite3.Connection, _connection_record: ConnectionPoolEntry
    ) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture  # type: ignore[untyped-decorator, unused-ignore]
def db(database_engine: Engine) -> Iterator[Session]:
    with Session(database_engine) as session:
        yield session


@pytest.fixture  # type: ignore[untyped-decorator, unused-ignore]
def application(database_engine: Engine) -> FastAPI:
    application = create_app(
        Settings(
            app_env="test",
            demo_account_password=SecretStr("synthetic-demo-account-password-for-tests"),
            agent_key_encryption_secret=SecretStr(
                "synthetic-agent-key-encryption-test-only-secret"
            ),
        )
    )

    def sqlite_session() -> Iterator[Session]:
        with Session(database_engine) as session:
            yield session

    application.dependency_overrides[get_session] = sqlite_session
    return application


@pytest.fixture  # type: ignore[untyped-decorator, unused-ignore]
def client(application: FastAPI) -> Iterator[TestClient]:
    with TestClient(application) as client:
        yield client
