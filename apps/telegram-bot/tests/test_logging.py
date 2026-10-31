"""Regression test to ensure bot tokens are never leaked in logs."""

import io
import logging

import pytest

from bot.main import SecretTokenFilter, configure_logging


def test_token_filter_redacts_secret() -> None:
    secret = "SECRET_BOT_TOKEN_12345"
    token_filter = SecretTokenFilter(secret)

    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg=f"Sending request to https://api.telegram.org/bot{secret}/getMe",
        args=(),
        exc_info=None,
    )

    token_filter.filter(record)
    assert secret not in str(record.msg)
    assert "[REDACTED_BOT_TOKEN]" in str(record.msg)


def test_child_logger_arguments_and_traceback_are_redacted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "synthetic-child-logger-token"
    output = io.StringIO()
    handler = logging.StreamHandler(output)
    root = logging.getLogger()
    monkeypatch.setattr(root, "handlers", [handler])
    monkeypatch.setattr(root, "level", logging.INFO)
    configure_logging(secret)
    child = logging.getLogger("vanik.bot.redaction-test")
    child.warning("request token %s", secret)
    try:
        raise RuntimeError(secret)
    except RuntimeError:
        child.exception("request failed")
    text = output.getvalue()
    assert secret not in text
    assert text.count("[REDACTED_BOT_TOKEN]") >= 2


def test_transport_loggers_silenced() -> None:
    configure_logging("TEST_TOKEN")
    assert logging.getLogger("httpx").level >= logging.WARNING
    assert logging.getLogger("httpcore").level >= logging.WARNING
    assert logging.getLogger("telegram").level >= logging.WARNING
