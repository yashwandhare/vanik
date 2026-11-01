"""Regression tests for lease-backed delivery and acknowledgement retries."""

import asyncio
import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram.error import NetworkError

from bot.client import BackendApiError
from bot.worker import NotificationWorker

REFERENCE = "80000000-0000-4000-8000-000000000001"
ITEM = {"id": REFERENCE, "telegram_user_id": "123456789", "text": "Backend event <not markup>"}


@pytest.fixture
def worker() -> NotificationWorker:
    backend = MagicMock()
    backend.process_proactive = AsyncMock(return_value={"processed": 1})
    backend.claim_notifications = AsyncMock(return_value=[ITEM])
    backend.ack_notification = AsyncMock()
    bot = MagicMock()
    bot.send_message = AsyncMock()
    return NotificationWorker(backend, bot, interval_seconds=1)


@pytest.mark.asyncio
async def test_proactive_claim_send_and_ack(worker: NotificationWorker) -> None:
    await worker.tick()
    backend: Any = worker.backend
    bot: Any = worker.bot
    backend.process_proactive.assert_awaited_once()
    backend.claim_notifications.assert_awaited_once()
    bot.send_message.assert_awaited_once_with(chat_id=123456789, text=ITEM["text"], parse_mode=None)
    backend.ack_notification.assert_awaited_once_with(REFERENCE, True)


@pytest.mark.asyncio
async def test_failed_delivery_ack_and_reclaimed_retry(
    worker: NotificationWorker, caplog: pytest.LogCaptureFixture
) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    bot.send_message.side_effect = [NetworkError("https://telegram.test/botTRANSPORT_SECRET"), None]
    with caplog.at_level(logging.WARNING):
        await worker.tick()
        await worker.tick()  # Backend reclaims failed records for the next attempt.
    assert backend.ack_notification.await_args_list[0].args == (REFERENCE, False)
    assert backend.ack_notification.await_args_list[1].args == (REFERENCE, True)
    assert bot.send_message.await_count == 2
    assert "TRANSPORT_SECRET" not in caplog.text


@pytest.mark.asyncio
async def test_successful_send_ack_retry_does_not_redeliver(worker: NotificationWorker) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    backend.ack_notification.side_effect = [
        BackendApiError(502, "secret"),
        BackendApiError(502, "secret"),
        None,
    ]
    backend.claim_notifications.side_effect = [[ITEM], []]
    await worker.tick()  # Send succeeds; ACK fails.
    await worker.tick()  # Pending ACK fails; no new claim or send.
    assert backend.claim_notifications.await_count == 1
    await worker.tick()  # Retry ACK succeeds, then claim can resume.
    assert bot.send_message.await_count == 1
    assert backend.ack_notification.await_count == 3
    assert all(call.args == (REFERENCE, True) for call in backend.ack_notification.await_args_list)


@pytest.mark.asyncio
async def test_failed_send_ack_retry_retains_false(worker: NotificationWorker) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    bot.send_message.side_effect = NetworkError("secret")
    backend.ack_notification.side_effect = [BackendApiError(502, "secret"), None]
    backend.claim_notifications.side_effect = [[ITEM], []]
    await worker.tick()
    await worker.tick()
    assert backend.ack_notification.await_count == 2
    assert all(call.args == (REFERENCE, False) for call in backend.ack_notification.await_args_list)
    assert bot.send_message.await_count == 1


@pytest.mark.asyncio
async def test_batch_is_completed_even_if_ack_fails(worker: NotificationWorker) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    second = {**ITEM, "id": "80000000-0000-4000-8000-000000000002"}
    backend.claim_notifications.return_value = [ITEM, second]
    backend.ack_notification.side_effect = [BackendApiError(502, "secret"), None, None]
    await worker.tick()
    assert bot.send_message.await_count == 2
    assert backend.ack_notification.await_args_list[-1].args == (second["id"], True)


@pytest.mark.asyncio
async def test_proactivity_failure_does_not_block_delivery(worker: NotificationWorker) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    backend.process_proactive.side_effect = BackendApiError(502, "secret")
    await worker.tick()
    bot.send_message.assert_awaited_once()


@pytest.mark.asyncio
async def test_claim_error_is_observable_and_retried(
    worker: NotificationWorker, caplog: pytest.LogCaptureFixture
) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    backend.claim_notifications.side_effect = [BackendApiError(502, "secret"), [ITEM]]
    await worker.tick()
    assert "Notification claim failed" in caplog.text
    assert "secret" not in caplog.text
    bot.send_message.assert_not_called()
    await worker.tick()
    bot.send_message.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "changes", [{"telegram_user_id": "-100123"}, {"text": ""}, {"text": "x" * 4097}]
)
async def test_invalid_delivery_data_is_not_sent(
    worker: NotificationWorker, changes: dict[str, str]
) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    backend.claim_notifications.return_value = [{**ITEM, **changes}]
    await worker.tick()
    bot.send_message.assert_not_called()
    backend.ack_notification.assert_awaited_once_with(REFERENCE, False)


@pytest.mark.asyncio
async def test_invalid_claim_id_cannot_be_used_in_ack_path(worker: NotificationWorker) -> None:
    backend: Any = worker.backend
    bot: Any = worker.bot
    backend.claim_notifications.return_value = [{**ITEM, "id": "../admin"}]
    await worker.tick()
    bot.send_message.assert_not_called()
    backend.ack_notification.assert_not_called()


@pytest.mark.asyncio
async def test_worker_lifecycle_cancels_loop(worker: NotificationWorker) -> None:
    # Synchronize on real activity, not timing/sleep-based polling.
    started = asyncio.Event()
    backend: Any = worker.backend

    async def process() -> dict[str, int]:
        started.set()
        return {"processed": 0}

    backend.process_proactive.side_effect = process
    worker.start()
    worker.start()  # Does not spawn a second loop.
    await asyncio.wait_for(started.wait(), timeout=1)
    await worker.stop()
    await worker.stop()  # Both post_stop and post_shutdown may call this hook.
    count = backend.process_proactive.await_count
    assert count == 1


@pytest.mark.asyncio
async def test_unexpected_loop_error_is_safe_and_observable(
    worker: NotificationWorker, caplog: pytest.LogCaptureFixture
) -> None:
    finished = asyncio.Event()
    ticks = 0

    async def tick() -> None:
        nonlocal ticks
        ticks += 1
        if ticks == 1:
            raise RuntimeError("transport-secret")
        finished.set()

    worker.tick = tick  # type: ignore[method-assign]
    worker.interval_seconds = 0
    worker.start()
    await asyncio.wait_for(finished.wait(), timeout=1)
    await worker.stop()
    assert "failed unexpectedly (RuntimeError)" in caplog.text
    assert "transport-secret" not in caplog.text
