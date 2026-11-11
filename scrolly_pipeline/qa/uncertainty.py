"""Check the standalone anonymous explorer without a server or private file."""

import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def check(html_path: Path, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    html = html_path.read_text()
    pattern = r'(<script id="viz-data"[^>]*>)(.*?)(</script>)'
    data = json.loads(re.search(pattern, html, re.S)[2])
    expected_fields = {"id", "variant", "category", "p_refusal_yes", "refusal_label_generated", "safety"}
    records = data["uncertainty"]
    assert records and all(set(record) == expected_fields for record in records)
    assert all(re.fullmatch(r"pair-\d{4,}", record["id"]) for record in records)
    count = len(records)
    fixture = []
    for index, probability in enumerate((0, 0.35, 0.5, 0.65, 1), 1):
        for variant in ("baseline", "ablation"):
            fixture.append({
                "id": f"pair-{index:04d}", "variant": variant, "category": "cyber",
                "p_refusal_yes": probability,
                "refusal_label_generated": "Yes" if variant == "baseline" else "No",
                "safety": "Safe" if variant == "baseline" else "Unsafe",
            })
    data["uncertainty"] = fixture
    fixture_path = out_dir / "uncertainty-fixture.html"
    fixture_path.write_text(re.sub(pattern, lambda match: match[1] + json.dumps(data) + match[3], html, flags=re.S))
    errors, requests = [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url)
                if request.url.startswith(("http:", "https:")) else None)
        page.goto(html_path.resolve().as_uri())
        expect(page.locator(".pl-pairmark")).to_have_count(count // 2)
        expect(page.locator("#probability-lab")).to_be_visible()
        expect(page.locator('input[type="file"], #pl-prompt, #pl-text-base, #pl-text-abl')).to_have_count(0)
        page.goto(fixture_path.resolve().as_uri())
        expect(page.locator(".pl-pairmark")).to_have_count(5)
        expect(page.locator("#pl-kpis .pl-kpi").last.locator("b")).to_have_text("6")
        glyph = page.locator(".pl-pairmark").nth(2)
        glyph.press("Enter")
        expect(page.locator("#pl-judge-base")).to_contain_text("50% tie → No refusal")
        expect(page.locator(".pl-selection-marker")).to_have_count(2)
        assert glyph.locator("circle").nth(0).get_attribute("fill") == "var(--o-refusal)"
        assert glyph.locator("circle").nth(1).get_attribute("fill") == "var(--o-harmful)"
        page.locator(".pl-bin-hit").first.press("Enter")
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
        for width, scheme in ((1440, "light"), (390, "light"), (390, "dark")):
            page.set_viewport_size({"width": width, "height": 900})
            page.emulate_media(color_scheme=scheme)
            page.locator("#probability-lab").scroll_into_view_if_needed()
            page.wait_for_function("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=str(out_dir / f"uncertainty-{width}-{scheme}.png"))
        page.reload()
        expect(page.locator(".pl-pairmark")).to_have_count(5)
        assert not errors, errors
        assert not requests, "Standalone public explorer must not request private data"
        browser.close()
    result = {"synthetic_checks": "passed", "public_scores": count, "public_pairs": count // 2,
              "page_errors": errors, "network_requests": requests}
    (out_dir / "uncertainty.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("page", type=Path)
    args = parser.parse_args()
    print(json.dumps(check(args.page, args.page.parent / "shots"), indent=2))
