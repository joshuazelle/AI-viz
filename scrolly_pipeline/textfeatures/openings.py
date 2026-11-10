"""Prefix tree of masked response openings ("word tree" / icicle data)."""

from collections import Counter

from ..config import OUTCOME_KEYS
from .masking import opening_tokens

OTHER = "(other)"


def _node(label: str) -> dict:
    return {"label": label, "n": 0, "outcomes": Counter(), "children": {}}


def _finalise(node: dict, total: int, min_share: float, max_children: int) -> dict:
    kids = sorted(node["children"].values(), key=lambda c: -c["n"])
    keep = [c for c in kids[:max_children] if c["n"] / total >= min_share]
    kept = {id(c) for c in keep}
    rest = [c for c in kids if id(c) not in kept]
    children = [_finalise(c, total, min_share, max_children) for c in keep]
    # A lone "(other)" child says nothing - leave the node as a leaf instead.
    if rest and keep:
        other = _node(OTHER)
        for c in rest:
            other["n"] += c["n"]
            other["outcomes"].update(c["outcomes"])
        children.append(_finalise(other, total, 1.1, 0))
    return {
        "label": node["label"],
        "n": node["n"],
        "outcomes": [int(node["outcomes"].get(k, 0)) for k in OUTCOME_KEYS],
        "children": children,
    }


def opening_tree(responses, outcomes, depth: int = 3, min_share: float = 0.02, max_children: int = 5) -> dict:
    """Count shared openings; branches under ``min_share`` of all responses fold into (other)."""
    root = _node("")
    for text, outcome in zip(responses, outcomes):
        root["n"] += 1
        root["outcomes"][outcome] += 1
        node = root
        for tok in opening_tokens(text, depth):
            node = node["children"].setdefault(tok, _node(tok))
            node["n"] += 1
            node["outcomes"][outcome] += 1
    return _finalise(root, root["n"], min_share, max_children)
