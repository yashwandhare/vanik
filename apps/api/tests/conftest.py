import sqlite3
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import ConnectionPoolEntry, StaticPool

from app.core.config import Settings
from app.db.session import Base, get_session
from app.main import create_app


@pytest.fixture(autouse=True)
def isolate_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for field in Settings.model_fields:
        monkeypatch.delenv(field.upper(), raising=False)


@pytest.fixture
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


@pytest.fixture
def db(database_engine: Engine) -> Iterator[Session]:
    with Session(database_engine) as session:
        yield session


@pytest.fixture
def application(database_engine: Engine) -> FastAPI:
    application = create_app(Settings(app_env="test"))

    def sqlite_session() -> Iterator[Session]:
        with Session(database_engine) as session:
            yield session

    application.dependency_overrides[get_session] = sqlite_session
    return application


@pytest.fixture
def client(application: FastAPI) -> Iterator[TestClient]:
    with TestClient(application) as client:
        yield client
