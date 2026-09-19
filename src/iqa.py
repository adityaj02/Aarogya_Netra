"""
AarogyaNetra Image Quality Assessment (IQA) Module
====================================================
Python / OpenCV engine calibrated to match MATLAB assessFundusQuality.m 1:1.

Architecture note: Thresholds and quality gates strictly mirror MATLAB:
- Resolution check: min height/width 224px
- FOV Ratio: min 0.15 (retinal pixels gray > 10)
- Brightness: mean intensity in ROI [20.0, 240.0]
- Dark Ratio: fraction of ROI pixels with intensity < 30 (max 0.15)
- Blur Score: Laplacian variance (min 20.0 OpenCV / min 3.0 MATLAB)
- Glare Ratio: fraction of ROI pixels with intensity > 245 (max 0.05)
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import Tuple, List

MIN_FOV_RATIO          = 0.15   # Retinal pixels / total pixels
MIN_BRIGHTNESS         = 20.0   # Mean intensity in fundus ROI
MAX_BRIGHTNESS         = 240.0  # Mean intensity in fundus ROI
MAX_DARK_RATIO         = 0.15   # Fraction of ROI pixels < 30
BLUR_LAPLACIAN_THRESHOLD = 20.0 # Variance of Laplacian
GLARE_SATURATION_THRESHOLD = 0.05 # Fraction of ROI pixels > 245
MIN_RESOLUTION         = 224    # Min width & height in pixels


@dataclass
class IQAResult:
    passed: bool
    failed_checks: List[str]
    scores: dict

    def to_dict(self) -> dict:
        return {
            "status": "PASS" if self.passed else "FAIL",
            "failed_checks": self.failed_checks,
            "scores": self.scores
        }


class ImageQualityAssessor:
    """
    Runs MATLAB-equivalent quality gates on a fundus image before ML inference.
    Call .assess(img_bgr) where img_bgr is a uint8 NumPy array (H×W×3, BGR).
    """

    def assess(self, img_bgr: np.ndarray) -> IQAResult:
        if img_bgr is None or img_bgr.size == 0:
            return IQAResult(
                passed=False,
                failed_checks=["IMAGE_LOAD"],
                scores={"error": "Could not decode image"}
            )

        h, w = img_bgr.shape[:2]
        if h < MIN_RESOLUTION or w < MIN_RESOLUTION:
            return IQAResult(
                passed=False,
                failed_checks=["LOW_RESOLUTION"],
                scores={"resolution": f"{w}x{h} (min {MIN_RESOLUTION}x{MIN_RESOLUTION})"}
            )

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY) if img_bgr.ndim == 3 else img_bgr

        # 1. Field of View (FOV)
        fov_mask = gray > 10
        total_pixels = gray.size
        fov_pixels = int(np.count_nonzero(fov_mask))
        fov_ratio = float(fov_pixels / total_pixels) if total_pixels > 0 else 0.0
        fov_ok = fov_ratio >= MIN_FOV_RATIO

        roi_pixels = gray[fov_mask]
        if roi_pixels.size == 0:
            return IQAResult(
                passed=False,
                failed_checks=["POOR_FOV"],
                scores={"fov_ratio": 0.0, "reason": "No valid retinal region"}
            )

        # 2. Brightness
        brightness = float(np.mean(roi_pixels))
        illum_ok = MIN_BRIGHTNESS <= brightness <= MAX_BRIGHTNESS

        # 3. Dark Ratio
        dark_pixels = np.count_nonzero(roi_pixels < 30)
        dark_ratio = float(dark_pixels / roi_pixels.size)
        dark_ok = dark_ratio <= MAX_DARK_RATIO

        # 4. Blur Score
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        blur_ok = laplacian_var >= BLUR_LAPLACIAN_THRESHOLD

        # 5. Glare Ratio
        sat_pixels = np.count_nonzero(roi_pixels >= 245)
        glare_ratio = float(sat_pixels / roi_pixels.size)
        glare_ok = glare_ratio <= GLARE_SATURATION_THRESHOLD

        gate_map = {
            "POOR_FOV":     (fov_ok,     fov_ratio,     f"Retinal ratio={fov_ratio:.3f} (min {MIN_FOV_RATIO})"),
            "ILLUMINATION": (illum_ok and dark_ok, brightness, f"Mean intensity={brightness:.1f}, dark ratio={dark_ratio:.3f}"),
            "BLUR":         (blur_ok,    laplacian_var, f"Laplacian variance={laplacian_var:.1f} (min {BLUR_LAPLACIAN_THRESHOLD})"),
            "GLARE":        (glare_ok,   glare_ratio,   f"Glare ratio={glare_ratio:.4f} (max {GLARE_SATURATION_THRESHOLD})"),
        }

        failed_checks = []
        scores = {
            "fovRatio": round(fov_ratio, 4),
            "brightness": round(brightness, 2),
            "darkRatio": round(dark_ratio, 4),
            "blurScore": round(laplacian_var, 2),
            "glareRatio": round(glare_ratio, 4)
        }

        for check_name, (passed, val, detail) in gate_map.items():
            if not passed:
                failed_checks.append(check_name)

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

