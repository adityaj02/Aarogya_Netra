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

    Uses the compiled FundusIQA package if available (e.g. in Docker),
    otherwise falls back to the full matlab.engine (e.g. local dev).
    """

    def __init__(self, matlab_path=None):
        self._lock = threading.Lock()
        self.is_compiled = False
        self.eng = None

        # 1. Try compiled package first (Docker production)
        try:
            import FundusIQA
            logger.info("Compiled FundusIQA package found. Initializing runtime...")
            self.eng = FundusIQA.initialize()
            self.is_compiled = True
            logger.info("Compiled MATLAB Runtime started successfully.")
            return
        except ImportError:
            logger.info("FundusIQA compiled package not found. Falling back to full matlab.engine.")

        # 2. Fall back to full MATLAB engine (Local development)
        try:
            import matlab.engine as _me
        except ImportError as exc:
            raise ImportError(
                "Neither compiled 'FundusIQA' nor 'matlab.engine' is installed."
            ) from exc

        logger.info("Starting MATLAB engine — first launch may take 30–60 s.")
        self.eng = _me.start_matlab()
        logger.info("MATLAB engine started successfully.")

        if matlab_path:
            resolved = str(Path(matlab_path).resolve())
            self.eng.addpath(self.eng.genpath(resolved), nargout=0)
            logger.debug("Added MATLAB path: %s", resolved)

    def assess(self, image_path):
        """
        Assess a fundus image and return a normalised IQA result dict.
        """
        abs_path = os.path.abspath(image_path)

        with self._lock:
            try:
                # Both compiled and uncompiled MATLAB functions now accept a string path
                raw = self.eng.assessFundusQuality(abs_path, nargout=1)
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
            "engine":        "MATLAB (Compiled)" if self.is_compiled else "MATLAB (Engine)",
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
                if self.is_compiled:
                    self.eng.terminate()
                else:
                    self.eng.quit()
                logger.info("MATLAB engine closed cleanly.")
            except Exception as exc:
                logger.warning("Error closing MATLAB engine: %s", exc)
            finally:
                self.eng = None
