"""Periodic backend proactivity and at-least-once Telegram notification delivery."""

import asyncio
import logging
from contextlib import suppress

from telegram import Bot
from telegram.error import TelegramError

from bot.client import BackendApiError, BackendClient
from bot.navigation import canonical_reference

logger = logging.getLogger("vanik.bot.worker")


class NotificationWorker:
    """One trusted worker; backend leases recover interrupted claims after restart.

    Keep successful sends pending until ACK succeeds: retrying an ACK must never
    resend the message in this process. Telegram has no exactly-once send API,
    so an interrupted/ambiguous send can still be redelivered after lease expiry.
    """

    def __init__(self, backend: BackendClient, bot: Bot, interval_seconds: float):
        self.backend = backend
        self.bot = bot
        self.interval_seconds = interval_seconds
        self._pending_acks: dict[str, bool] = {}
        self._task: asyncio.Task[None] | None = None

    async def _flush_acks(self) -> None:
        for notification_id, delivered in list(self._pending_acks.items()):
            try:
                await self.backend.ack_notification(notification_id, delivered)
            except BackendApiError as exc:
                logger.warning(
                    "Notification ACK failed (backend HTTP %s); will retry", exc.status_code
                )
            else:
                del self._pending_acks[notification_id]

    async def tick(self) -> None:
        try:
            result = await self.backend.process_proactive()
            logger.info(
                "Backend proactivity cycle completed (processed %s)", result.get("processed", 0)
            )
        except BackendApiError as exc:
            logger.warning("Proactivity cycle failed (backend HTTP %s)", exc.status_code)

        await self._flush_acks()
        # Do not reclaim/resend anything while delivery acknowledgement is uncertain.
        if self._pending_acks:
            return
        try:
            items = await self.backend.claim_notifications()
        except BackendApiError as exc:
            logger.warning("Notification claim failed (backend HTTP %s)", exc.status_code)
            return

        for item in items:
            try:
                notification_id = canonical_reference(str(item.get("id", "")))
            except ValueError:
                logger.error(
                    "Notification claim contained an invalid ID; backend lease must recover it"
                )
                continue
            recipient = item.get("telegram_user_id")
            text = item.get("text")
            delivered = False
            if (
                isinstance(recipient, str)
                and recipient.isascii()
                and recipient.isdecimal()
                and int(recipient) > 0
                and isinstance(text, str)
                and 0 < len(text) <= 4096
            ):
                try:
                    # Backend text is delivered verbatim, without Markdown/HTML interpretation.
                    await self.bot.send_message(chat_id=int(recipient), text=text, parse_mode=None)
                    delivered = True
                except TelegramError as exc:
                    logger.warning(
                        "Telegram notification delivery failed (%s); will retry", type(exc).__name__
                    )
            else:
                logger.error("Notification claim contained invalid delivery data")
            self._pending_acks[notification_id] = delivered
            await self._flush_acks()
            # Continue the claimed batch even if one ACK fails. Unsent items would
            # otherwise remain leased until expiry; retain every uncertain ACK.

    async def run(self) -> None:
        while True:
            try:
                await self.tick()
            except Exception as exc:
                # Keep the loop alive, but never log raw transport errors or payloads.
                logger.error(
                    "Notification worker cycle failed unexpectedly (%s)", type(exc).__name__
                )
            await asyncio.sleep(self.interval_seconds)

    def start(self) -> None:
        if self._task is None:
            # Application.create_task is awaited by Application.stop before its
            # post_stop hook, which would deadlock an infinite worker loop.
            self._task = asyncio.create_task(self.run(), name="vanik-notifications")
            logger.info("Notification worker started")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        await self._flush_acks()
        logger.info("Notification worker stopped")
