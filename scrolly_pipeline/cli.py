"""Command line: build a versioned page into output/scrolly/vNN/ and QA it."""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from .analysis import compute_all
from .config import OUTPUT_DIR, RESPONSES_DIR
from .data import load_paired
from .data.uncertainty import chart_records, load_scores
from .qa import leak_check
from .render import render_page
from .render.build import d3_source


def _next_tag(root: Path) -> str:
    nums = [int(m.group(1)) for p in root.glob("v*") if (m := re.fullmatch(r"v(\d+)", p.name))]
    return f"v{max(nums, default=0) + 1:02d}"


def build(args) -> int:
    root = Path(args.out)
    root.mkdir(parents=True, exist_ok=True)
    tag = args.tag or _next_tag(root)
    out = root / tag
    out.mkdir(parents=True, exist_ok=True)

    df = load_paired(Path(args.responses))
    fig, facts = compute_all(df)
    scores_path = Path(args.scores) if args.scores else Path(args.responses) / "qwen3guard_refusals.jsonl"
    records, score_texts = load_scores(scores_path, df)
    fig["uncertainty"] = chart_records(records)
    html = render_page(fig, facts)

    leaks = leak_check(html, df, vendored=(d3_source(),))
    score_leaks = leak_check(html, score_texts, vendored=(d3_source(),))
    leaks["score_texts"] = score_leaks
    leaks["ok"] = leaks["ok"] and score_leaks["ok"]
    (out / "leakcheck.json").write_text(json.dumps(leaks, indent=2))
    if not leaks["ok"]:
        print(f"LEAK CHECK FAILED: {len(leaks['hits']) + len(score_leaks['hits'])} texts share an {leaks['ngram']}-word run with the page. Page not written.")
        return 1

    page = out / "index.html"
    page.write_text(html)
    (out / "figures.json").write_text(json.dumps(fig, indent=1))
    shutil.copyfile(page, root / "latest.html")
    print(f"built {page} ({page.stat().st_size / 1024:.0f} KB) - leak check passed on {leaks['texts_checked']} texts")

    if not args.no_shots:
        from .qa.screenshots import capture

        report = capture(page, out / "shots")
        for name, r in report.items():
            flag = "OK " if not r["errors"] and r["scrollWidth"] <= r["clientWidth"] else "!! "
            empty = [f["chart"] for f in r["figures"] if not f["svg"] or f["marks"] < 5]
            print(f"{flag}{name}: {len(r['errors'])} console errors, scrollWidth {r['scrollWidth']}/{r['clientWidth']}, empty charts {empty}")
            for e in r["errors"][:5]:
                print("     ", e)
            if r["overflowing"]:
                print("      overflowing:", r["overflowing"])

        from .qa.interactions import check

        inter = check(page, out / "shots")
        missing = [k for k, v in inter["tooltips"].items() if v in ("NOT SHOWN", "no marks")]
        empty_tables = [k for k, v in inter["tables"].items() if not v]
        print(f"interactions: tooltips missing {missing}, waffle hover {'ok' if inter['waffle_hover'] != 'NOT SHOWN' else 'MISSING'}, "
              f"empty tables {empty_tables}, theme toggle -> {inter['theme']['data-theme']}")
        from .qa.uncertainty import check as check_uncertainty

        uncertainty = check_uncertainty(page, out / "shots")
        print(f"uncertainty explorer: {uncertainty['synthetic_checks']}")
    return 0


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(prog="scrolly_pipeline", description=__doc__)
    sub = parser.add_subparsers(dest="cmd")
    b = sub.add_parser("build", help="build a new page version (default)")
    b.add_argument("--tag", help="version folder name, default: next vNN")
    b.add_argument("--out", default=str(OUTPUT_DIR))
    b.add_argument("--responses", default=str(RESPONSES_DIR))
    b.add_argument("--scores", help="local Qwen3Guard JSONL; default: responses/qwen3guard_refusals.jsonl")
    b.add_argument("--no-shots", action="store_true", help="skip the headless-browser screenshots")
    preview = sub.add_parser("preview", help="serve the latest public page locally")
    preview.add_argument("--page", type=Path, default=OUTPUT_DIR / "latest.html")
    preview.add_argument("--port", type=int, default=8765)
    args = parser.parse_args(argv)
    if args.cmd == "preview":
        from .preview import serve

        serve(args.page, args.port)
        return
    if args.cmd in (None, "build"):
        if args.cmd is None:
            args = b.parse_args([])
        sys.exit(build(args))
