"""Outcome counts, the baseline -> ablation flow matrix and the per-prompt unit records."""

import pandas as pd

from ..config import ATTACK_STYLES, CATEGORIES, OUTCOME_KEYS

PREFIXES = {"baseline": "base", "ablation": "abl"}


def counts(df: pd.DataFrame) -> dict:
    """Prompts per outcome class, for each condition."""
    out = {}
    for condition, prefix in PREFIXES.items():
        vc = df[f"{prefix}_outcome"].value_counts()
        out[condition] = {k: int(vc.get(k, 0)) for k in OUTCOME_KEYS}
    return {"n": len(df), **out}


def flows(df: pd.DataFrame) -> dict:
    """matrix[i][j] = prompts with baseline outcome i and ablated outcome j."""
    table = pd.crosstab(df["base_outcome"], df["abl_outcome"]).reindex(
        index=OUTCOME_KEYS, columns=OUTCOME_KEYS, fill_value=0
    )
    return {"outcomes": list(OUTCOME_KEYS), "matrix": table.astype(int).values.tolist()}


def units(df: pd.DataFrame) -> dict:
    """One compact record per prompt for the dot grid. No ids, no text."""
    cats, styles, outs = list(CATEGORIES), list(ATTACK_STYLES), list(OUTCOME_KEYS)
    rows = [
        [
            cats.index(r.category),
            int(r.severity),
            styles.index(r.attack_style),
            int(r.expected == "safe_complete"),
            outs.index(r.base_outcome),
            outs.index(r.abl_outcome),
        ]
        for r in df.sort_values(["category", "severity"], kind="stable").itertuples()
    ]
    return {"fields": ["category", "severity", "style", "safe_complete", "base", "abl"], "rows": rows}
