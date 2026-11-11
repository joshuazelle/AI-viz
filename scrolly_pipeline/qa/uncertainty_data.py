"""Protect the public score export against accidental disclosure."""

import json
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from ..data.uncertainty import chart_records, load_scores
from .leakcheck import leak_check


class PublicScoresChecks(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "scores.jsonl"
        self.paired = pd.DataFrame([{"id": "PRIVATE_ID", "category": "cyber"}])
        self.rows = [{"id": "PRIVATE_ID", "category": "cyber", "variant": variant,
                      "p_refusal_yes": 0.5, "refusal_label_generated": "Yes", "safety": "Unsafe",
                      "prompt": "private prompt sentinel alpha beta gamma delta epsilon",
                      "response": "private response sentinel zeta eta theta iota kappa",
                      "input_sha": "PRIVATE_HASH", "qwen3guard_raw_fresh": "PRIVATE_JUDGE"}
                     for variant in ("baseline", "ablation")]

    def load(self):
        self.path.write_text("\n".join(json.dumps(row) for row in self.rows))
        return load_scores(self.path, self.paired)

    def test_allowlist_and_leak_check(self):
        records, texts = self.load()
        public = chart_records(records)
        self.assertEqual(len(public), 2)
        for record in public:
            self.assertEqual(set(record), {"id", "category", "variant", "p_refusal_yes", "refusal_label_generated", "safety"})
            self.assertEqual(record["id"], "pair-0001")
            self.assertEqual(record["p_refusal_yes"], 0.5)
        self.assertNotIn("PRIVATE", json.dumps(public))
        self.assertTrue(leak_check(json.dumps(public), texts)["ok"])
        self.assertFalse(leak_check(self.rows[0]["prompt"], texts)["ok"])

    def test_invalid_probabilities(self):
        for value in (True, None, "", " ", -0.01, 1.01, float("nan"), float("inf")):
            self.rows[0]["p_refusal_yes"] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.load()

    def test_duplicate_and_incomplete_pairs(self):
        original = list(self.rows)
        for rows in (original[:1], original + original[:1], [{**original[0], "category": "self_harm"}, original[1]]):
            self.rows = rows
            with self.assertRaises(ValueError):
                self.load()

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            load_scores(self.path, self.paired)


if __name__ == "__main__":
    unittest.main()
