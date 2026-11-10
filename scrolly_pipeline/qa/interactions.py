"""Exercise the interactive layer: tooltips on hover, table views, the theme toggle."""

import json
from pathlib import Path

# chart -> CSS selector of a mark worth hovering
HOVER_TARGETS = {
    "overview": "rect",
    "alluvial": "path[data-mark]",
    "heatmap": "g.cell",
    "framing": "rect.hit",
    "judges": "rect.hit",
    "openings": "g.node",
    "markers": "rect.hit",
    "lengths": "rect.hit",
    "stacked": "rect",
}


def check(html_path: Path, out_dir: Path) -> dict:
    from playwright.sync_api import sync_playwright

    out_dir.mkdir(parents=True, exist_ok=True)
    results = {"tooltips": {}, "tables": {}, "theme": None, "waffle_hover": None}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900}, color_scheme="light")
        page.goto(html_path.resolve().as_uri())
        page.add_style_tag(content=".topbar { position: static !important; }")
        page.wait_for_timeout(500)

        for chart, selector in HOVER_TARGETS.items():
            fig = page.locator(f'[data-chart="{chart}"]')
            marks = fig.locator(f".chart svg {selector}")
            if marks.count() == 0:
                results["tooltips"][chart] = "no marks"
                continue
            mark = marks.nth(min(1, marks.count() - 1))
            mark.scroll_into_view_if_needed()
            page.wait_for_timeout(250)  # the page hides tooltips on scroll; let it settle
            # plain mouse moves, like a reader: locator.hover() may scroll again, which hides the tooltip
            box = mark.bounding_box()
            cx, cy = box["x"] + min(box["width"] / 2, 300), box["y"] + box["height"] / 2
            page.mouse.move(cx - 2, cy)
            page.mouse.move(cx, cy)
            page.wait_for_timeout(150)
            tip = page.locator("#tooltip")
            visible = tip.is_visible()
            results["tooltips"][chart] = tip.inner_text().replace("\n", " | ") if visible else "NOT SHOWN"
            if visible:
                fig.screenshot(path=str(out_dir / f"hover-{chart}.png"))

        # the dot grid uses one hit layer: hover the middle of the first panel
        waffle = page.locator('[data-chart="waffle"] .chart svg')
        waffle.scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        box = waffle.bounding_box()
        page.mouse.move(box["x"] + 40, box["y"] + 60)
        page.wait_for_timeout(150)
        results["waffle_hover"] = page.locator("#tooltip").inner_text().replace("\n", " | ") if page.locator("#tooltip").is_visible() else "NOT SHOWN"

        for fig in page.locator("[data-chart]").all():
            name = fig.get_attribute("data-chart")
            button = fig.locator(".table-toggle")
            if button.count() == 0:
                continue
            button.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            button.click()
            page.wait_for_timeout(150)
            dialog = page.locator("#table-dialog")
            if dialog.evaluate("d => d.open"):
                results["tables"][name] = dialog.locator("tbody tr").count()
                if name == "waffle":
                    page.screenshot(path=str(out_dir / "table-dialog-waffle.png"))
                page.keyboard.press("Escape")
                page.wait_for_timeout(100)
                continue
            results["tables"][name] = fig.locator(".table-view tbody tr").count()
            if name == "heatmap":
                fig.screenshot(path=str(out_dir / "table-heatmap.png"))
            button.click()

        page.locator(".theme-toggle").click()
        page.wait_for_timeout(300)
        results["theme"] = {
            "data-theme": page.evaluate("document.documentElement.dataset.theme"),
            "page-bg": page.evaluate("getComputedStyle(document.body).backgroundColor"),
        }
        browser.close()
    (out_dir / "interactions.json").write_text(json.dumps(results, indent=2))
    return results
