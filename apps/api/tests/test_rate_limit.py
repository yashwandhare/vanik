from app.core.rate_limit import AuthAttemptLimiter


def test_rate_limiter_blocks_after_limit_and_resets() -> None:
    now = [100.0]
    limiter = AuthAttemptLimiter(limit=2, window_seconds=60, clock=lambda: now[0])
    assert limiter.allow("client")
    assert limiter.allow("client")
    assert not limiter.allow("client")
    now[0] += 60
    assert limiter.allow("client")


def test_rate_limiter_bounds_distinct_clients() -> None:
    limiter = AuthAttemptLimiter(limit=1, max_clients=2)
    assert limiter.allow("one")
    assert limiter.allow("two")
    assert not limiter.allow("three")
