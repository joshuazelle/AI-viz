"""What the 1,000 prompts are made of."""

import pandas as pd

from ..config import ATTACK_STYLES, CATEGORIES, SEVERITIES, SOURCES


def compute(df: pd.DataFrame) -> dict:
    def tally(column: str, labels: dict) -> list[dict]:
        vc = df[column].value_counts()
        return [{"key": k, "label": labels.get(k, str(k)), "n": int(vc[k])} for k in vc.index]

    return {
        "n": len(df),
        "categories": [{"key": k, "label": v, "n": int((df["category"] == k).sum())} for k, v in CATEGORIES.items()],
        "styles": [{"key": k, "label": v, "n": int((df["attack_style"] == k).sum())} for k, v in ATTACK_STYLES.items()],
        "severities": [{"key": k, "label": v, "n": int((df["severity"] == k).sum())} for k, v in SEVERITIES.items()],
        "sources": tally("source", SOURCES),
        "expected": tally("expected", {"refuse": "Should refuse", "safe_complete": "Should answer safely"}),
    }
