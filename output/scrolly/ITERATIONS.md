# Scrollytelling page: iteration log

Each `vNN/` folder holds `index.html` (self-contained page), `figures.json` (the aggregated
data embedded in it), `leakcheck.json` and `shots/` (headless-Chrome screenshots of every
scroll step and figure, desktop 1440×900 and mobile 390×844, light and dark, plus `report.json`
with console errors and layout checks). `latest.html` is a copy of the newest build.

Rebuild: `uv run --group viz python -m scrolly_pipeline build` (from the repo root).

## v01: first full build

Pipeline: load → aggregate → render → leak check → screenshots. No console errors, no horizontal
overflow at 1440 or 390 px. The leak check initially failed for two reasons, neither of them a real leak:
the stylized "harmful" example shared the stock phrase "here is a step by step guide to" with 15
ablated answers, and the page's own HTML/CSS boilerplate matched answers that contain HTML code.
Fixed by rewording the example and scanning only published content (visible text, attributes,
embedded data, our scripts), not the page skeleton, CSS or vendored D3.

Critique from the screenshots:
- Hero: 6.5% shown as "6%" and 62.5% as "62%" (Python rounds half to even). Misleading for headline numbers.
- Sticky graphics are stretched to full viewport height while their content is width-limited:
  big empty bands above/below the dot grid and the explainer sketch. Last step pushes the
  graphic up before it resolves (title slides under the top bar).
- Explainer: the sketch is small in its panel; ablation trails turn the plot grey.
- Alluvial: "100" and "607" ribbon labels collide where ribbons cross in the middle.
- Heatmap: faded small-n cells don't say how small; on mobile, row labels clip at the left edge.
- Framing: 7/800 shows as "1%"; small rates need a decimal.
- Openings: legend mislabels the grey swatch ("‹word›" vs "other"); first words lower-case ("i").
- Markers: long hints collide with the left value labels.
- Lengths: "62% stop mid-sentence" floats in a corner, the chart doesn't show *which* answers
  were cut off; median label overlaps the tallest bar.
- Mobile: table button and empty space waste the pinned 60vh; step cards slide under the graphic.
- Copy: section 8 says ablation "turns refusals into 84 safe answers", but 84 is the total after ablation.

## v02: layout and chart fixes from the v01 critique

- Hero rates with one decimal and half-up rounding (86.2% → 6.5%, 2.1% → 62.5%).
- Pinned graphics now size to their content and sit vertically centred; more room after the last step,
  so the graphic stays pinned until the last step has resolved.
- Explainer zoomed in, ablation trails fainter. Alluvial ribbon labels moved to the source side.
- Heatmap prints n in small-n cells; short row labels on mobile.
- Framing: small rates get a decimal (0.9%, not 1%). Markers: hints on their own line.
- Openings: legend corrected, first words capitalised. Lengths: each bar split into complete
  answers and answers that stop mid-sentence, so the generation-limit pile-up is visible as such.
- Mobile: table button hidden inside pinned graphics, steps activate below the graphic.

## v03: hero graphic and copy pass

- Hero gets two segmented bars (all 1,000 requests before/after): the outcome colours are introduced
  before the reader needs them. Segmented-bar code shared with chapter 8 (`charts/stacked.js`).
- Copy corrected where it overstated the data: framings do *not* "stop mattering" after ablation
  (40–85%, ranking reshuffles); hedged two interpretive sentences; chapter 8 counts made exact.
- OG meta tags for sharing. Mobile alluvial shows bare counts; heatmap ramp legend no longer wraps.

## v04: interaction QA

- New `qa/interactions.py`: hovers a mark in every chart, opens every table view, toggles the theme.
- Found and fixed: a table opened inside a pinned scrolly graphic overflowed its frame and could not be
  closed. Pinned graphics now open their table in a modal `<dialog>`. Also fixed: the mobile hero had no side gutter.

## v05: tooltip bug

- Found via event tracing: scrolling with the pointer resting on a chart hid the tooltip, and it never came
  back until the pointer left the mark (no new `pointerenter`). Tooltips now re-open on the next pointer move.
- Final QA: 0 console errors in all four viewport/theme combinations, no horizontal overflow at 1440 and
  390 px, every chart renders, every tooltip shows, every table view has rows, theme toggle works,
  leak check passes on all 3,000 prompts and answers.

## v06: model name

- The model is Qwen3.5-4B, not Qwen3-4B: corrected in the page copy, the meta description and the methods
  section (the judge, Qwen3Guard, is unchanged). Same QA as v05, all checks pass.
- "How answers begin" no longer masks words outside a function-word whitelist as ‹word›. Real words are
  shown, and detail is limited by frequency instead: at most eight boxes per branch, each at least 2% of
  answers, the rest folded into "other". Panels made taller so 3–4% boxes get labels. A `BLOCKLIST`
  in `textfeatures/masking.py` can still hide specific words (currently empty).
