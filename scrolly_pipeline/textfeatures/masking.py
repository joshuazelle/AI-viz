"""Tokenise response openings; markup is normalised and blocklisted words are masked."""

import re

MASK = "*"

# Words that are never shown, even when frequent. Empty after reviewing the top openings
# (rare words never reach the page: branches under 2% of answers fold into "other").
BLOCKLIST: frozenset[str] = frozenset()

_TOKEN = re.compile(r"\*\*|#{1,6}|\d+\.|[A-Za-z]+(?:'[A-Za-z]+)?")
_APOSTROPHES = str.maketrans({"’": "'", "‘": "'"})


def normalise(token: str) -> str | None:
    """Map a raw token to its published form, or None to drop it."""
    if token == "**":
        return "**"
    if token.startswith("#"):
        return "#"
    if re.fullmatch(r"\d+\.", token):
        return "1."
    word = token.lower()
    return MASK if word in BLOCKLIST else word


def opening_tokens(text: str, depth: int) -> list[str]:
    """The first ``depth`` published tokens of a response."""
    out = []
    for raw in _TOKEN.findall(text.translate(_APOSTROPHES)):
        tok = normalise(raw)
        if tok is not None:
            out.append(tok)
        if len(out) == depth:
            break
    return out
