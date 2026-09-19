"""
AarogyaNetra - MATLAB IQA Engine Wrapper
=========================================
Wraps the MATLAB assessFundusQuality function and normalises its output
to the same IQA result schema produced by the Python OpenCV fallback:

    {
        "engine":        "MATLAB" | "Python-Fallback",
        "status":        "ACCEPT" | "REJECT",
        "reason":        "<human-readable string>",
        "failed_checks": ["BLUR", "ILLUMINATION", ...],   # empty on ACCEPT
        "metrics": {
            "fov_ratio":   float | None,
            "brightness":  float | None,
            "dark_ratio":  float | None,
            "blur_score":  float | None
        }
    }

Thread safety: all MATLAB engine calls are serialized via a threading.Lock
so that concurrent FastAPI requests do not race on the shared MATLAB session.
"""

import os
import math
import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)


def _nan_to_none(v):
    try:
        f = float(v)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


# Human-readable mapping from MATLAB reason strings to failed_check codes
_REASON_TO_CHECKS = {
    "blur":     ["BLUR"],
    "focus":    ["BLUR"],
    "dark":     ["ILLUMINATION"],
    "bright":   ["ILLUMINATION"],
    "illumin":  ["ILLUMINATION"],
    "fov":      ["POOR_FOV"],
    "field":    ["POOR_FOV"],
    "glare":    ["GLARE"],
    "contrast": ["LOW_CONTRAST"],
}


def _reason_to_failed_checks(reason):
    """Derive failed_checks list from MATLAB reason string (best-effort)."""
    reason_lower = (reason or "").lower()
    checks = []
    for keyword, codes in _REASON_TO_CHECKS.items():
        if keyword in reason_lower:
            for code in codes:
                if code not in checks:
                    checks.append(code)
    # Fallback generic marker so the frontend still renders something
    if not checks and reason_lower:
        checks = ["QUALITY_FAILURE"]
    return checks


class MatlabIQA:
    """
    Persistent MATLAB engine wrapper for fundus image quality assessment.

    All calls to the MATLAB engine are serialized with a threading.Lock
    so concurrent FastAPI requests cannot race on the shared MATLAB session.
    """

    def __init__(self, matlab_path=None):
        try:
            import matlab.engine as _me
            self._eng_module = _me
        except ImportError as exc:
            raise ImportError(
                "matlab.engine is not installed. Install it from your MATLAB root:\n"
                "  python -m pip install matlabengine\n"
                "or from: <matlabroot>/extern/engines/python  →  python -m pip install ."
            ) from exc

        logger.info("Starting MATLAB engine — first launch may take 30–60 s.")
        self.eng = self._eng_module.start_matlab()
        logger.info("MATLAB engine started successfully.")

        if matlab_path:
            resolved = str(Path(matlab_path).resolve())
            self.eng.addpath(self.eng.genpath(resolved), nargout=0)
            logger.debug("Added MATLAB path: %s", resolved)

        # Serialize all engine calls — concurrent requests share one session.
        self._lock = threading.Lock()

    def assess(self, image_path):
        """
        Assess a fundus image and return a normalised IQA result dict.

        Returns
        -------
        dict with keys: engine, status, reason, failed_checks, metrics
        """
        abs_path = os.path.abspath(image_path)

        with self._lock:
            try:
                matlab_img = self.eng.imread(abs_path)
                raw = self.eng.assessFundusQuality(matlab_img, nargout=1)
            except Exception as exc:
                logger.error("MATLAB assessFundusQuality failed: %s", exc)
                raise

        status = str(raw.get("status", "REJECT"))
        reason = str(raw.get("reason", ""))

        metrics = {
            "fov_ratio":  _nan_to_none(raw.get("fovRatio")),
            "brightness": _nan_to_none(raw.get("brightness")),
            "dark_ratio": _nan_to_none(raw.get("darkRatio")),
            "blur_score": _nan_to_none(raw.get("blurScore")),
        }

        failed_checks = _reason_to_failed_checks(reason) if status == "REJECT" else []

        result = {
            "engine":        "MATLAB",
            "status":        status,
            "reason":        reason,
            "failed_checks": failed_checks,
            "metrics":       metrics,
        }

        logger.info(
            "[IQA MATLAB] %s — reason=%r  blur=%.3f  brightness=%.1f",
            status,
            reason,
            metrics["blur_score"] or 0.0,
            metrics["brightness"] or 0.0,
        )
        return result

    def close(self):
        """Quit the MATLAB engine and release the session."""
        if self.eng is not None:
            try:
                self.eng.quit()
                logger.info("MATLAB engine closed cleanly.")
            except Exception as exc:
                logger.warning("Error closing MATLAB engine: %s", exc)
            finally:
                self.eng = None
