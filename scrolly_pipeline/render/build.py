"""Render the single self-contained HTML page (CSS, JS, D3 and data inlined)."""

import datetime as dt
import json
import urllib.request
from decimal import ROUND_HALF_UP, Decimal

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from markupsafe import Markup

from .. import __version__
from ..config import EXPERIMENT, STATIC_DIR, TEMPLATES_DIR
from ..content import STYLIZED_PROMPT, page_meta, stylized_examples

D3_VERSION = "7.9.0"
D3_URL = f"https://cdn.jsdelivr.net/npm/d3@{D3_VERSION}/dist/d3.min.js"
D3_PATH = STATIC_DIR / "vendor" / f"d3-{D3_VERSION}.min.js"

CSS_FILES = ["tokens.css", "base.css", "scrolly.css", "charts.css", "uncertainty.css"]
# Order matters: core helpers first, then chart modules, then the boot script.
JS_FILES = [
    "core/util.js",
    "core/theme.js",
    "core/tooltip.js",
    "core/table.js",
    "core/scroller.js",
    "core/legend.js",
    "charts/explainer.js",
    "charts/waffle.js",
    "charts/alluvial.js",
    "charts/heatmap.js",
    "charts/framing.js",
    "charts/dumbbell.js",
    "charts/openings.js",
    "charts/lengths.js",
    "charts/stacked.js",
    "main.js",
    "charts/uncertainty.js",
]

DESCRIPTION = (
    "A visual essay: removing the refusal direction from Qwen3.5-4B and asking it 1,000 harmful requests again. "
    "No model outputs are shown."
)


def d3_source() -> str:
    """D3 is vendored next to the package on first use so later builds work offline."""
    if not D3_PATH.exists():
        D3_PATH.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(D3_URL, timeout=30) as resp:
            D3_PATH.write_bytes(resp.read())
    return D3_PATH.read_text()


def _concat(folder: str, names: list[str]) -> str:
    return "\n".join(f"/* {n} */\n" + (STATIC_DIR / folder / n).read_text() for n in names)


def _pct(x: float, digits: int = 0) -> str:
    """Round half up (Python's round() would turn 6.5% into "6%")."""
    q = Decimal(1).scaleb(-digits)
    value = (Decimal(str(x)) * 100).quantize(q, rounding=ROUND_HALF_UP)
    return f"{value}%"


def _env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "j2"]),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["pct"] = _pct
    env.filters["num"] = lambda x: f"{int(x):,}"
    return env


def _json_for_script(obj) -> Markup:
    # "</" would close the <script> element early
    return Markup(json.dumps(obj, separators=(",", ":")).replace("</", "<\\/"))


def render_page(fig: dict, facts: dict) -> str:
    data = {**fig, "meta": page_meta(fig["dataset"])}
    context = {
        "exp": EXPERIMENT,
        "f": facts,
        "dataset": fig["dataset"],
        "examples": stylized_examples(),
        "stylized_prompt": STYLIZED_PROMPT,
        "description": DESCRIPTION,
        "version": __version__,
        "built": dt.date.today().isoformat(),
        "css": Markup(_concat("css", CSS_FILES)),
        "js": Markup(_concat("js", JS_FILES)),
        "d3": Markup(d3_source()),
        "data_json": _json_for_script(data),
    }
    return _env().get_template("page.html.j2").render(**context)
