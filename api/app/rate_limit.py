"""Tiny in-memory sliding-window rate limiter.

Single-instance only. For multi-instance deployments swap the dict for
Redis. Designed for /auth/login to slow PIN brute force, not for
production-grade abuse mitigation.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_lock = threading.Lock()
_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Honour the first X-Forwarded-For hop if present (so a reverse proxy
    # in front of the API still gives us the client's IP).
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def hit(request: Request, key: str, *, limit: int, window_s: int) -> None:
    """Raise 429 if this caller has exceeded ``limit`` hits in ``window_s`` seconds.

    Always counts (success and failure). Successful endpoints can call
    ``reset`` after the fact if they want to forgive successful attempts;
    we don't, because counting all hits keeps the limiter useful even
    when an attacker switches between valid and invalid PINs.
    """
    ip = _client_ip(request)
    now = time.monotonic()
    with _lock:
        bucket = _buckets[(key, ip)]
        cutoff = now - window_s
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, int(bucket[0] + window_s - now))
            raise HTTPException(
                status_code=429,
                detail=f"too many attempts; try again in {retry_after}s",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)
