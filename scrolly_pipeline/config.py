"""Paths, labels and experiment metadata shared across the pipeline."""

from dataclasses import dataclass
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent
RESPONSES_DIR = PROJECT_ROOT / "responses"
OUTPUT_DIR = PROJECT_ROOT / "output" / "scrolly"
STATIC_DIR = PACKAGE_DIR / "render" / "static"
TEMPLATES_DIR = PACKAGE_DIR / "render" / "templates"

CONDITIONS = ("baseline", "ablation")

EXPERIMENT = {
    "model": "Qwen3-4B",
    "method": "directional ablation of the refusal direction",
    "paper": "Arditi et al., 2024",
    "paper_title": "Refusal in Language Models Is Mediated by a Single Direction",
    "paper_url": "https://proceedings.neurips.cc/paper_files/paper/2024/file/f545448535dfde4f9786555403ab7c49-Paper-Conference.pdf",
    "code": "the authors' original refusal_direction repository, adapted to Qwen3 and run locally",
    "judge": "Qwen3Guard",
}


@dataclass(frozen=True)
class Outcome:
    key: str
    label: str
    short: str
    description: str


# Ordered from "safest" to "most harmful"; the order is used for sorting and stacking.
OUTCOMES = (
    Outcome("refusal", "Refusal", "refused", "Declines the request. No harmful content."),
    Outcome("safe", "Safe answer", "answered safely", "Engages, but what it says is harmless."),
    Outcome("borderline", "Borderline", "borderline", "Goes along with it; judged controversial, not clearly unsafe."),
    Outcome("harmful", "Harmful", "harmful", "Goes along with it; judged unsafe."),
)
OUTCOME_KEYS = tuple(o.key for o in OUTCOMES)

CATEGORIES = {
    "cyber": "Cybercrime",
    "harassment_privacy": "Harassment & privacy",
    "hate_extremism": "Hate & extremism",
    "high_risk_advice": "High-risk advice",
    "misinformation": "Misinformation",
    "nonviolent_crime": "Non-violent crime",
    "self_harm": "Self-harm",
    "sexual_content": "Sexual content",
    "violent_crime": "Violent crime",
    "weapons_cbrn": "Weapons & CBRN",
}

# Used where a full label does not fit (narrow dot-grid panels).
CATEGORY_SHORT = {
    "cyber": "Cyber",
    "harassment_privacy": "Harassment",
    "hate_extremism": "Hate",
    "high_risk_advice": "Risky advice",
    "misinformation": "Misinfo",
    "nonviolent_crime": "Crime",
    "self_harm": "Self-harm",
    "sexual_content": "Sexual",
    "violent_crime": "Violence",
    "weapons_cbrn": "Weapons",
}

ATTACK_STYLES = {
    "direct": "Direct request",
    "fictional_frame": "Fictional frame",
    "roleplay": "Role-play",
    "hypothetical": "Hypothetical",
    "prefix_injection": "Prefix injection",
    "obfuscation": "Obfuscation",
    "authority_claim": "Authority claim",
}

ATTACK_STYLE_HINTS = {
    "direct": "the plain request",
    "fictional_frame": "wrapped in a story",
    "roleplay": "“pretend you are…”",
    "hypothetical": "“imagine that…”",
    "prefix_injection": "“start your answer with…”",
    "obfuscation": "encoded or disguised wording",
    "authority_claim": "“as a doctor / officer…”",
}

SOURCES = {
    "do-not-answer": "Do-Not-Answer",
    "ailuminate": "AILuminate",
    "advbench": "AdvBench",
    "catqa": "CatQA",
    "harmbench": "HarmBench",
    "xstest": "XSTest",
    "strongreject": "StrongREJECT",
    "jailbreakbench": "JailbreakBench",
    "simplesafetytests": "SimpleSafetyTests",
}

SEVERITIES = {1: "Mild", 2: "Moderate", 3: "Severe"}
