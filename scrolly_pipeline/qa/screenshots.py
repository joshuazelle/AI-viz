"""Drive the built page in headless Chrome: screenshot every scroll step and figure,
collect console errors and layout problems (horizontal overflow, empty charts)."""

import json
from pathlib import Path

VIEWPORTS = {
    # anchor: which point of the step is placed on the trigger line
    "desktop": {"width": 1440, "height": 900, "trigger": 0.5, "anchor": 0.5},
    "mobile": {"width": 390, "height": 844, "trigger": 0.63, "anchor": 0.0},
}


def _scroll_step_to_trigger(page, index: int, trigger: float, anchor: float) -> None:
    page.evaluate(
        """([i, trigger, anchor]) => {
            const el = document.querySelectorAll('.step')[i];
            const r = el.getBoundingClientRect();
            window.scrollTo(0, window.scrollY + r.top + r.height * anchor - window.innerHeight * trigger);
        }""",
        [index, trigger, anchor],
    )


def _layout_report(page) -> dict:
    return page.evaluate(
        """() => {
            const doc = document.documentElement;
            const figs = [...document.querySelectorAll('[data-chart]')].map(f => {
                const svg = f.querySelector('.chart svg');
                const b = svg ? svg.getBoundingClientRect() : null;
                return {chart: f.dataset.chart, svg: !!svg, width: b ? Math.round(b.width) : 0,
                        height: b ? Math.round(b.height) : 0, marks: svg ? svg.querySelectorAll('*').length : 0};
            });
            const wide = [...document.querySelectorAll('body *')]
                .filter(e => e.getBoundingClientRect().right > doc.clientWidth + 1 && !e.closest('.table-view'))
                .slice(0, 8).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.'));
            return {scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflowing: wide, figures: figs};
        }"""
    )


def capture(html_path: Path, out_dir: Path, schemes=("light", "dark"), viewports=("desktop", "mobile")) -> dict:
    from playwright.sync_api import sync_playwright

    out_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        for vp_name in viewports:
            vp = VIEWPORTS[vp_name]
            for scheme in schemes:
                tag = f"{vp_name}-{scheme}"
                ctx = browser.new_context(
                    viewport={"width": vp["width"], "height": vp["height"]},
                    device_scale_factor=2 if vp_name == "mobile" else 1,
                    color_scheme=scheme,
                )
                page = ctx.new_page()
                errors = []
                page.on("console", lambda m, errors=errors: m.type in ("error", "warning") and errors.append(f"{m.type}: {m.text}"))
                page.on("pageerror", lambda e, errors=errors: errors.append(f"pageerror: {e}"))
                page.goto(html_path.resolve().as_uri())
                page.wait_for_timeout(600)

                page.screenshot(path=str(out_dir / f"{tag}-00-hero.png"))
                steps = page.locator(".step").count()
                for i in range(steps):
                    _scroll_step_to_trigger(page, i, vp["trigger"], vp["anchor"])
                    page.wait_for_timeout(1500)
                    page.screenshot(path=str(out_dir / f"{tag}-step{i:02d}.png"))

                # the sticky top bar would otherwise cover the top of element screenshots
                page.add_style_tag(content=".topbar { position: static !important; }")
                for chart in page.eval_on_selector_all("[data-chart]", "els => els.map(e => e.dataset.chart)"):
                    fig = page.locator(f'[data-chart="{chart}"]')
                    if fig.evaluate("e => !!e.closest('.scrolly')"):
                        continue
                    fig.scroll_into_view_if_needed()
                    page.wait_for_timeout(250)
                    fig.screenshot(path=str(out_dir / f"{tag}-fig-{chart}.png"))

                report[tag] = {"errors": errors, "steps": steps, **_layout_report(page)}
                ctx.close()
        browser.close()
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))
    return report
