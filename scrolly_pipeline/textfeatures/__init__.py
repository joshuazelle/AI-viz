"""Text-derived features that are safe to publish.

Everything here reads model responses but returns only counts, shares or tokens
from a fixed whitelist of function words. Content words never leave this package.
"""

from .markers import MARKERS, marker_shares
from .openings import opening_tree

__all__ = ["MARKERS", "marker_shares", "opening_tree"]
