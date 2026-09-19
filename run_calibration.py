"""
AarogyaNetra - Automated Temperature Scaling Calibration Engine
=================================================================
Performs Temperature Scaling calibration on all 6 trained RGB stages across all 3 seeds (42, 100, 2026).
Satisfies SRS CAL-001, CAL-002, CAL-003.
"""

import sys
import json
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path
import timm
from typing import Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))
from src.representation import create_dataloader
from src.calibration import TemperatureScaler, compute_ece

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
VAL_DIR = BASE_DIR / "val"

STAGES = ["stage1", "stage_m01", "stage2", "stage_m12", "stage_m23", "stage_m34"]
SEEDS = [42, 100, 2026]


def get_logits_and_labels(model: nn.Module, loader) -> Tuple[torch.Tensor, torch.Tensor]:
    model.eval()
    all_logits = []
    all_labels = []
    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(DEVICE)
            logits = model(imgs)
            all_logits.append(logits.cpu())
            all_labels.append(labels)
    return torch.cat(all_logits, dim=0), torch.cat(all_labels, dim=0)


def calibrate_all():
    print(f"Starting Temperature Scaling Calibration on {DEVICE}...")
    calibration_results = {}

    for stage in STAGES:
        num_classes = 2 if stage in ("stage1", "stage_m01", "stage_m12", "stage_m23", "stage_m34") else 4
        print(f"\n==================================================")
        print(f"CALIBRATING STAGE: {stage} ({num_classes} classes)")
        print(f"==================================================")

        val_loader = create_dataloader(VAL_DIR, stage, "RGB", batch_size=32, augment=False, num_workers=0, split="calib")
        fusion_loader = create_dataloader(VAL_DIR, stage, "RGB", batch_size=32, augment=False, num_workers=0, split="fusion")

        stage_temps = []
        stage_ece_uncal = []
        stage_ece_cal = []

        for seed in SEEDS:
            model_path = BASE_DIR / f"RGB_{stage}_seed{seed}_model.pt"
            if not model_path.exists():
                print(f"  [Seed {seed}] Model path {model_path} missing! Skipping.")
                continue

            # Load model
            model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)
            model.load_state_dict(torch.load(model_path, map_location=DEVICE))
            model.to(DEVICE)

            # Extract Val logits and labels
            val_logits, val_labels = get_logits_and_labels(model, val_loader)

            # Fit Temperature Scaler on Val set
            scaler = TemperatureScaler().to(DEVICE)
            val_logits_gpu = val_logits.to(DEVICE)
            val_labels_gpu = val_labels.to(DEVICE)
            optimal_temp = scaler.fit(val_logits_gpu, val_labels_gpu)

            # Extract Fusion (20% Val) logits and labels
            test_logits, test_labels = get_logits_and_labels(model, fusion_loader)
            test_logits_cal = test_logits / optimal_temp

            # Compute Uncalibrated ECE on Fusion set
            if num_classes == 2:
                uncal_probs = torch.softmax(test_logits, dim=1)[:, 1].numpy()
                uncal_preds = (uncal_probs >= 0.5).astype(int)
                uncal_confs = np.where(uncal_preds == 1, uncal_probs, 1.0 - uncal_probs)
                uncal_correct = (uncal_preds == test_labels.numpy()).astype(float)
                
                cal_probs = torch.softmax(test_logits_cal, dim=1)[:, 1].numpy()
                cal_preds = (cal_probs >= 0.5).astype(int)
                cal_confs = np.where(cal_preds == 1, cal_probs, 1.0 - cal_probs)
                cal_correct = (cal_preds == test_labels.numpy()).astype(float)
            else:
                uncal_probs = torch.softmax(test_logits, dim=1).numpy()
                uncal_preds = np.argmax(uncal_probs, axis=1)
                uncal_confs = uncal_probs.max(axis=1)
                uncal_correct = (uncal_preds == test_labels.numpy()).astype(float)

                cal_probs = torch.softmax(test_logits_cal, dim=1).numpy()
                cal_preds = np.argmax(cal_probs, axis=1)
                cal_confs = cal_probs.max(axis=1)
                cal_correct = (cal_preds == test_labels.numpy()).astype(float)

            ece_uncal = compute_ece(uncal_confs, uncal_correct)["ece"]
            ece_cal = compute_ece(cal_confs, cal_correct)["ece"]

            print(f"  [Seed {seed}] Optimal T*: {optimal_temp:.4f} | ECE Uncal: {ece_uncal:.4f} -> ECE Cal: {ece_cal:.4f}")

            stage_temps.append(optimal_temp)
            stage_ece_uncal.append(ece_uncal)
            stage_ece_cal.append(ece_cal)

        calibration_results[stage] = {
            "optimal_temperature_mean": float(np.mean(stage_temps)),
            "per_seed_temperatures": stage_temps,
            "uncalibrated_ece_mean": float(np.mean(stage_ece_uncal)),
            "calibrated_ece_mean": float(np.mean(stage_ece_cal)),
            "ece_reduction_pct": float((1 - np.mean(stage_ece_cal) / (np.mean(stage_ece_uncal) + 1e-9)) * 100)
        }

    # Save calibration JSON
    out_json = BASE_DIR / "calibrated_temperatures.json"
    with open(out_json, "w") as f:
        json.dump(calibration_results, f, indent=2)

    print("\n" + "="*70)
    print("CALIBRATION SUMMARY TABLE (SRS CAL-001..CAL-003)")
    print("="*70)
    print(f"{'Stage':<12} | {'Optimal T* (Mean)':<18} | {'Uncal ECE':<12} | {'Cal ECE':<12} | {'ECE Drop (%)':<12}")
    print("-" * 70)
    for stage, r in calibration_results.items():
        print(f"{stage:<12} | {r['optimal_temperature_mean']:<18.4f} | {r['uncalibrated_ece_mean']:<12.4f} | {r['calibrated_ece_mean']:<12.4f} | {r['ece_reduction_pct']:<12.2f}%")
    print("="*70)
    print(f"Calibrated temperature map saved to: {out_json}")


if __name__ == "__main__":
    calibrate_all()
