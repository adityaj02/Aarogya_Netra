"""
AarogyaNetra - Decision Fusion Engine Module
=============================================
Combines probabilities from global/parent models and boundary validators.
Implements candidate strategies specified in SRS v2.0 Section 3.6:
1. Weighted Probability Fusion
2. Log-Odds (Logit) Fusion
3. Rule-Based Clinical Thresholding
"""

import numpy as np
from typing import Dict, Any, Tuple


class WeightedProbabilityFusion:
    """Combines global and boundary probabilities using specified weights."""

    def __init__(self, w_global: float = 0.6, w_boundary: float = 0.4):
        self.w_global = w_global
        self.w_boundary = w_boundary
        total = w_global + w_boundary
        self.w_global /= total
        self.w_boundary /= total

    def fuse_stage1(self, p_m0all: float, p_m01: float, threshold: float = 0.5) -> Tuple[float, str]:
        """
        Stage 1 Decision Fusion:
        p_m0all: P(DR) from global model M0ALL
        p_m01: P(DR) from boundary validator M01 (Class 0 vs Class 1)
        """
        fused_prob = self.w_global * p_m0all + self.w_boundary * p_m01
        if isinstance(fused_prob, np.ndarray):
            status = np.where(fused_prob >= threshold, "DR Detected", "No DR")
        else:
            status = "DR Detected" if fused_prob >= threshold else "No DR"
        return fused_prob, status

    def _apply_boundary(self, probs: np.ndarray, i: int, j: int, p_boundary_j: float, w_boundary: float = 0.4) -> np.ndarray:
        sum_ij = probs[i] + probs[j]
        if sum_ij < 1e-9:
            return probs
            
        w_global = 1.0 - w_boundary
        p_parent_j = probs[j] / sum_ij
        p_fused_j = w_global * p_parent_j + w_boundary * p_boundary_j
        
        new_probs = probs.copy()
        new_probs[j] = sum_ij * p_fused_j
        new_probs[i] = sum_ij * (1.0 - p_fused_j)
        return new_probs

    def fuse_stage2(self, p_m1234: np.ndarray, boundary_probs: Dict[str, float], weights: Dict[str, float] = None) -> np.ndarray:
        """
        Stage 2 Decision Fusion:
        p_m1234: array of shape (4,) containing probabilities for Grades 1, 2, 3, 4
        boundary_probs: dict containing e.g. {'m12': 0.6, 'm23': 0.4}
        weights: dict of boundary weights e.g. {'m12': 0.4, 'm23': 0.8}
        """
        fused_probs = p_m1234.copy()
        if weights is None:
            weights = {'m12': self.w_boundary, 'm23': self.w_boundary, 'm34': self.w_boundary}

        if 'm12' in boundary_probs:
            fused_probs = self._apply_boundary(fused_probs, 0, 1, boundary_probs['m12'], weights.get('m12', 0.4))
        if 'm23' in boundary_probs:
            fused_probs = self._apply_boundary(fused_probs, 1, 2, boundary_probs['m23'], weights.get('m23', 0.4))
        if 'm34' in boundary_probs:
            fused_probs = self._apply_boundary(fused_probs, 2, 3, boundary_probs['m34'], weights.get('m34', 0.4))
            
        return fused_probs


class LogOddsFusion:
    """Combines evidence in log-odds (logit) space before converting back to probability."""

    @staticmethod
    def _prob_to_logit(p: float, eps: float = 1e-6) -> float:
        p_clamped = np.clip(p, eps, 1.0 - eps)
        res = np.log(p_clamped / (1.0 - p_clamped))
        return float(res) if isinstance(p, (float, int)) else res

    @staticmethod
    def _logit_to_prob(l: float) -> float:
        res = 1.0 / (1.0 + np.exp(-l))
        return float(res) if isinstance(l, (float, int)) else res

    def fuse_stage1(self, p_m0all: float, p_m01: float, w_global: float = 0.6, w_boundary: float = 0.4, threshold: float = 0.5) -> Tuple[float, str]:
        l_global = self._prob_to_logit(p_m0all)
        l_boundary = self._prob_to_logit(p_m01)
        fused_logit = w_global * l_global + w_boundary * l_boundary
        fused_prob = self._logit_to_prob(fused_logit)
        if isinstance(fused_prob, np.ndarray):
            status = np.where(fused_prob >= threshold, "DR Detected", "No DR")
        else:
            status = "DR Detected" if fused_prob >= threshold else "No DR"
        return fused_prob, status

    def _apply_boundary(self, probs: np.ndarray, i: int, j: int, p_boundary_j: float, w_global: float, w_boundary: float) -> np.ndarray:
        sum_ij = probs[i] + probs[j]
        if sum_ij < 1e-9:
            return probs
            
        p_parent_j = probs[j] / sum_ij
        l_parent_j = self._prob_to_logit(p_parent_j)
        l_boundary_j = self._prob_to_logit(p_boundary_j)
        
        fused_logit = w_global * l_parent_j + w_boundary * l_boundary_j
        p_fused_j = self._logit_to_prob(fused_logit)
        
        new_probs = probs.copy()
        new_probs[j] = sum_ij * p_fused_j
        new_probs[i] = sum_ij * (1.0 - p_fused_j)
        return new_probs

    def fuse_stage2(self, p_m1234: np.ndarray, boundary_probs: Dict[str, float], weights: Dict[str, float] = None) -> np.ndarray:
        fused_probs = p_m1234.copy()
        if weights is None:
            weights = {'m12': 0.4, 'm23': 0.4, 'm34': 0.4}

        if 'm12' in boundary_probs:
            w_b = weights.get('m12', 0.4)
            fused_probs = self._apply_boundary(fused_probs, 0, 1, boundary_probs['m12'], 1.0 - w_b, w_b)
        if 'm23' in boundary_probs:
            w_b = weights.get('m23', 0.4)
            fused_probs = self._apply_boundary(fused_probs, 1, 2, boundary_probs['m23'], 1.0 - w_b, w_b)
        if 'm34' in boundary_probs:
            w_b = weights.get('m34', 0.4)
            fused_probs = self._apply_boundary(fused_probs, 2, 3, boundary_probs['m34'], 1.0 - w_b, w_b)
        return fused_probs


class RuleBasedClinicalThresholding:
    """
    Clinically defined decision rules:
    High sensitivity safety net - if either M0ALL or M01 flags high DR risk, trigger DR review.
    """

    def __init__(self, high_risk_thresh: float = 0.7, low_risk_thresh: float = 0.3):
        self.high_risk_thresh = high_risk_thresh
        self.low_risk_thresh = low_risk_thresh

    def fuse_stage1(self, p_m0all: float, p_m01: float) -> Tuple[float, str]:
        # Safety net: if M01 boundary validator is strongly positive, override low M0ALL score
        if p_m0all >= self.high_risk_thresh or p_m01 >= self.high_risk_thresh:
            status = "DR Detected"
        elif p_m0all < self.low_risk_thresh and p_m01 < self.low_risk_thresh:
            status = "No DR"
        else:
            status = "Uncertain"  # Borderline case flagged for review/retest per UNC-001

        fused_prob = (p_m0all + p_m01) / 2.0
        return fused_prob, status
