"""
Unit tests for Calibration and Decision Fusion Modules
"""

import unittest
import numpy as np
import torch

from src.calibration import compute_ece, TemperatureScaler
from src.decision_fusion import WeightedProbabilityFusion, LogOddsFusion, RuleBasedClinicalThresholding


class TestCalibrationAndFusion(unittest.TestCase):

    def test_compute_ece(self):
        confidences = np.array([0.9, 0.8, 0.7, 0.6, 0.95, 0.4])
        correctness = np.array([1, 1, 0, 1, 1, 0])
        res = compute_ece(confidences, correctness, n_bins=5)
        self.assertIn("ece", res)
        self.assertGreaterEqual(res["ece"], 0.0)

    def test_temperature_scaler(self):
        scaler = TemperatureScaler()
        logits = torch.randn(10, 2)
        scaled = scaler(logits)
        self.assertEqual(scaled.shape, logits.shape)

    def test_weighted_fusion(self):
        fusion = WeightedProbabilityFusion(0.6, 0.4)
        p, status = fusion.fuse_stage1(0.8, 0.7)
        self.assertAlmostEqual(p, 0.76)
        self.assertEqual(status, "DR Detected")

    def test_log_odds_fusion(self):
        fusion = LogOddsFusion()
        p, status = fusion.fuse_stage1(0.8, 0.7)
        self.assertGreater(p, 0.5)
        self.assertEqual(status, "DR Detected")

    def test_rule_based_thresholding(self):
        rules = RuleBasedClinicalThresholding(high_risk_thresh=0.7, low_risk_thresh=0.3)
        # Safety net override: M0ALL is 0.2, but M01 is 0.75 -> DR Detected
        p, status = rules.fuse_stage1(0.2, 0.75)
        self.assertEqual(status, "DR Detected")

        # Uncertain range
        p, status = rules.fuse_stage1(0.5, 0.4)
        self.assertEqual(status, "Uncertain")


if __name__ == "__main__":
    unittest.main()
