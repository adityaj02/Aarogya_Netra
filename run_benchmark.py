"""
AarogyaNetra - GPU Representation Benchmark Engine
==================================================
Executes GPU-accelerated representation benchmarking across 5 candidate pipelines:
(RGB, Green_CLAHE, Gray_CLAHE, LAB_L_CLAHE, MaxGreenGsc_CLAHE) on frozen 44,942-image baseline.
Implements REP-001..REP-004 as specified in SRS v2.0.
"""

import os
import sys
import logging
import warnings
from pathlib import Path

# Silence all HuggingFace, timm, and PyTorch deprecation warnings at startup
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("timm").setLevel(logging.ERROR)

sys.path.insert(0, str(Path(__file__).resolve().parent))

import json
import time
import random
import argparse
from copy import deepcopy
from typing import Dict, List, Any, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import timm
from sklearn.metrics import roc_auc_score, average_precision_score, confusion_matrix, roc_curve, matthews_corrcoef, balanced_accuracy_score

from src.representation import create_dataloader, PIPE_STATS



DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
TRAIN_DIR = BASE_DIR / "train"
VAL_DIR = BASE_DIR / "val"
TEST_DIR = BASE_DIR / "test"


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def build_model(num_classes: int) -> nn.Module:
    model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=num_classes, drop_rate=0.3)
    return model.to(DEVICE)


def train_one_epoch(model, loader, optimizer, criterion, scaler):
    model.train()
    total_loss = 0.0
    for imgs, labels in loader:
        imgs, labels = imgs.to(DEVICE, non_blocking=True), labels.to(DEVICE, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type="cuda", enabled=DEVICE.type == "cuda"):
            loss = criterion(model(imgs), labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        total_loss += loss.item() * imgs.size(0)
    return total_loss / len(loader.dataset)


def validate(model, loader, criterion):
    model.eval()
    total_loss = 0.0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(DEVICE, non_blocking=True), labels.to(DEVICE, non_blocking=True)
            with torch.autocast(device_type="cuda", enabled=DEVICE.type == "cuda"):
                loss = criterion(model(imgs), labels)
            total_loss += loss.item() * imgs.size(0)
    return total_loss / len(loader.dataset)


def train_model(model, train_loader, val_loader, num_epochs: int, lr: float = 1e-3) -> nn.Module:
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=num_epochs)
    scaler = torch.amp.GradScaler(enabled=DEVICE.type == "cuda")

    best_val_loss = float("inf")
    best_state = None
    patience_counter = 0
    patience = 4

    for epoch in range(1, num_epochs + 1):
        t0 = time.time()
        train_loss = train_one_epoch(model, train_loader, optimizer, criterion, scaler)
        val_loss = validate(model, val_loader, criterion)
        scheduler.step()
        print(f"    Epoch {epoch:02d}/{num_epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | {time.time()-t0:.1f}s")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = deepcopy(model.state_dict())
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"    Early stopping triggered at epoch {epoch}")
                break

    if best_state is not None:
        model.load_state_dict(best_state)
    return model


def get_predictions(model, loader) -> Tuple[np.ndarray, np.ndarray]:
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


def compute_ece(confidences: np.ndarray, correctness: np.ndarray, n_bins: int = 10) -> float:
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    n = len(confidences)
    for i in range(n_bins):
        mask = (confidences >= bins[i]) & (confidences < bins[i + 1])
        if mask.any():
            ece += mask.sum() / n * abs(correctness[mask].mean() - confidences[mask].mean())
    return float(ece)


def compute_qwk(y_true: np.ndarray, y_pred: np.ndarray, num_classes: int) -> float:
    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))
    n = cm.sum()
    if n == 0:
        return 0.0
    W = np.array([[(i - j) ** 2 / (num_classes - 1) ** 2 for j in range(num_classes)] for i in range(num_classes)])
    E = np.outer(cm.sum(axis=1) / n, cm.sum(axis=0) / n)
    denom = np.sum(W * E * n)
    if denom == 0:
        return 1.0
    return float(1.0 - np.sum(W * cm) / (denom + 1e-9))


def evaluate_stage1(model, val_loader, test_loader) -> dict:
    val_probs, val_y_true = get_predictions(model, val_loader)
    val_prob_dr = val_probs[:, 1]
    fpr, tpr, thresholds = roc_curve(val_y_true, val_prob_dr)
    opt_thresh = float(thresholds[np.argmax(tpr - fpr)])

    probs, y_true = get_predictions(model, test_loader)
    prob_dr = probs[:, 1]

    roc_auc = float(roc_auc_score(y_true, prob_dr))
    pr_auc = float(average_precision_score(y_true, prob_dr))

    pred = (prob_dr >= opt_thresh).astype(int)

    TP = int(((y_true == 1) & (pred == 1)).sum())
    TN = int(((y_true == 0) & (pred == 0)).sum())
    FP = int(((y_true == 0) & (pred == 1)).sum())
    FN = int(((y_true == 1) & (pred == 0)).sum())

    sensitivity = TP / (TP + FN + 1e-9)
    specificity = TN / (TN + FP + 1e-9)
    prec_dr = TP / (TP + FP + 1e-9)
    prec_0 = TN / (TN + FN + 1e-9)
    f1_dr = 2 * prec_dr * sensitivity / (prec_dr + sensitivity + 1e-9)
    f1_0 = 2 * prec_0 * specificity / (prec_0 + specificity + 1e-9)

    confidences = np.where(pred == 1, prob_dr, 1.0 - prob_dr)
    correctness = (pred == y_true).astype(float)
    mcc = float(matthews_corrcoef(y_true, pred))
    b_acc = float(balanced_accuracy_score(y_true, pred))

    return {
        "sensitivity": sensitivity, "specificity": specificity,
        "fnr": 1.0 - sensitivity, "macroF1": (f1_dr + f1_0) / 2.0,
        "qwk": compute_qwk(y_true, pred, 2),
        "ece": compute_ece(confidences, correctness),
        "roc_auc": roc_auc, "pr_auc": pr_auc, "opt_thresh": opt_thresh,
        "mcc": mcc, "balanced_acc": b_acc,
        "perClassRecall": [sensitivity, specificity],
    }


def evaluate_stage2(model, test_loader, num_classes: int = 4) -> dict:
    probs, y_true = get_predictions(model, test_loader)
    pred = np.argmax(probs, axis=1)

    per_class_recall, per_class_f1 = [], []
    for c in range(num_classes):
        TP = int(((y_true == c) & (pred == c)).sum())
        FP = int(((y_true != c) & (pred == c)).sum())
        FN = int(((y_true == c) & (pred != c)).sum())
        rec = TP / (TP + FN + 1e-9)
        prec = TP / (TP + FP + 1e-9)
        per_class_recall.append(rec)
        per_class_f1.append(2 * prec * rec / (prec + rec + 1e-9))

    sensitivity = float(np.mean(per_class_recall))
    macro_f1 = float(np.mean(per_class_f1))
    max_probs = probs.max(axis=1)
    correctness = (pred == y_true).astype(float)
    mcc = float(matthews_corrcoef(y_true, pred))
    b_acc = float(balanced_accuracy_score(y_true, pred))

    return {
        "sensitivity": sensitivity, "specificity": 0.0,
        "fnr": 1.0 - sensitivity, "macroF1": macro_f1,
        "qwk": compute_qwk(y_true, pred, num_classes),
        "ece": compute_ece(max_probs, correctness),
        "roc_auc": 0.0, "pr_auc": 0.0, "opt_thresh": 0.0,
        "mcc": mcc, "balanced_acc": b_acc,
        "perClassRecall": per_class_recall,
    }


def run_single(pipe_name: str, stage: str, seed: int, num_epochs: int, batch_size: int, num_workers: int = 0) -> dict:
    set_seed(seed)
    print(f"\n  [Seed {seed}] Pipeline: {pipe_name} | Stage: {stage}")
    num_classes = 2 if stage in ("stage1", "stage_m01", "stage_m12", "stage_m23", "stage_m34") else 4

    train_loader = create_dataloader(TRAIN_DIR, stage, pipe_name, batch_size=batch_size, augment=True, num_workers=num_workers)
    val_loader = create_dataloader(VAL_DIR, stage, pipe_name, batch_size=batch_size, augment=False, num_workers=num_workers)
    test_loader = create_dataloader(TEST_DIR, stage, pipe_name, batch_size=batch_size, augment=False, num_workers=num_workers)
    print(f"    Train: {len(train_loader.dataset)} | Val: {len(val_loader.dataset)} | Test: {len(test_loader.dataset)}")
    
    model = build_model(num_classes)
    model_path = BASE_DIR / f"{pipe_name}_{stage}_seed{seed}_model.pt"
    if model_path.exists():
        print(f"    Found existing weights for {pipe_name} {stage} seed {seed}. Skipping training!")
        model.load_state_dict(torch.load(model_path, weights_only=True))
    else:
        model = train_model(model, train_loader, val_loader, num_epochs)
        
    BINARY_STAGES = ("stage1", "stage_m01", "stage_m12", "stage_m23", "stage_m34")
    metrics = evaluate_stage1(model, val_loader, test_loader) if stage in BINARY_STAGES else evaluate_stage2(model, test_loader, num_classes)


    torch.save(model.state_dict(), BASE_DIR / f"{pipe_name}_{stage}_seed{seed}_model.pt")
    print(f"    -> Sensitivity: {metrics['sensitivity']:.4f} | MacroF1: {metrics['macroF1']:.4f} | QWK: {metrics['qwk']:.4f}")
    return metrics


def aggregate_metrics(metrics_list: list) -> dict:
    agg = {}
    for k in metrics_list[0].keys():
        vals = [m[k] for m in metrics_list]
        if isinstance(vals[0], list):
            arr = np.array(vals)  # shape: (n_seeds, num_classes)
            mean_val = np.mean(arr, axis=0).tolist()
            std_val  = np.std(arr, axis=0, ddof=1).tolist() if len(vals) > 1 else [0.0]*len(mean_val)
            ci_low   = (np.mean(arr, axis=0) - 1.96 * np.std(arr, axis=0, ddof=1) / np.sqrt(len(vals))).tolist() if len(vals) > 1 else mean_val
            ci_high  = (np.mean(arr, axis=0) + 1.96 * np.std(arr, axis=0, ddof=1) / np.sqrt(len(vals))).tolist() if len(vals) > 1 else mean_val
            agg[k] = {
                "mean": mean_val, "std": std_val,
                "ci_low": ci_low, "ci_high": ci_high
            }
        else:
            arr = np.array(vals)
            mean_val = float(np.mean(arr))
            std_val  = float(np.std(arr, ddof=1)) if len(vals) > 1 else 0.0
            ci_low   = float(mean_val - 1.96 * std_val / np.sqrt(len(vals))) if len(vals) > 1 else mean_val
            ci_high  = float(mean_val + 1.96 * std_val / np.sqrt(len(vals))) if len(vals) > 1 else mean_val
            agg[k] = {
                "mean": mean_val, "std": std_val,
                "ci_low": ci_low, "ci_high": ci_high
            }
    return agg


def fmt_stat(stat_dict: dict, field: str) -> str:
    """Format scalar metric as mean ± 95% CI string."""
    val = stat_dict.get(field, {})
    if isinstance(val, dict):
        m = val.get("mean", 0.0)
        low = val.get("ci_low", m)
        high = val.get("ci_high", m)
        return f"{m:.4f} [{low:.4f}-{high:.4f}]"
    return f"{val:.4f}"


def print_summary_table(results: list):
    print("\n" + "=" * 135)
    print("AAROGYANETRA REPRESENTATION BENCHMARK SUMMARY WITH 95% CONFIDENCE INTERVALS (REP-003)")
    print("=" * 135)
    print("\nSTAGE 1 (0 vs DR):")
    print(f"{'Pipeline':<18} {'Sens (Mean [95% CI])':<24} {'MacroF1 (Mean [95% CI])':<24} {'QWK (Mean [95% CI])':<24} {'MCC (Mean [95% CI])':<24}")
    print("-" * 115)
    for r in results:
        if r["stage"] == "Stage1":
            m = r["metrics"]
            sens_str = fmt_stat(m, "sensitivity")
            f1_str   = fmt_stat(m, "macroF1")
            qwk_str  = fmt_stat(m, "qwk")
            mcc_str  = fmt_stat(m, "mcc")
            print(f"{r['pipeline']:<18} {sens_str:<24} {f1_str:<24} {qwk_str:<24} {mcc_str:<24}")

    print("\nSTAGE M01 (0 vs 1 Boundary):")
    print(f"{'Pipeline':<18} {'Sens (Mean [95% CI])':<24} {'MacroF1 (Mean [95% CI])':<24} {'QWK (Mean [95% CI])':<24} {'MCC (Mean [95% CI])':<24}")
    print("-" * 115)
    for r in results:
        if r["stage"] == "StageM01":
            m = r["metrics"]
            sens_str = fmt_stat(m, "sensitivity")
            f1_str   = fmt_stat(m, "macroF1")
            qwk_str  = fmt_stat(m, "qwk")
            mcc_str  = fmt_stat(m, "mcc")
            print(f"{r['pipeline']:<18} {sens_str:<24} {f1_str:<24} {qwk_str:<24} {mcc_str:<24}")

    print("\nSTAGE 2 (1 vs 2 vs 3 vs 4):")
    print(f"{'Pipeline':<18} {'Sens (Mean [95% CI])':<24} {'MacroF1 (Mean [95% CI])':<24} {'QWK (Mean [95% CI])':<24} {'MCC (Mean [95% CI])':<24}")
    print("-" * 115)
    for r in results:
        if r["stage"] == "Stage2":
            m = r["metrics"]
            sens_str = fmt_stat(m, "sensitivity")
            f1_str   = fmt_stat(m, "macroF1")
            qwk_str  = fmt_stat(m, "qwk")
            mcc_str  = fmt_stat(m, "mcc")
            print(f"{r['pipeline']:<18} {sens_str:<24} {f1_str:<24} {qwk_str:<24} {mcc_str:<24}")

    for boundary_stage, boundary_label in [("StageM12", "M12 (1 vs 2)"), ("StageM23", "M23 (2 vs 3)"), ("StageM34", "M34 (3 vs 4)")]:
        matching = [r for r in results if r["stage"] == boundary_stage]
        if matching:
            print(f"\n{boundary_label} Boundary Validator:")
            print(f"{'Pipeline':<18} {'Sens (Mean [95% CI])':<24} {'MacroF1 (Mean [95% CI])':<24} {'QWK (Mean [95% CI])':<24} {'MCC (Mean [95% CI])':<24}")
            print("-" * 115)
            for r in matching:
                m = r["metrics"]
                print(f"{r['pipeline']:<18} {fmt_stat(m, 'sensitivity'):<24} {fmt_stat(m, 'macroF1'):<24} {fmt_stat(m, 'qwk'):<24} {fmt_stat(m, 'mcc'):<24}")
    print("=" * 135)


def save_results(results: list):
    out_json = BASE_DIR / "representation_benchmark_results.json"
    with open(out_json, "w") as f:
        json.dump(results, f, indent=2)

    import csv
    out_csv = BASE_DIR / "representation_benchmark_results.csv"
    with open(out_csv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Pipeline", "Stage", "Sensitivity", "Specificity", "FNR",
                    "MacroF1", "QWK", "ECE", "ROC_AUC", "PR_AUC", "MCC", "BalancedAcc", "R1", "R2", "R3", "R4"])
        for r in results:
            m = r["metrics"]
            def get_m(k):
                val = m.get(k, {})
                return val.get("mean", 0.0) if isinstance(val, dict) else val

            rc_dict = m.get("perClassRecall", {})
            rc = rc_dict.get("mean", [0.0]*4) if isinstance(rc_dict, dict) else [0.0]*4
            while len(rc) < 4:
                rc.append(0.0)

            w.writerow([r["pipeline"], r["stage"], get_m("sensitivity"), get_m("specificity"),
                        get_m("fnr"), get_m("macroF1"), get_m("qwk"), get_m("ece"), get_m("roc_auc"), get_m("pr_auc"),
                        get_m("mcc"), get_m("balanced_acc"), rc[0], rc[1], rc[2], rc[3]])

def main():
    parser = argparse.ArgumentParser(description="AarogyaNetra Preprocessing Representation Benchmark")
    parser.add_argument("--pipelines", nargs="+", default=["RGB", "Green_CLAHE", "Gray_CLAHE", "LAB_L_CLAHE", "MaxGreenGsc_CLAHE"])
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--seeds", nargs="+", type=int, default=[42, 100, 2026])
    parser.add_argument("--stages", nargs="+", default=["stage1", "stage_m01", "stage2"])
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--workers", type=int, default=0)
    args = parser.parse_args()

    import multiprocessing
    multiprocessing.freeze_support()

    print(f"Using Device: {DEVICE}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

    results = []
    out_json = BASE_DIR / "representation_benchmark_results.json"
    if out_json.exists():
        with open(out_json, "r") as f:
            try:
                results = json.load(f)
                print(f"Loaded {len(results)} existing results from {out_json}")
            except json.JSONDecodeError:
                pass
                
    completed_runs = {(r["pipeline"], r["stage"]) for r in results}

    t_start = time.time()

    for pipe_name in args.pipelines:
        print(f"\n{'='*60}\nPIPELINE: {pipe_name}\n{'='*60}")
        for stage_label in args.stages:
            STAGE_DISPLAY = {
                "stage1":     "Stage1",
                "stage_m01":  "StageM01",
                "stage2":     "Stage2",
                "stage_m12":  "StageM12",
                "stage_m23":  "StageM23",
                "stage_m34":  "StageM34",
            }
            stage_display = STAGE_DISPLAY.get(stage_label, stage_label)
            
            if (pipe_name, stage_display) in completed_runs:
                print(f"\n--- {stage_display} --- (SKIPPING, already completed)")
                continue

            print(f"\n--- {stage_display} ---")
            seed_metrics = [run_single(pipe_name, stage_label, seed, args.epochs, args.batch, args.workers) for seed in args.seeds]

            agg = aggregate_metrics(seed_metrics)
            results.append({"pipeline": pipe_name, "stage": stage_display, "metrics": agg, "per_seed": seed_metrics})
            
            save_results(results)
            print("    Results saved incrementally.")

    print(f"\nJSON results saved to: {out_json}")
    out_csv = BASE_DIR / "representation_benchmark_results.csv"
    print(f"CSV results saved to: {out_csv}")

    print(f"Total Benchmark Time: {(time.time() - t_start) / 3600:.2f} hours")
    print_summary_table(results)


if __name__ == "__main__":
    main()
