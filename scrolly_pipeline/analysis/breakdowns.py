"""Harmful-answer rates broken down by category, severity and framing."""

import pandas as pd

from ..config import ATTACK_STYLES, CATEGORIES, OUTCOME_KEYS, SEVERITIES
from .outcomes import PREFIXES
from .stats import proportion


def _harmful(df: pd.DataFrame, prefix: str) -> dict:
    return proportion(int((df[f"{prefix}_outcome"] == "harmful").sum()), len(df))


def category_order(df: pd.DataFrame) -> list[str]:
    """Categories sorted by ablated harmful rate, highest first."""
    rate = df.groupby("category")["abl_outcome"].apply(lambda s: (s == "harmful").mean())
    return rate.sort_values(ascending=False, kind="stable").index.tolist()


def heatmap(df: pd.DataFrame) -> dict:
    """Harmful rate per category x severity cell, for both conditions."""
    order = category_order(df)
    cells = []
    for condition, prefix in PREFIXES.items():
        for cat in order:
            for sev in SEVERITIES:
                sub = df[(df["category"] == cat) & (df["severity"] == sev)]
                cells.append({"condition": condition, "category": cat, "severity": sev, **_harmful(sub, prefix)})
    totals = {
        condition: {cat: _harmful(df[df["category"] == cat], prefix) for cat in order}
        for condition, prefix in PREFIXES.items()
    }
    return {
        "categories": [{"key": c, "label": CATEGORIES[c]} for c in order],
        "severities": [{"key": k, "label": v} for k, v in SEVERITIES.items()],
        "cells": cells,
        "totals": totals,
    }


def severity(df: pd.DataFrame) -> dict:
    return {
        condition: {str(sev): _harmful(df[df["severity"] == sev], prefix) for sev in SEVERITIES}
        for condition, prefix in PREFIXES.items()
    }


def framing(df: pd.DataFrame) -> dict:
    """Harmful rate per attack style with Wilson intervals, sorted by baseline rate."""
    rows = []
    for style, label in ATTACK_STYLES.items():
        sub = df[df["attack_style"] == style]
        rows.append({
            "key": style,
            "label": label,
            "baseline": _harmful(sub, "base"),
            "ablation": _harmful(sub, "abl"),
        })
    rows.sort(key=lambda r: (-r["baseline"]["rate"], -r["ablation"]["rate"]))
    return {"rows": rows}


def safe_complete(df: pd.DataFrame) -> dict:
    """Outcome mix for the prompts whose ideal answer is a safe completion."""
    sub = df[df["expected"] == "safe_complete"]
    harm_after = sub.groupby("category")["abl_outcome"].apply(lambda s: (s == "harmful").mean())
    rows = []
    for cat in harm_after.sort_values(ascending=False).index:
        part = sub[sub["category"] == cat]
        for condition, prefix in PREFIXES.items():
            vc = part[f"{prefix}_outcome"].value_counts()
            rows.append({
                "category": cat,
                "label": CATEGORIES[cat],
                "condition": condition,
                "n": len(part),
                "counts": {k: int(vc.get(k, 0)) for k in OUTCOME_KEYS},
            })
    return {"n": len(sub), "rows": rows}


def persistent(df: pd.DataFrame) -> dict:
    """Prompts still refused after ablation, per category."""
    still = df[(df["base_outcome"] == "refusal") & (df["abl_outcome"] == "refusal")]
    by_cat = still["category"].value_counts()
    return {
        "n": len(still),
        "by_category": [
            {"key": c, "label": CATEGORIES[c], "k": int(by_cat.get(c, 0)), "n": int((df["category"] == c).sum())}
            for c in by_cat.index
        ],
    }
