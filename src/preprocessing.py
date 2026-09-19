"""
AarogyaNetra - Preprocessing Pipeline Module
=============================================
Implementation of FR-003 (Sequential Preprocessing) as specified in SRS v2.0:
1. Black-border removal
2. Resizing
3. Representation/Colour-space conversion
4. CLAHE contrast enhancement
5. Illumination correction
6. Normalization
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any

# Normalization constants per pipeline
PIPE_STATS: Dict[str, Dict[str, list]] = {
    "RGB":               {"mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]},
    "Green_CLAHE":       {"mean": [0.456, 0.456, 0.456], "std": [0.224, 0.224, 0.224]},
    "Gray_CLAHE":        {"mean": [0.449, 0.449, 0.449], "std": [0.226, 0.226, 0.226]},
    "LAB_L_CLAHE":       {"mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]},
    "MaxGreenGsc_CLAHE": {"mean": [0.450, 0.450, 0.450], "std": [0.220, 0.220, 0.220]},
}


def remove_black_borders(img_np: np.ndarray, tol: int = 10) -> np.ndarray:
    """
    Step 1: Crop non-black bounding box around the fundus circle.
    Supports both 2D (grayscale) and 3D (RGB) numpy arrays.
    """
    if img_np.ndim == 2:
        mask = img_np > tol
    elif img_np.ndim == 3:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY) if img_np.shape[2] == 3 else img_np[:, :, 0]
        mask = gray > tol
    else:
        return img_np

    if not np.any(mask):
        return img_np

    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]

    if ymax <= ymin or xmax <= xmin:
        return img_np

    return img_np[ymin:ymax + 1, xmin:xmax + 1]


def resize_image(img_np: np.ndarray, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """
    Step 2: Resize image to target resolution using area interpolation for downsampling.
    """
    return cv2.resize(img_np, target_size, interpolation=cv2.INTER_AREA)


def apply_clahe(channel_np: np.ndarray, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Step 4: Apply Contrast Limited Adaptive Histogram Equalization (CLAHE) to a uint8 single-channel array.
    """
    if channel_np.dtype != np.uint8:
        channel_np = np.clip(channel_np, 0, 255).astype(np.uint8)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    return clahe.apply(channel_np)


def apply_illumination_correction(img_np: np.ndarray, sigma: float = 30.0) -> np.ndarray:
    """
    Step 5: Apply Ben Graham illumination & local intensity subtraction to smooth out lighting variations.
    Formula: I_corrected = 4 * I - 4 * GaussianBlur(I, sigma) + 128
    """
    blurred = cv2.GaussianBlur(img_np, (0, 0), sigma)
    corrected = cv2.addWeighted(img_np, 4.0, blurred, -4.0, 128)
    return np.clip(corrected, 0, 255).astype(np.uint8)


class RetinalPreprocessor:
    """
    Full FR-003 Preprocessing Pipeline Class executing steps in order:
    1. Black border removal
    2. Resizing
    3. Representation conversion
    4. CLAHE contrast enhancement
    5. Illumination correction
    """

    def __init__(self, pipeline_name: str = "RGB", target_size: Tuple[int, int] = (224, 224),
                 enable_border_crop: bool = True, enable_illumination: bool = False):
        if pipeline_name not in PIPE_STATS:
            raise ValueError(f"Unknown pipeline: {pipeline_name}. Expected one of {list(PIPE_STATS.keys())}")
        self.pipeline_name = pipeline_name
        self.target_size = target_size
        self.enable_border_crop = enable_border_crop
        self.enable_illumination = enable_illumination
        self.stats = PIPE_STATS[pipeline_name]

    def preprocess_numpy(self, img_rgb: np.ndarray) -> np.ndarray:
        """
        Processes a uint8 RGB numpy array (H, W, 3) through the pipeline.
        Returns uint8 RGB numpy array (target_size[1], target_size[0], 3).
        """
        # Step 1: Black border crop
        if self.enable_border_crop:
            img = remove_black_borders(img_rgb)
        else:
            img = img_rgb

        # Step 2: Resize
        img = resize_image(img, self.target_size)

        # Step 3 & 4: Representation conversion + CLAHE
        if self.pipeline_name == "RGB":
            out = img.copy()

        elif self.pipeline_name == "Green_CLAHE":
            green = img[:, :, 1]
            clahe_g = apply_clahe(green)
            out = cv2.merge([clahe_g, clahe_g, clahe_g])

        elif self.pipeline_name == "Gray_CLAHE":
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            clahe_gray = apply_clahe(gray)
            out = cv2.merge([clahe_gray, clahe_gray, clahe_gray])

        elif self.pipeline_name == "LAB_L_CLAHE":
            lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
            L = lab[:, :, 0]
            lab[:, :, 0] = apply_clahe(L)
            out = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

        elif self.pipeline_name == "MaxGreenGsc_CLAHE":
            green = img[:, :, 1]
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            max_img = np.maximum(green, gray)
            clahe_max = apply_clahe(max_img)
            out = cv2.merge([clahe_max, clahe_max, clahe_max])

        else:
            out = img.copy()

        # Step 5: Illumination correction (if enabled)
        if self.enable_illumination:
            out = apply_illumination_correction(out)

        return out

    def preprocess_pil(self, pil_img: Image.Image) -> Image.Image:
        """Helper for PIL Image input/output."""
        img_rgb = np.array(pil_img.convert("RGB"))
        processed_np = self.preprocess_numpy(img_rgb)
        return Image.fromarray(processed_np)

    def normalize_tensor(self, tensor_img: Any) -> Any:
        """
        Applies per-pipeline normalization to a float PyTorch tensor (3, H, W) with values in [0, 1].
        """
        import torchvision.transforms.functional as TF
        return TF.normalize(tensor_img, self.stats["mean"], self.stats["std"])
