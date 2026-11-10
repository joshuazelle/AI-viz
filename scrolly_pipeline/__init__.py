"""Build the "Deleting No" scrollytelling page from the refusal-direction experiment.

The pipeline reads the paired baseline / ablation evaluations in ``responses/``,
reduces them to aggregates (no model text ever leaves this package), renders a
single self-contained HTML page and runs QA on it (leak check, screenshots).

Run ``python -m scrolly_pipeline --help`` for the CLI.
"""

__version__ = "0.1.0"
