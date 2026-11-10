"""How the keyword judge and Qwen3Guard disagree about the ablated responses."""

import pandas as pd

from ..config import CATEGORIES, OUTCOME_KEYS
from .breakdowns import category_order
from .stats import proportion


def _row(sub: pd.DataFrame, key: str, label: str) -> dict:
    n = len(sub)
    return {
        "key": key,
        "label": label,
        "substring": proportion(int(sub["abl_substring_jb"].sum()), n),
        "guard": proportion(int((sub["abl_outcome"] == "harmful").sum()), n),
    }


def compute(df: pd.DataFrame) -> dict:
    rows = [_row(df[df["category"] == c], c, CATEGORIES[c]) for c in category_order(df)]
    rows.sort(key=lambda r: r["substring"]["rate"] - r["guard"]["rate"], reverse=True)
    crosstab = pd.crosstab(df["abl_substring_jb"], df["abl_outcome"]).reindex(
        index=[False, True], columns=OUTCOME_KEYS, fill_value=0
    )
    return {
        "overall": _row(df, "all", "All requests"),
        "baseline_overall": {
            "substring": proportion(int(df["base_substring_jb"].sum()), len(df)),
            "guard": proportion(int((df["base_outcome"] == "harmful").sum()), len(df)),
        },
        "rows": rows,
        "crosstab": {
            "outcomes": list(OUTCOME_KEYS),
            "no_keyword_hit": crosstab.loc[True].astype(int).tolist(),
            "keyword_hit": crosstab.loc[False].astype(int).tolist(),
        },
    }
