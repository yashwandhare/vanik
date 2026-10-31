from collections.abc import Callable
from threading import Lock
from time import monotonic


class AuthAttemptLimiter:
    """Bound authentication work per client in the single-worker prototype."""

    def __init__(
        self,
        limit: int,
        window_seconds: int = 60,
        max_clients: int = 4096,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if min(limit, window_seconds, max_clients) < 1:
            raise ValueError("Rate limit parameters must be positive")
        self.limit = limit
        self.window_seconds = window_seconds
        self.max_clients = max_clients
        self._clock = clock
        self._clients: dict[str, tuple[float, int]] = {}
        self._lock = Lock()

    def allow(self, client: str) -> bool:
        with self._lock:
            now = self._clock()
            started, count = self._clients.get(client, (now, 0))
            if now - started >= self.window_seconds:
                started, count = now, 0
            if count >= self.limit:
                return False
            if client not in self._clients and len(self._clients) >= self.max_clients:
                self._clients = {
                    key: value
                    for key, value in self._clients.items()
                    if now - value[0] < self.window_seconds
                }
                if len(self._clients) >= self.max_clients:
                    return False
            self._clients[client] = started, count + 1
            return True
