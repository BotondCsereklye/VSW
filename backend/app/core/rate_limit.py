from __future__ import annotations

from collections import defaultdict, deque
from collections.abc import Callable
from threading import Lock
from time import time


class InMemoryRateLimiter:
    def __init__(
        self,
        *,
        max_requests: int,
        window_seconds: int,
        clock: Callable[[], float] = time,
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clock = clock
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = self.clock()
        window_start = now - self.window_seconds

        with self._lock:
            request_times = self._requests[key]
            while request_times and request_times[0] < window_start:
                request_times.popleft()

            if len(request_times) >= self.max_requests:
                return False

            request_times.append(now)
            return True
