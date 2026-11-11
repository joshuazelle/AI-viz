"""Check local imports, linked views, threshold boundaries, and privacy in Chrome."""

import argparse
import json
import shutil
import tempfile
from contextlib import contextmanager
from threading import Thread
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from ..preview import make_server


@contextmanager
def local_preview(page, scores):
    with make_server(page, scores, 0) as server:
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}/"
        finally:
            server.shutdown()
            worker.join()


def check(html_path: Path, out_dir: Path, scores: Path | None = None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    fixture = []
    for index, probability in enumerate((0, 0.35, 0.5, 0.65, 1)):
        for variant in ("baseline", "ablation"):
            fixture.append({
                "id": f"fixture-{index}", "variant": variant,
                "category": "fixture", "p_refusal_yes": probability,
                "refusal_label_generated": "Yes" if variant == "baseline" else "No",
                "safety": "Safe" if variant == "baseline" else "Unsafe",
                "prompt": "PRIVATE_SENTINEL <img src=x onerror=alert(1)>",
                "response": "PRIVATE_SENTINEL", "status": "ok",
            })
    invalid = [None, {**fixture[0], "id": "boolean", "p_refusal_yes": True},
               {**fixture[0], "id": "blank", "p_refusal_yes": " "},
               {**fixture[0], "id": "range", "p_refusal_yes": 1.1}]
    errors, requests = [], []
    with tempfile.TemporaryDirectory() as directory, sync_playwright() as playwright:
        local_scores = Path(directory) / 'qwen3guard_refusals.jsonl'
        with local_preview(html_path, local_scores) as preview_url:
            return check_browser(playwright, html_path, out_dir, scores, local_scores, preview_url, fixture, invalid, errors, requests)


def check_browser(playwright, html_path, out_dir, scores, local_scores, preview_url, fixture, invalid, errors, requests):
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url)
                if request.url.startswith(("http:", "https:")) else None)
        page.goto(html_path.resolve().as_uri())
        expect(page.locator("#probability-lab")).to_have_count(1)
        expect(page.locator(".pl-pairmark")).to_have_count(0)
        storage = page.evaluate("JSON.stringify(localStorage)")
        expect(page.locator('input[type="file"]')).to_have_count(0)
        expect(page.locator("#pl-status")).to_contain_text("qwen3guard_refusals.jsonl")
        page.goto(preview_url)
        expect(page.locator(".pl-pairmark")).to_have_count(0)
        expect(page.locator("#pl-status")).to_contain_text("To view these plots")
        local_scores.write_text("\n".join(json.dumps(row) for row in fixture + invalid))
        page.reload()
        expect(page.locator("#pl-status")).to_contain_text("10 scored responses, 5 complete pairs")
        expect(page.locator(".pl-pairmark")).to_have_count(5)
        expect(page.locator("#pl-kpis .pl-kpi").last.locator("b")).to_have_text("6")
        glyph = page.locator(".pl-pairmark").nth(2)
        glyph.press("Enter")
        expect(page.locator("#pl-judge-base")).to_contain_text("50% tie → No refusal")
        expect(page.locator("#pl-judge-abl")).to_contain_text("50% tie → No refusal")
        expect(page.locator(".pl-selection-marker")).to_have_count(2)
        assert glyph.locator("circle").nth(0).get_attribute("fill") == "var(--o-refusal)"
        assert glyph.locator("circle").nth(1).get_attribute("fill") == "var(--o-harmful)"
        expect(page.locator("#pl-prompt img")).to_have_count(0)
        page.locator(".pl-bin-hit").first.press("Enter")
        expect(page.locator("#pl-clear-bin")).to_be_visible()
        expect(page.locator("#pl-uncertain-table tr")).to_have_count(1)
        page.locator("#pl-clear-bin").click()
        expect(page.locator("#pl-uncertain-table tr")).to_have_count(10)
        page.select_option("#pl-focus", "uncertain")
        expect(page.locator(".pl-pairmark")).to_have_count(3)
        page.select_option("#pl-focus", "all")
        page.select_option("#pl-outcome", "harmful")
        expect(page.locator(".pl-pairmark")).to_have_count(5)
        page.select_option("#pl-outcome-side", "baseline")
        expect(page.locator(".pl-pairmark")).to_have_count(0)
        page.select_option("#pl-outcome", "all")
        page.select_option("#pl-transition", "refusal|harmful")
        expect(page.locator(".pl-pairmark")).to_have_count(5)
        assert page.evaluate("JSON.stringify(localStorage)") == storage
        for width, scheme in ((1440, "light"), (390, "light"), (390, "dark")):
            page.set_viewport_size({"width": width, "height": 900})
            page.emulate_media(color_scheme=scheme)
            page.locator("#probability-lab").scroll_into_view_if_needed()
            page.wait_for_function("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=str(out_dir / f"uncertainty-{width}-{scheme}.png"))
        local_scores.unlink()
        page.reload()
        expect(page.locator(".pl-pairmark")).to_have_count(0)
        assert "PRIVATE_SENTINEL" not in page.content()
        result = {"synthetic_checks": "passed", "real_scores": None}
        if scores:
            shutil.copyfile(scores, local_scores)
            page.reload()
            expect(page.locator("#pl-status")).to_contain_text("2000 scored responses, 1000 complete pairs")
            expect(page.locator(".pl-pairmark")).to_have_count(1000)
            result["real_scores"] = {"scored": 2000, "pairs": 1000}
        assert not errors, errors
        assert all(url in (preview_url, preview_url + "qwen3guard_refusals.jsonl") for url in requests), "Unexpected network request"
        result.update(page_errors=errors, external_requests=[])
        browser.close()
        (out_dir / "uncertainty.json").write_text(json.dumps(result, indent=2))
        return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("page", type=Path)
    parser.add_argument("--scores", type=Path)
    args = parser.parse_args()
    print(json.dumps(check(args.page, args.page.parent / "shots", args.scores), indent=2))
