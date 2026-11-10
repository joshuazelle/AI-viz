"""How the responses read: openings, stylistic markers and length."""

import numpy as np
import pandas as pd

from ..textfeatures import MARKERS, marker_shares, opening_tree
from .outcomes import PREFIXES
from .stats import proportion

LENGTH_BIN = 25  # words

_SENTENCE_END = (".", "!", "?", ")", "\"", "”", "*", "`", ":", "|")


def _cut_off(text: str) -> bool:
    """Heuristic: the response stops mid-sentence, i.e. it hit the generation limit."""
    return not text.rstrip().endswith(_SENTENCE_END)


def openings(df: pd.DataFrame) -> dict:
    return {
        condition: opening_tree(df[f"{prefix}_response"], df[f"{prefix}_outcome"])
        for condition, prefix in PREFIXES.items()
    }


def markers(df: pd.DataFrame) -> dict:
    shares = {condition: marker_shares(df[f"{prefix}_response"]) for condition, prefix in PREFIXES.items()}
    rows = [
        {
            "key": key,
            "label": meta["label"],
            "hint": meta["hint"],
            **{condition: proportion(shares[condition][key], len(df)) for condition in PREFIXES},
        }
        for key, meta in MARKERS.items()
    ]
    return {"rows": rows}


def lengths(df: pd.DataFrame) -> dict:
    top = int(np.ceil(max(df["base_words"].max(), df["abl_words"].max()) / LENGTH_BIN) * LENGTH_BIN)
    edges = list(range(0, top + LENGTH_BIN, LENGTH_BIN))
    out = {"bin": LENGTH_BIN, "edges": edges}
    for condition, prefix in PREFIXES.items():
        words = df[f"{prefix}_words"]
        cut = df[f"{prefix}_response"].map(_cut_off)
        hist, _ = np.histogram(words, bins=edges)
        hist_cut, _ = np.histogram(words[cut], bins=edges)
        out[condition] = {
            "counts": hist.astype(int).tolist(),
            "cut_counts": hist_cut.astype(int).tolist(),
            "median": float(words.median()),
            "q1": float(words.quantile(0.25)),
            "q3": float(words.quantile(0.75)),
            "max": int(words.max()),
            "cut_off": proportion(int(cut.sum()), len(df)),
        }
    return out
