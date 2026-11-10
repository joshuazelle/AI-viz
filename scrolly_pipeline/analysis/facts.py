"""Numbers quoted in the prose, derived from the figure data so text and charts always agree."""

from ..config import CATEGORIES, OUTCOME_KEYS


def _idx(key: str) -> int:
    return OUTCOME_KEYS.index(key)


def _top_opening(tree: dict) -> dict:
    """Most common fully spelled-out (unmasked) three-token opening."""
    best = {"phrase": "", "n": 0}

    def walk(node, path):
        for child in node["children"]:
            p = [*path, child["label"]]
            if len(p) == 3 and "*" not in p and "(other)" not in p and child["n"] > best["n"]:
                best.update(phrase=" ".join(p), n=child["n"])
            walk(child, p)

    walk(tree, [])
    return {**best, "share": best["n"] / tree["n"]}


def _severe(fig: dict) -> dict:
    cells = [c for c in fig["heatmap"]["cells"] if c["condition"] == "baseline" and c["severity"] == 3]
    ranked = sorted(cells, key=lambda c: -c["n"])
    return {
        "most": {"label": CATEGORIES[ranked[0]["category"]], "n": ranked[0]["n"]},
        "none": [CATEGORIES[c["category"]] for c in cells if c["n"] == 0],
    }


def compute(fig: dict) -> dict:
    c = fig["counts"]
    n = c["n"]
    m = fig["flows"]["matrix"]
    refusal, safe, harmful = _idx("refusal"), _idx("safe"), _idx("harmful")

    base_refusals = c["baseline"]["refusal"]
    framing = {r["key"]: r for r in fig["framing"]["rows"]}
    sev = fig["severity"]
    judges = fig["judges"]
    by_gap = judges["rows"]
    voice_m = {r["key"]: r for r in fig["markers"]["rows"]}
    lengths = fig["lengths"]
    sc_rows = fig["safe_complete"]["rows"]
    sc_n = fig["safe_complete"]["n"]

    def sc_sum(condition: str, key: str) -> int:
        return sum(r["counts"][key] for r in sc_rows if r["condition"] == condition)

    heat_totals = fig["heatmap"]["totals"]["ablation"]
    cats_by_harm = list(heat_totals)  # already ordered by ablated harmful rate
    persistent = fig["persistent"]

    return {
        "n": n,
        "n_categories": len(fig["dataset"]["categories"]),
        "n_sources": len(fig["dataset"]["sources"]),
        "n_styles": len(fig["dataset"]["styles"]),
        "n_framed": n - framing["direct"]["baseline"]["n"],
        "base": c["baseline"],
        "abl": c["ablation"],
        "refusal_to_harmful": m[refusal][harmful],
        "refusal_to_safe": m[refusal][safe],
        "refusal_kept": m[refusal][refusal],
        "refusal_lost": base_refusals - m[refusal][refusal],
        "refusal_to_harmful_share": m[refusal][harmful] / base_refusals,
        "persistent": persistent["n"],
        "persistent_top": persistent["by_category"][0],
        "persistent_second": persistent["by_category"][1],
        "safe_to_harmful": m[safe][harmful],
        "severe": _severe(fig),
        "opening_base": _top_opening(fig["openings"]["baseline"]),
        "opening_abl": _top_opening(fig["openings"]["ablation"]),
        "framing_rows": fig["framing"]["rows"],
        "framing_abl_max": max(fig["framing"]["rows"], key=lambda r: r["ablation"]["rate"]),
        "framing_abl_min": min(fig["framing"]["rows"], key=lambda r: r["ablation"]["rate"]),
        "sev_abl": {k: v["rate"] for k, v in sev["ablation"].items()},
        "top_category": {"label": CATEGORIES[cats_by_harm[0]], **heat_totals[cats_by_harm[0]]},
        "bottom_category": {"label": CATEGORIES[cats_by_harm[-1]], **heat_totals[cats_by_harm[-1]]},
        "fictional": framing["fictional_frame"],
        "direct": framing["direct"],
        "judge_substring": judges["overall"]["substring"],
        "judge_guard": judges["overall"]["guard"],
        "judge_base_substring": judges["baseline_overall"]["substring"],
        "judge_max_gap": by_gap[0],
        "judge_safe_counted": judges["crosstab"]["no_keyword_hit"][safe],
        "judge_refusal_counted": judges["crosstab"]["no_keyword_hit"][refusal],
        "markers": voice_m,
        "len_base_median": lengths["baseline"]["median"],
        "len_abl_median": lengths["ablation"]["median"],
        "len_abl_cut": lengths["ablation"]["cut_off"],
        "len_base_cut": lengths["baseline"]["cut_off"],
        "sc_n": sc_n,
        "sc_base_refusal": sc_sum("baseline", "refusal"),
        "sc_base_safe": sc_sum("baseline", "safe"),
        "sc_abl_safe": sc_sum("ablation", "safe"),
        "sc_abl_harmful": sc_sum("ablation", "harmful"),
        "sc_abl_refusal": sc_sum("ablation", "refusal"),
    }
