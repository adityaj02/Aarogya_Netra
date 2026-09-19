"""
AarogyaNetra - Preprocessing Pipeline Visualizer
=================================================
Generates comparison grids of all 5 representation pipelines across DR grades (0 to 4).
Saves output to artifacts/preprocessing_comparison.png.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
import cv2
import numpy as np
import matplotlib.pyplot as plt

from src.preprocessing import RetinalPreprocessor, PIPE_STATS

BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline\train")
ARTIFACTS_DIR = Path(r"C:\Users\Aditya\.gemini\antigravity-ide\brain\1bc84764-5bce-44ef-bd51-a688ca36af40")


def sample_grade_images() -> dict:
    """Finds one sample image for each DR grade 0, 1, 2, 3, 4."""
    samples = {}
    for grade in ["0", "1", "2", "3", "4"]:
        folder = BASE_DIR / grade
        if folder.exists():
            for fpath in folder.iterdir():
                if fpath.is_file() and fpath.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    samples[grade] = fpath
                    break
    return samples


def main():
    samples = sample_grade_images()
    if not samples:
        print("No sample images found!")
        return

    pipelines = ["RGB", "Green_CLAHE", "Gray_CLAHE", "LAB_L_CLAHE", "MaxGreenGsc_CLAHE"]
    preprocessors = {pipe: RetinalPreprocessor(pipe, target_size=(224, 224)) for pipe in pipelines}

    fig, axes = plt.subplots(len(samples), len(pipelines), figsize=(18, 14))
    fig.suptitle("AarogyaNetra - Preprocessing Pipelines (FR-003) across DR Grades", fontsize=16, fontweight="bold")

    for r, (grade, fpath) in enumerate(sorted(samples.items())):
        img_bgr = cv2.imread(str(fpath))
        if img_bgr is None:
            continue
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        for c, pipe_name in enumerate(pipelines):
            ax = axes[r, c] if len(samples) > 1 else axes[c]
            processed_rgb = preprocessors[pipe_name].preprocess_numpy(img_rgb)
            ax.imshow(processed_rgb)
            if r == 0:
                ax.set_title(pipe_name, fontsize=12, fontweight="bold", pad=10)
            if c == 0:
                ax.set_ylabel(f"Grade {grade}", fontsize=12, fontweight="bold", labelpad=10)
            ax.set_xticks([])
            ax.set_yticks([])

    plt.tight_layout()
    output_path = ARTIFACTS_DIR / "preprocessing_comparison.png"
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Visual comparison saved successfully to: {output_path}")


if __name__ == "__main__":
    main()
