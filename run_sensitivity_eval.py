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
    parser.add_argument("--pipeline", type=str, default="RGB", help="Pipeline name")
    parser.add_argument("--seed", type=int, default=42, help="Seed to evaluate")
    parser.add_argument("--target_sens", type=float, default=0.90, help="Target minimum sensitivity")
    parser.add_argument("--target_spec", type=float, default=0.85, help="Target minimum specificity")
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()

    print(f"=== Dual-Constraint Threshold Evaluation ===")
    print(f"Pipeline: {args.pipeline} | Seed: {args.seed}")
    print(f"Constraints -> Sens: >= {args.target_sens*100}% | Spec: >= {args.target_spec*100}%")

    model = build_model(2)
    model_path = BASE_DIR / f"{args.pipeline}_stage1_seed{args.seed}_model.pt"
    model.load_state_dict(torch.load(model_path, map_location=DEVICE, weights_only=True))
    
    print("\n[Validation Phase] Scanning all thresholds...")
    val_loader = create_dataloader(VAL_DIR, "stage1", args.pipeline, batch_size=args.batch, augment=False, num_workers=args.workers)
    val_probs, val_y_true = get_predictions(model, val_loader)
    
    fpr, tpr, thresholds = roc_curve(val_y_true, val_probs[:, 1])
    specificity = 1.0 - fpr
    
    # Find thresholds that satisfy BOTH constraints
    valid_idx = np.where((tpr >= args.target_sens) & (specificity >= args.target_spec))[0]
    
    if len(valid_idx) == 0:
        print("\n[!] MATHEMATICALLY IMPOSSIBLE ON SINGLE MODEL.")
        print(f"There is no threshold on the Validation set that hits Sens >={args.target_sens*100}% AND Spec >={args.target_spec*100}% simultaneously.")
        print("You must use the Cascaded System to achieve this.")
        sys.exit(1)
        
    # Among valid indices, find the one with the maximum balanced accuracy (or sum of sens + spec)
    best_idx = valid_idx[np.argmax(tpr[valid_idx] + specificity[valid_idx])]
    opt_thresh = thresholds[best_idx]
    
    val_pred = (val_probs[:, 1] >= opt_thresh).astype(int)
    v_sens, v_spec, v_fnr, v_bacc, v_mcc = calculate_metrics(val_y_true, val_pred)
    
    print(f"-> SUCCESS! 'Sweet Spot' Threshold Found: {opt_thresh:.4f}")
    print(f"-> Validation Performance: Sensitivity={v_sens:.4f} | Specificity={v_spec:.4f}")

    print("\n[Testing Phase] Generalizing to untouched Test Set...")
    test_loader = create_dataloader(TEST_DIR, "stage1", args.pipeline, batch_size=args.batch, augment=False, num_workers=args.workers)
    test_probs, test_y_true = get_predictions(model, test_loader)
    
    test_pred = (test_probs[:, 1] >= opt_thresh).astype(int)
    t_sens, t_spec, t_fnr, t_bacc, t_mcc = calculate_metrics(test_y_true, test_pred)

    passed_sens = t_sens >= args.target_sens
    passed_spec = t_spec >= args.target_spec

    print(f"\n--- Final Generalization Results ---")
    print(f"Maintained >= {args.target_sens*100}% Sensitivity? {'YES' if passed_sens else 'NO'}")
    print(f"Maintained >= {args.target_spec*100}% Specificity? {'YES' if passed_spec else 'NO'}")
    print("-" * 40)
    print(f"Test Sensitivity : {t_sens:.4f}")
    print(f"Test Specificity : {t_spec:.4f}")
    print(f"Test FNR         : {t_fnr:.4f}")
    print(f"Test Balanced Acc: {t_bacc:.4f}")
    print(f"Test MCC         : {t_mcc:.4f}")

if __name__ == "__main__":
    main()
