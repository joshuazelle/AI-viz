"""Validate private scores and select only anonymous public chart fields."""

import json
import math
from pathlib import Path

import pandas as pd

from ..config import CATEGORIES


def load_scores(path: Path, paired: pd.DataFrame) -> tuple[list[dict], pd.DataFrame]:
    if not path.is_file():
        raise FileNotFoundError(f"Place qwen3guard_refusals.jsonl in responses/ or use --scores. Missing: {path}")
    records = {}
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            raise ValueError(f"Invalid score JSON at line {line_number}") from None
        if not isinstance(row, dict):
            raise ValueError(f"Expected score object at line {line_number}")
        probability = row.get("p_refusal_yes")
        try:
            if isinstance(probability, bool) or not isinstance(probability, (int, float, str)):
                raise ValueError
            probability = float(probability)
            if not math.isfinite(probability) or not 0 <= probability <= 1:
                raise ValueError
        except (ValueError, OverflowError):
            raise ValueError(f"Invalid probability at line {line_number}") from None
        variant = "ablation" if row.get("variant") == "ablated" else row.get("variant")
        identifier = row.get("id")
        category = row.get("category")
        refusal = row.get("refusal_label_generated", row.get("qwen3guard_refusal"))
        safety = row.get("safety", row.get("qwen3guard_safety"))
        if (not isinstance(identifier, str) or not identifier or
                variant not in ("baseline", "ablation") or
                not isinstance(category, str) or category not in CATEGORIES or
                refusal not in ("Yes", "No") or safety not in ("Safe", "Unsafe", "Controversial") or
                row.get("status", "ok") != "ok"):
            raise ValueError(f"Invalid score metadata at line {line_number}")
        key = (identifier, variant)
        if key in records:
            raise ValueError(f"Duplicate score ID/variant at line {line_number}")
        records[key] = {
            "id": identifier, "variant": variant, "category": category,
            "p_refusal_yes": probability, "refusal_label_generated": refusal, "safety": safety,
            "prompt": str(row.get("prompt", "")), "response": str(row.get("response", "")),
        }
    expected = {(str(identifier), variant) for identifier in paired["id"]
                for variant in ("baseline", "ablation")}
    if not expected or records.keys() != expected:
        raise ValueError("Scores must contain exactly one successful baseline and ablation record per evaluation ID")
    texts = []
    for evaluation in paired.to_dict("records"):
        baseline = records[(str(evaluation["id"]), "baseline")]
        ablation = records[(str(evaluation["id"]), "ablation")]
        if baseline["category"] != evaluation["category"] or ablation["category"] != evaluation["category"]:
            raise ValueError("Score categories do not match the evaluation data")
        texts.extend([
            {"prompt": baseline["prompt"], "base_response": baseline["response"], "abl_response": ablation["response"]},
            {"prompt": ablation["prompt"], "base_response": "", "abl_response": ""},
        ])
    return list(records.values()), pd.DataFrame(texts)


def chart_records(records: list[dict]) -> list[dict]:
    fields = ("variant", "category", "p_refusal_yes", "refusal_label_generated", "safety")
    groups = {}
    for record in records:
        groups.setdefault(record["id"], {})[record["variant"]] = record
    ordered = sorted(groups.values(), key=lambda group: tuple(
        group[variant][field] for variant in ("baseline", "ablation") for field in fields))
    result = []
    for index, group in enumerate(ordered, 1):
        for variant in ("baseline", "ablation"):
            record = group[variant]
            output = {"id": f"pair-{index:04d}",
                      **{field: record[field] for field in fields}}
            result.append(output)
    return result
