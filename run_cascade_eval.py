import os
import sys
import argparse
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import roc_curve, matthews_corrcoef, balanced_accuracy_score

# Suppress warnings
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN_WARNING"] = "1"
import warnings
warnings.filterwarnings("ignore")

import timm
from src.representation import create_dataloader

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
VAL_DIR = BASE_DIR / "val"
TEST_DIR = BASE_DIR / "test"

def build_model(num_classes: int) -> nn.Module:
    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)
    return model.to(DEVICE)

def get_predictions(model, loader):
    model.eval()
    softmax = nn.Softmax(dim=1)
    all_probs, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(DEVICE, non_blocking=True)
            with torch.autocast(device_type="cuda", enabled=DEVICE.type == "cuda"):
                logits = model(imgs)
            all_probs.append(softmax(logits).cpu().numpy())
            all_labels.append(labels.numpy())
    return np.concatenate(all_probs), np.concatenate(all_labels)

def cascade_predict(probs1, probs_m01, thresh1, thresh_m01):
    """Apply cascade OR-gate logic: if Model 1 says healthy, let Model 2 double-check."""
    pred1 = (probs1[:, 1] >= thresh1).astype(int)
    pred_m01 = (probs_m01[:, 1] >= thresh_m01).astype(int)
    final_pred = pred1.copy()
    healthy_mask = (pred1 == 0)
    final_pred[healthy_mask] = pred_m01[healthy_mask]
    return final_pred

def calculate_metrics(y_true, pred):
    TP = int(((y_true == 1) & (pred == 1)).sum())
    TN = int(((y_true == 0) & (pred == 0)).sum())
    FP = int(((y_true == 0) & (pred == 1)).sum())
    FN = int(((y_true == 1) & (pred == 0)).sum())
    sens = TP / (TP + FN + 1e-9)
    spec = TN / (TN + FP + 1e-9)
    b_acc = balanced_accuracy_score(y_true, pred)
    mcc = matthews_corrcoef(y_true, pred)
    return sens, spec, 1.0 - sens, b_acc, mcc

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pipeline", type=str, default="RGB")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--target_sens", type=float, default=0.90)
    parser.add_argument("--target_spec", type=float, default=0.85)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()

    print(f"=== Cascade Maximum Performance Optimization ===")
    print(f"Pipeline: {args.pipeline} | Seed: {args.seed}")
    print(f"Goal: Maximize Balanced Accuracy (no constraints)")

    # Load both models
    model1 = build_model(2)
    model1.load_state_dict(torch.load(
        BASE_DIR / f"{args.pipeline}_stage1_seed{args.seed}_model.pt",
        map_location=DEVICE, weights_only=True))

    model_m01 = build_model(2)
    model_m01.load_state_dict(torch.load(
        BASE_DIR / f"{args.pipeline}_stage_m01_seed{args.seed}_model.pt",
        map_location=DEVICE, weights_only=True))

    # --- VALIDATION PHASE: Grid search for optimal threshold pair ---
    print("\n[Validation Phase] Loading Validation Set...")
    val_loader = create_dataloader(VAL_DIR, "stage1", args.pipeline, batch_size=args.batch, augment=False, num_workers=args.workers)

    print("[Validation Phase] Running Model 1 predictions...")
    val_probs1, val_y_true = get_predictions(model1, val_loader)

    # Free GPU memory before loading second model predictions
    torch.cuda.empty_cache()

    print("[Validation Phase] Running Model 2 predictions...")
    val_probs_m01, _ = get_predictions(model_m01, val_loader)

    torch.cuda.empty_cache()

    # Generate candidate thresholds from each model's ROC curve
    _, _, thresholds1 = roc_curve(val_y_true, val_probs1[:, 1])
    _, _, thresholds_m01 = roc_curve(val_y_true, val_probs_m01[:, 1])

    # Subsample thresholds for speed (use ~200 points each = 40,000 combos max)
    step1 = max(1, len(thresholds1) // 200)
    step_m01 = max(1, len(thresholds_m01) // 200)
    t1_candidates = thresholds1[::step1]
    tm01_candidates = thresholds_m01[::step_m01]

    print(f"[Validation Phase] Grid searching {len(t1_candidates)} x {len(tm01_candidates)} = {len(t1_candidates)*len(tm01_candidates)} threshold combinations...")

    best_bacc = -1
    best_t1, best_tm01 = None, None
    best_sens, best_spec = 0, 0

    for t1 in t1_candidates:
        for tm01 in tm01_candidates:
            final_pred = cascade_predict(val_probs1, val_probs_m01, t1, tm01)
            sens, spec, _, bacc, _ = calculate_metrics(val_y_true, final_pred)

            if sens >= args.target_sens and spec >= args.target_spec:
                if bacc > best_bacc:
                    best_bacc = bacc
                    best_t1, best_tm01 = t1, tm01
                    best_sens, best_spec = sens, spec

    if best_t1 is None:
        print("\n[!] MATHEMATICALLY IMPOSSIBLE.")
        print(f"No threshold pair found that satisfies Sens >= {args.target_sens*100}% AND Spec >= {args.target_spec*100}% on the Cascade.")
        sys.exit(1)

    print(f"\n-> SUCCESS! Optimal Threshold Pair Found:")
    print(f"   Stage 1 Threshold : {best_t1:.4f}")
    print(f"   Stage M01 Threshold: {best_tm01:.4f}")
    print(f"   Val Sensitivity   : {best_sens:.4f}")
    print(f"   Val Specificity   : {best_spec:.4f}")
    print(f"   Val Balanced Acc  : {best_bacc:.4f}")

    # --- TEST PHASE ---
    print("\n[Testing Phase] Loading untouched Test Set...")
    test_loader = create_dataloader(TEST_DIR, "stage1", args.pipeline, batch_size=args.batch, augment=False, num_workers=args.workers)

    print("[Testing Phase] Running Model 1 predictions...")
    test_probs1, test_y_true = get_predictions(model1, test_loader)
    torch.cuda.empty_cache()

    print("[Testing Phase] Running Model 2 predictions...")
    test_probs_m01, _ = get_predictions(model_m01, test_loader)
    torch.cuda.empty_cache()

    final_pred = cascade_predict(test_probs1, test_probs_m01, best_t1, best_tm01)
    t_sens, t_spec, t_fnr, t_bacc, t_mcc = calculate_metrics(test_y_true, final_pred)

    # Count cascade stats
    pred1 = (test_probs1[:, 1] >= best_t1).astype(int)
    pred_m01 = (test_probs_m01[:, 1] >= best_tm01).astype(int)
    healthy_mask = (pred1 == 0)
    flipped = int(((pred1 == 0) & (pred_m01 == 1)).sum())

    print(f"\n--- Cascade Statistics ---")
    print(f"Images passed to Model 2: {healthy_mask.sum()}")
    print(f"Decisions flipped by Model 2: {flipped}")

    passed_sens = t_sens >= args.target_sens
    passed_spec = t_spec >= args.target_spec

    print(f"\n--- Final Generalization Results ---")
    print(f"Maintained >= {args.target_sens*100}% Sensitivity? {'YES' if passed_sens else 'NO'}")
    print(f"Maintained >= {args.target_spec*100}% Specificity? {'YES' if passed_spec else 'NO'}")
    print("-" * 50)
    print(f"Test Sensitivity : {t_sens:.4f}")
    print(f"Test Specificity : {t_spec:.4f}")
    print(f"Test FNR         : {t_fnr:.4f}")
    print(f"Test Balanced Acc: {t_bacc:.4f}")
    print(f"Test MCC         : {t_mcc:.4f}")

if __name__ == "__main__":
    main()
