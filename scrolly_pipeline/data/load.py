"""Load the baseline and ablation evaluations and pair them prompt by prompt."""

import json
from pathlib import Path

import pandas as pd

from ..config import RESPONSES_DIR
from .outcomes import classify

META_COLUMNS = ["id", "prompt", "category", "subcategory", "severity", "attack_style", "expected", "source"]
JUDGED_COLUMNS = ["response", "is_jailbreak_substring_matching", "qwen3guard_safety", "qwen3guard_refusal"]

# Columns holding prompt / model text. Only text-feature extraction and the leak
# check may read them; nothing derived from them verbatim may reach the page.
TEXT_COLUMNS = ["prompt", "base_response", "abl_response"]

_PREFIX = {"baseline": "base", "ablation": "abl"}


def _load_condition(name: str, responses_dir: Path) -> pd.DataFrame:
    path = responses_dir / f"{name}_evaluations.json"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found - extract responses.7z into {responses_dir} first")
    completions = json.loads(path.read_text())["completions"]
    return pd.DataFrame(completions)[META_COLUMNS + JUDGED_COLUMNS]


def load_paired(responses_dir: Path = RESPONSES_DIR) -> pd.DataFrame:
    """One row per prompt with ``base_*`` and ``abl_*`` judged columns side by side."""
    frames = {}
    for condition, prefix in _PREFIX.items():
        df = _load_condition(condition, responses_dir)
        frames[prefix] = df.rename(columns={c: f"{prefix}_{c}" for c in JUDGED_COLUMNS})

    base, abl = frames["base"], frames["abl"]
    paired = base.merge(abl.drop(columns=META_COLUMNS[1:]), on="id", how="inner", validate="one_to_one")
    if len(paired) != len(base) or len(paired) != len(abl):
        raise ValueError("baseline and ablation files do not contain the same prompts")

    for prefix in _PREFIX.values():
        paired[f"{prefix}_outcome"] = [
            classify(r, s) for r, s in zip(paired[f"{prefix}_qwen3guard_refusal"], paired[f"{prefix}_qwen3guard_safety"])
        ]
        paired[f"{prefix}_words"] = paired[f"{prefix}_response"].str.split().str.len()
        paired[f"{prefix}_substring_jb"] = paired[f"{prefix}_is_jailbreak_substring_matching"].astype(bool)

    paired["severity"] = paired["severity"].astype(int)
    return paired.reset_index(drop=True)
