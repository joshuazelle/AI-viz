# Vis4AI — Refusal Behavior and Refusal-Direction Ablation

**Read the visual essay [here](https://joshuazelle.github.io/AI-viz/)**

## Overview

This project investigates how a language model's responses to safety-sensitive prompts change when a refusal-related direction is ablated. It is motivated by [*Refusal in Language Models Is Mediated by a Single Direction* (Arditi et al., NeurIPS 2024)](https://proceedings.neurips.cc/paper_files/paper/2024/file/f545448535dfde4f9786555403ab7c49-Paper-Conference.pdf).

We compare two conditions of a Qwen3.5-4B language model:

- **Baseline:** The original model without the intervention.
- **Ablation:** The model after removal of a refusal-related direction.

In Phase I, we analyze the response-generating model as a black box. We compare the original prompts, generated responses, and external evaluations rather than inspecting the model's internal activations. Although the ablated responses come from an internal model intervention, this phase focuses on observable behavior.

## Dataset and experimental setup

The dataset contains 1,000 distinct prompts across 10 request categories. Each prompt is evaluated under both model conditions, yielding 2,000 paired responses. The prompts include direct requests and modified framings, such as authority claims, obfuscation, and prefix injection. The dataset records the original benchmark source, category, subcategory, severity, and attack style where available.

### Prompt sources

The 1,000 prompts were drawn from nine safety and refusal benchmarks. The counts below reflect the prompts included in this experiment, not the full size of each original benchmark.

| Benchmark | Prompts used | Source |
| --- | ---: | --- |
| Do-Not-Answer | 263 | [Dataset](https://huggingface.co/datasets/LibrAI/do-not-answer) |
| AILuminate | 236 | [MLCommons dataset/repository](https://github.com/mlcommons/ailuminate) |
| AdvBench | 149 | [Harmful behaviors CSV](https://raw.githubusercontent.com/llm-attacks/llm-attacks/main/data/advbench/harmful_behaviors.csv) |
| CatQA | 100 | [Dataset and paper repository](https://github.com/declare-lab/resta) |
| HarmBench | 71 | [Benchmark repository](https://github.com/centerforaisafety/HarmBench) |
| XSTest | 65 | [Benchmark repository](https://github.com/paul-rottger/xstest) |
| StrongREJECT | 47 | [Benchmark repository](https://github.com/dsbowen/strong_reject) |
| JailbreakBench | 36 | [Benchmark repository](https://github.com/JailbreakBench/jailbreakbench) |
| SimpleSafetyTests | 33 | [Benchmark repository](https://github.com/bertiev/SimpleSafetyTests) |
| Total | 1,000 | |

The benchmark prompts have been grouped into a common set of categories and sometimes modified with additional framing. Consequently, the recorded category and prompting style may differ from the original benchmark's own taxonomy.

## Models and tools

| Component | Model / tool | Purpose |
| --- | --- | --- |
| Response generation | [Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) | Generate paired baseline and refusal-direction-ablated responses |
| Structured response moderation | [Qwen3Guard-Gen-4B](https://huggingface.co/Qwen/Qwen3Guard-Gen-4B) | Classify refusal and response safety |

## Environment:
We use [uv](https://docs.astral.sh/uv/) to manage Python and dependencies. Everything is pinned in `uv.lock`, so we all get the same versions.
if you need to install:
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```
then:
```
uv sync                # Windows/Linux
uv sync --extra mac    # Mac, includes mlx-lm
```

## Scrollytelling page
A visual essay on the baseline vs. ablated Qwen3.5-4B responses, built by `scrolly_pipeline/` into a single self-contained HTML file. It shows only aggregates and stylized examples, and a build-time leak check fails if the page shares any 8-word run with a prompt or model answer.

Final version: `output/scrolly/v06/index.html`, live at https://joshuazelle.github.io/AI-viz/ (deployed by `.github/workflows/pages.yml`; iteration notes in `output/scrolly/ITERATIONS.md`).

To rebuild (needs `responses.7z` extracted into `responses/`):
```
uv sync --group viz            # add --extra mac on Mac
uv run --group viz python -m scrolly_pipeline build
```
Each build goes to the next `output/scrolly/vNN/`, with screenshots and QA reports in `vNN/shots/` (not committed).

### Local uncertainty explorer

The review build `output/scrolly/v07/index.html` adds **Between yes and no** after
**Two judges, two stories**. Original chapters and numbering are preserved.
GitHub Pages remains pinned to v06; this change does not deploy v07.

Optionally open `qwen3guard_fresh_refusal.jsonl` in the explorer. Files are read in
browser memory only, with no upload or persistence. Without a file the original
essay works, and the explorer shows an empty state. Never commit raw responses.

The scatterplot uses baseline probability on X and ablated probability on Y. The
outer ring represents baseline outcome; the inner fill represents ablated outcome.
Selection links both histogram markers and the inspector. Histogram bins filter
the uncertainty table. Filters and overlapping-point inspection are preserved.

Refusal uses `p_refusal_yes > 0.5`; exactly 0.5 is No refusal. Outcome colors use
fresh generated labels: Unsafe takes precedence, then Refusal Yes, then Safe or
Controversial. Conditional label probability does not measure accuracy.

JSONL, JSON arrays, and CSV are supported, including partial checkpoints. Fields:
`id`, `variant` (baseline, ablation, or ablated), `p_refusal_yes` in [0, 1], and
optional `status` (absent or ok for valid scores). Outcome labels come from
`refusal_label_generated` / `qwen3guard_refusal` and `safety` / `qwen3guard_safety`.
Optional metadata: `category`, `prompt`, `response`, `score_method`. Complete
scored pairs enter the scatterplot; singles remain in the distributions and table.
Duplicate ID/variant records use the last entry. Invalid JSONL lines are reported.

The regular build runs synthetic explorer QA unless `--no-shots` is specified.
To also check a completed local export (2,000 scored records, 1,000 pairs):

```sh
uv run --group viz python -m scrolly_pipeline.qa.uncertainty output/scrolly/v07/index.html --scores /path/to/qwen3guard_fresh_refusal.jsonl
```

Omit `--scores` for synthetic checks only. QA checks boundary probabilities, glyph
colors, linked selection, filters, malformed records, escaping, mobile layout, and
absence of network requests or persistence. Screenshots use synthetic text only.
The existing eight-word build-time leak check remains unchanged.
