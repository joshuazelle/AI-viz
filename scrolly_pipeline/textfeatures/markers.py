"""Share of responses showing a few stylistic markers (regex counts only)."""

import re

MARKERS = {
    "refusal_phrase": {
        "label": "Refusal phrase",
        "hint": "“I cannot…”, “I won’t…”, “I’m unable…”",
        "pattern": r"\b(?:i can(?:no|')t|i won't|i will not|i(?:'m| am) (?:not able|unable))\b",
    },
    "safety_words": {
        "label": "Safety vocabulary",
        "hint": "“illegal”, “unethical”, “dangerous”, “harmful”",
        "pattern": r"\b(?:illegal|unethical|dangerous|harmful)\b",
    },
    "points_to_help": {
        "label": "Points to help",
        "hint": "hotlines, professionals, crisis services",
        "pattern": r"\b(?:hotline|helpline|crisis|therapist|professional|emergency services)\b",
    },
    "md_heading": {
        "label": "Markdown headings",
        "hint": "lines starting with #",
        "pattern": r"(?m)^\s*#{1,6}\s",
    },
    "bold": {
        "label": "Bold text",
        "hint": "**emphasis**",
        "pattern": r"\*\*",
    },
    "numbered": {
        "label": "Numbered steps",
        "hint": "“1.”, “Step 2”",
        "pattern": r"(?m)^\s*(?:\d+\.\s|step \d)",
    },
}

_COMPILED = {k: re.compile(m["pattern"], re.IGNORECASE) for k, m in MARKERS.items()}
_APOSTROPHES = str.maketrans({"’": "'", "‘": "'"})


def marker_shares(responses) -> dict[str, int]:
    """How many responses contain each marker at least once."""
    texts = [t.translate(_APOSTROPHES) for t in responses]
    return {k: sum(bool(rx.search(t)) for t in texts) for k, rx in _COMPILED.items()}
