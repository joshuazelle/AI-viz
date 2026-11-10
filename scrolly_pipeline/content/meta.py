"""Lookup tables shipped to the front end (labels only, no data)."""

from ..config import ATTACK_STYLE_HINTS, ATTACK_STYLES, CATEGORIES, CATEGORY_SHORT, OUTCOMES, SEVERITIES


def page_meta(dataset: dict) -> dict:
    sev_n = {s["key"]: s["n"] for s in dataset["severities"]}
    return {
        "categories": [{"key": k, "label": v, "short": CATEGORY_SHORT[k]} for k, v in CATEGORIES.items()],
        "styles": [{"key": k, "label": v, "hint": ATTACK_STYLE_HINTS[k]} for k, v in ATTACK_STYLES.items()],
        "severities": [{"key": k, "label": v, "n": sev_n.get(k, 0)} for k, v in SEVERITIES.items()],
        "outcomes": [{"key": o.key, "label": o.label, "description": o.description} for o in OUTCOMES],
    }
