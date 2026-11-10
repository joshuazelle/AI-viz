"""Fail the build if the page shares a run of words with any prompt or model answer."""

import re

import pandas as pd

_WORD = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")
_APOSTROPHES = str.maketrans({"’": "'", "‘": "'"})


def _words(text: str) -> list[str]:
    return _WORD.findall(text.translate(_APOSTROPHES).lower())


def _shingles(words: list[str], n: int) -> set[tuple[str, ...]]:
    return {tuple(words[i : i + n]) for i in range(len(words) - n + 1)}


def published_text(html: str, vendored: tuple[str, ...] = ()) -> str:
    """Everything a reader could see or extract: visible text, attribute values,
    the embedded data and our own scripts. Leaves out the HTML skeleton, CSS and
    vendored libraries, whose boilerplate also appears in code-writing answers."""
    data = " ".join(re.findall(r'<script id="viz-data"[^>]*>(.*?)</script>', html, flags=re.S))
    scripts = [s for s in re.findall(r"<script>(.*?)</script>", html, flags=re.S) if s not in vendored]
    body = re.sub(r"<(style|script)\b.*?</\1>", " ", html, flags=re.S | re.I)
    attrs = " ".join(re.findall(r'(?:aria-label|content|title|alt)="([^"]*)"', body))
    text = re.sub(r"<[^>]+>", " ", body)
    return " ".join([text, attrs, data, *scripts])


def leak_check(html: str, df: pd.DataFrame, n: int = 8, vendored: tuple[str, ...] = ()) -> dict:
    """Compare every n-word run of the published content with every prompt and response.

    Hits are reported by source and row index only - never by the matched text,
    so the report itself cannot leak anything either.
    """
    page = _shingles(_words(published_text(html, vendored)), n)
    hits = []
    for column in ("prompt", "base_response", "abl_response"):
        for idx, text in df[column].items():
            overlap = _shingles(_words(text), n) & page
            if overlap:
                hits.append({"column": column, "row": int(idx), "shared_runs": len(overlap)})
    return {"ngram": n, "texts_checked": 3 * len(df), "hits": hits, "ok": not hits}
