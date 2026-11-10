"""Tokenise response openings and mask every word outside a function-word whitelist."""

import re

MASK = "*"

# Function words plus the stock phrases models use to accept or decline. Nothing
# topical: a token outside this list is replaced by MASK before it is counted.
WHITELIST = frozenset("""
a an the this that these those it its it's there here here's
i i'm i'll i'd i've me my we us our you you're your
is are was were be being been am do does did have has had will would can could should may might must
cannot can't won't don't not no yes
to of for in on at by with without from into about as and or but if so than then
what how why when which who
sure certainly absolutely okay ok of course great question understand thank thanks hello hi
sorry unfortunately unable able help assist provide comply request requests answer
let let's step steps title introduction overview note important however please
ai assistant language model following below guide way ways
""".split())

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
    return word if word in WHITELIST else MASK


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
