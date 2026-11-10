"""Small statistics helpers."""

import math


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Wilson score interval for a binomial proportion (95% by default)."""
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    denom = 1 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


def proportion(k: int, n: int) -> dict:
    """A proportion with its count, size and Wilson interval, ready for JSON."""
    lo, hi = wilson(k, n)
    return {"k": int(k), "n": int(n), "rate": k / n if n else 0.0, "lo": lo, "hi": hi}
