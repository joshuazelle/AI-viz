"""Turn the paired DataFrame into the JSON the page is built from."""

import pandas as pd

from . import breakdowns, dataset, facts, judges, outcomes, voice

# name -> builder. Every builder returns plain JSON-serialisable data.
FIGURES = {
    "dataset": dataset.compute,
    "counts": outcomes.counts,
    "flows": outcomes.flows,
    "units": outcomes.units,
    "heatmap": breakdowns.heatmap,
    "severity": breakdowns.severity,
    "framing": breakdowns.framing,
    "safe_complete": breakdowns.safe_complete,
    "persistent": breakdowns.persistent,
    "judges": judges.compute,
    "openings": voice.openings,
    "markers": voice.markers,
    "lengths": voice.lengths,
}


def compute_all(df: pd.DataFrame) -> tuple[dict, dict]:
    """Return ``(figure_data, facts)``."""
    fig = {name: build(df) for name, build in FIGURES.items()}
    return fig, facts.compute(fig)
