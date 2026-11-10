


## outline
We investigate when small open-weight LLMs (Qwen, Ministral, Llama, about 2 to 3B) refuse harmful requests, first as black boxes by mapping refusal rates across request categories and framings like fairy tales, hypotheticals or foreign languages in a heatmap. Then we open the models up, find the layer where the single refusal direction sits, and visualize what happens when we remove, mirror or scale it, including over-refusal and whether reasoning models behave differently.

Paper: https://proceedings.neurips.cc/paper_files/paper/2024/file/f545448535dfde4f9786555403ab7c49-Paper-Conference.pdf

Example Data: https://raw.githubusercontent.com/llm-attacks/llm-attacks/main/data/advbench/harmful_behaviors.csv

## todos:
blackbox: 
- set up github repo
- select model from huggingface
- find 'abliterated' version
- find dataset/benchmark of harmful prompts
- find model to do classification of outputs (was this a refusal? yes/no), inputs (what kind of request was this? category: )

## environment:
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

## scrollytelling page
A visual essay on the baseline vs. ablated Qwen3-4B responses, built by `scrolly_pipeline/` into a single self-contained HTML file. It shows only aggregates and stylized examples, and a build-time leak check fails if the page shares any 8-word run with a prompt or model answer.

Final version: `output/scrolly/v05/index.html` (iteration notes in `output/scrolly/ITERATIONS.md`).

To rebuild (needs `responses.7z` extracted into `responses/`):
```
uv sync --group viz            # add --extra mac on Mac
uv run --group viz python -m scrolly_pipeline build
```
Each build goes to the next `output/scrolly/vNN/`, with screenshots and QA reports in `vNN/shots/` (not committed).
