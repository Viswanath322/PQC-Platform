"""Small process-local throttle for the single-user desktop API process."""

from collections import deque
from threading import Lock
from time import monotonic


class LoginThrottle:
    def __init__(self, window_seconds: int = 900, lock_seconds: int = 900, max_buckets: int = 4096):
        self.window_seconds = window_seconds
        self.lock_seconds = lock_seconds
        self.max_buckets = max_buckets
        self._failures: dict[str, deque[float]] = {}
        self._locked_until: dict[str, float] = {}
        self._lock = Lock()

    def key(self, client_host: str, email: str) -> str:
        return f"{client_host.casefold()}:{email.casefold()}"

    def ip_key(self, client_host: str) -> str:
        return f"ip:{client_host.casefold()}"

    def is_locked(self, key: str) -> bool:
        now = monotonic()
        with self._lock:
            return self._locked_until.get(key, 0) > now

    def retry_after(self, key: str) -> int:
        with self._lock:
            return max(1, int(self._locked_until.get(key, monotonic()) - monotonic()))

    def record_failure(self, key: str, failure_limit: int) -> None:
        now = monotonic()
        with self._lock:
            self._prune(now)
            failures = self._failures.setdefault(key, deque())
            failures.append(now)
            while failures and now - failures[0] > self.window_seconds:
                failures.popleft()
            if len(failures) >= failure_limit:
                self._locked_until[key] = now + self.lock_seconds
            if len(self._failures) > self.max_buckets:
                oldest = min(self._failures, key=lambda item: self._failures[item][-1])
                self._failures.pop(oldest, None)
                self._locked_until.pop(oldest, None)

    def clear(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)
            self._locked_until.pop(key, None)

    def _prune(self, now: float) -> None:
        expired = [key for key, until in self._locked_until.items() if until <= now]
        for key in expired:
            self._locked_until.pop(key, None)
        expired_failures = [
            key for key, timestamps in self._failures.items()
            if not timestamps or now - timestamps[-1] > self.window_seconds
        ]
        for key in expired_failures:
            self._failures.pop(key, None)


login_throttle = LoginThrottle()
