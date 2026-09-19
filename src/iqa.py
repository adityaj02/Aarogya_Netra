"""
AarogyaNetra Image Quality Assessment (IQA) Module
====================================================
Production implementation using Python/OpenCV.

Architecture note: Thresholds were derived from research performed in MATLAB
on representative fundus image datasets. This module implements those validated
thresholds in OpenCV for production deployment.

Each check returns a (passed: bool, score: float, detail: str) tuple.
The Assessor returns a consolidated pass/fail with a list of failed check names.
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import Tuple, List

# ---------------------------------------------------------------------------
# Threshold constants  (MATLAB-validated baselines)
# ---------------------------------------------------------------------------
BLUR_LAPLACIAN_THRESHOLD   = 20.0   # Variance of Laplacian; below → too blurry
ILLUMINATION_MIN           = 20.0   # Mean intensity in fundus ROI; below → under-exposed
ILLUMINATION_MAX           = 240.0  # Mean intensity in fundus ROI; above → over-exposed
CONTRAST_STD_THRESHOLD     = 4.0    # Std-dev of intensity in fundus ROI; below → low contrast
FOV_RATIO_THRESHOLD        = 0.15   # Retinal pixels / total pixels; below → bad field of view
GLARE_SATURATION_THRESHOLD = 0.05   # Fraction of pure-white pixels; above → severe glare


@dataclass
class IQAResult:
    passed: bool
    failed_checks: List[str]
    scores: dict

    def to_dict(self) -> dict:
        if self.passed:
            return {
                "status": "PASS",
                "failed_checks": [],
                "scores": self.scores
            }
        else:
            return {
                "status": "FAIL",
                "failed_checks": self.failed_checks,
                "scores": self.scores
            }


class ImageQualityAssessor:
    """
    Runs 5 quality gates on a fundus image before ML inference.
    Call .assess(img_bgr) where img_bgr is a uint8 NumPy array (H×W×3, BGR).
    """

    # -----------------------------------------------------------------------
    # Gate 1 – Blur / Focus  (no mask needed; whole image)
    # -----------------------------------------------------------------------
    def _check_blur(self, gray: np.ndarray) -> Tuple[bool, float, str]:
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        passed = laplacian_var >= BLUR_LAPLACIAN_THRESHOLD
        return passed, laplacian_var, f"Laplacian variance={laplacian_var:.1f} (min {BLUR_LAPLACIAN_THRESHOLD})"

    # -----------------------------------------------------------------------
    # Helper – build a circular fundus mask (retinal disc mask)
    # -----------------------------------------------------------------------
    @staticmethod
    def _build_fundus_mask(gray: np.ndarray) -> np.ndarray:
        h, w = gray.shape

        # Rough circle from image geometry (fundus typically occupies ~80% of shorter axis)
        cx, cy = w // 2, h // 2
        radius = int(min(h, w) * 0.42)
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, (cx, cy), radius, 255, -1)

        # Refine: exclude near-black background pixels that happen to be inside circle
        bright_enough = (gray > 15).astype(np.uint8) * 255
        mask = cv2.bitwise_and(mask, bright_enough)
        return mask

    # -----------------------------------------------------------------------
    # Gate 2 – Illumination (mean brightness inside fundus mask)
    # -----------------------------------------------------------------------
    def _check_illumination(self, gray: np.ndarray, mask: np.ndarray) -> Tuple[bool, float, str]:
        mean_val = float(cv2.mean(gray, mask=mask)[0])
        passed = ILLUMINATION_MIN <= mean_val <= ILLUMINATION_MAX
        detail = f"Mean intensity={mean_val:.1f} (range [{ILLUMINATION_MIN}, {ILLUMINATION_MAX}])"
        return passed, mean_val, detail

    # -----------------------------------------------------------------------
    # Gate 3 – Contrast (std-dev inside fundus mask)
    # -----------------------------------------------------------------------
    def _check_contrast(self, gray: np.ndarray, mask: np.ndarray) -> Tuple[bool, float, str]:
        roi_pixels = gray[mask > 0].astype(np.float32)
        if roi_pixels.size == 0:
            return False, 0.0, "Mask empty – no fundus pixels detected"
        std_val = float(roi_pixels.std())
        passed = std_val >= CONTRAST_STD_THRESHOLD
        return passed, std_val, f"Std-dev={std_val:.1f} (min {CONTRAST_STD_THRESHOLD})"

    # -----------------------------------------------------------------------
    # Gate 4 – Fundus Visibility / Field of View
    # -----------------------------------------------------------------------
    def _check_fov(self, gray: np.ndarray, mask: np.ndarray) -> Tuple[bool, float, str]:
        total_pixels = gray.size
        roi_pixels   = int(np.count_nonzero(mask))
        ratio        = roi_pixels / total_pixels if total_pixels > 0 else 0.0
        passed = ratio >= FOV_RATIO_THRESHOLD
        return passed, ratio, f"Retinal ratio={ratio:.3f} (min {FOV_RATIO_THRESHOLD})"

    # -----------------------------------------------------------------------
    # Gate 5 – Glare / Specular Highlights  (near-saturated pixels)
    # -----------------------------------------------------------------------
    def _check_glare(self, gray: np.ndarray) -> Tuple[bool, float, str]:
        saturated = np.count_nonzero(gray >= 250)
        fraction  = saturated / gray.size if gray.size > 0 else 0.0
        passed = fraction <= GLARE_SATURATION_THRESHOLD
        return passed, fraction, f"Saturated fraction={fraction:.4f} (max {GLARE_SATURATION_THRESHOLD})"

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------
    def assess(self, img_bgr: np.ndarray) -> IQAResult:
        """
        Assess image quality. Returns an IQAResult with pass/fail status.

        Args:
            img_bgr: NumPy uint8 array in BGR format (as returned by cv2.imread).

        Returns:
            IQAResult dataclass instance.
        """
        if img_bgr is None or img_bgr.size == 0:
            return IQAResult(
                passed=False,
                failed_checks=["IMAGE_LOAD"],
                scores={"error": "Could not decode image"}
            )

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        mask = self._build_fundus_mask(gray)

        results = {}

        # Run all 5 gates
        blur_ok,   blur_score,   blur_detail   = self._check_blur(gray)
        illum_ok,  illum_score,  illum_detail  = self._check_illumination(gray, mask)
        cont_ok,   cont_score,   cont_detail   = self._check_contrast(gray, mask)
        fov_ok,    fov_score,    fov_detail    = self._check_fov(gray, mask)
        glare_ok,  glare_score,  glare_detail  = self._check_glare(gray)

        gate_map = {
            "BLUR":        (blur_ok,   blur_score,   blur_detail),
            "ILLUMINATION":(illum_ok,  illum_score,  illum_detail),
            "LOW_CONTRAST":(cont_ok,   cont_score,   cont_detail),
            "POOR_FOV":    (fov_ok,    fov_score,    fov_detail),
            "GLARE":       (glare_ok,  glare_score,  glare_detail),
        }

        failed_checks = []
        scores = {}
        for name, (ok, score, detail) in gate_map.items():
            scores[name] = {"score": round(score, 4), "passed": ok, "detail": detail}
            if not ok:
                failed_checks.append(name)

        return IQAResult(
            passed=len(failed_checks) == 0,
            failed_checks=failed_checks,
            scores=scores
        )


def assess_image_file(img_path: str) -> IQAResult:
    """Convenience wrapper: read a file path and assess it."""
    img_bgr = cv2.imread(img_path)
    assessor = ImageQualityAssessor()
    return assessor.assess(img_bgr)
