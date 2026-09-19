import os
import json
import torch
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.metrics import (
    confusion_matrix, matthews_corrcoef, f1_score,
    accuracy_score, cohen_kappa_score
)
from tqdm import tqdm
from datetime import datetime

from src.representation import create_dataloader, AarogyaNetraDataset
from src.decision_fusion import WeightedProbabilityFusion, LogOddsFusion
import timm

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
VAL_DIR = BASE_DIR / "val"
SEEDS = [42, 100, 2026]

def load_calibrated_temps():
    temp_path = BASE_DIR / "calibrated_temperatures.json"
    if temp_path.exists():
        with open(temp_path, "r") as f:
            return json.load(f)
    return {}

def build_and_load_model(stage: str, num_classes: int, seed: int):
    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)
    model_path = BASE_DIR / f"RGB_{stage}_seed{seed}_model.pt"
    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

def precompute_validation_fusion_logits(seed: int):
    temps = load_calibrated_temps()
    dataset = AarogyaNetraDataset(VAL_DIR, pipeline_name="RGB", split="fusion", augment=False)
    loader = torch.utils.data.DataLoader(dataset, batch_size=32, shuffle=False, num_workers=2)
    
    file_paths = [img_path for img_path, _ in dataset.samples]
    true_grades = np.array([int(Path(fpath).parent.name) for fpath in file_paths])
    true_binary = (true_grades > 0).astype(int)
    
    stages = ["stage1", "stage_m01", "stage2", "stage_m12", "stage_m23", "stage_m34"]
    probs = {}
    
    for stage in stages:
        num_classes = 4 if stage == "stage2" else 2
        model = build_and_load_model(stage, num_classes, seed)
        temp = temps.get(stage, {}).get("optimal_temperature_mean", 1.0)
        
        all_probs = []
        with torch.no_grad():
            for imgs, _ in loader:
                imgs = imgs.to(DEVICE)
                logits = model(imgs) / temp
                p = torch.softmax(logits, dim=1).cpu().numpy()
                all_probs.append(p)
        probs[stage] = np.vstack(all_probs)
        torch.cuda.empty_cache()
        
    return true_grades, true_binary, probs

def evaluate_architecture_metrics(true_grades, pred_grades, s1_probs, s1_thresh=None):
    true_binary = (true_grades > 0).astype(int)
    
    if s1_thresh is not None:
        s1_pred = (s1_probs >= s1_thresh).astype(int)
        tn, fp, fn, tp = confusion_matrix(true_binary, s1_pred).ravel()
        sens_s1 = tp / (tp + fn + 1e-9)
        spec_s1 = tn / (tn + fp + 1e-9)
        mcc_s1 = matthews_corrcoef(true_binary, s1_pred)
    else:
        # Fallback to effectively evaluating the binary split induced by pred_grades > 0
        s1_pred = (pred_grades > 0).astype(int)
        tn, fp, fn, tp = confusion_matrix(true_binary, s1_pred).ravel()
        sens_s1 = tp / (tp + fn + 1e-9)
        spec_s1 = tn / (tn + fp + 1e-9)
        mcc_s1 = matthews_corrcoef(true_binary, s1_pred)
    
    # 5-Class Metrics
    acc = accuracy_score(true_grades, pred_grades)
    qwk = cohen_kappa_score(true_grades, pred_grades, weights="quadratic")
    macro_f1 = f1_score(true_grades, pred_grades, average="macro")
    cm = confusion_matrix(true_grades, pred_grades, labels=[0, 1, 2, 3, 4])
    
    # Per-class Recall (Sensitivity)
    per_class_sens = {}
    for g in range(5):
        mask = (true_grades == g)
        if mask.sum() > 0:
            per_class_sens[f"G{g}"] = float((pred_grades[mask] == g).sum() / mask.sum())
        else:
            per_class_sens[f"G{g}"] = 0.0
            
    # Breakdown of Stage-1 False Negatives by True Grade (True DR predicted as Grade 0)
    fn_breakdown = {}
    for g in range(1, 5):
        mask = (true_grades == g)
        if mask.sum() > 0:
            fn_cnt = int((pred_grades[mask] == 0).sum())
            fn_breakdown[f"True_G{g}_to_Pred_G0"] = fn_cnt
        else:
            fn_breakdown[f"True_G{g}_to_Pred_G0"] = 0
            
    # Dangerous Errors (Grade 0 <-> Grade 3/4)
    g0_mask = (true_grades == 0)
    g34_mask = (true_grades >= 3)
    dangerous_g0_to_g34 = int((pred_grades[g0_mask] >= 3).sum())
    dangerous_g34_to_g0 = int((pred_grades[g34_mask] == 0).sum())
    
    total_g34 = int(g34_mask.sum())
    severe_fn_rate = (dangerous_g34_to_g0 / total_g34) if total_g34 > 0 else 0.0
    
    return {
        "stage1_sens": float(sens_s1),
        "stage1_spec": float(spec_s1),
        "stage1_mcc": float(mcc_s1),
        "qwk": float(qwk),
        "macro_f1": float(macro_f1),
        "accuracy": float(acc),
        "per_class_sensitivity": per_class_sens,
        "fn_breakdown": fn_breakdown,
        "dangerous_errors": {
            "G0_to_G34": dangerous_g0_to_g34,
            "G34_to_G0": dangerous_g34_to_g0,
            "severe_fn_rate": float(severe_fn_rate),
            "severe_fn_count": dangerous_g34_to_g0,
            "severe_total": total_g34
        },
        "confusion_matrix": cm.tolist()
    }

def run_experiment_for_seed(seed: int):
    true_grades, true_binary, probs = precompute_validation_fusion_logits(seed)
    
    # Stage 1 Fused Probability (w_boundary = 0.25)
    fuser_s1 = WeightedProbabilityFusion(w_global=0.75, w_boundary=0.25)
    p_m0all = probs["stage1"][:, 1]
    p_m01 = probs["stage_m01"][:, 1]
    s1_fused_probs, _ = fuser_s1.fuse_stage1(p_m0all, p_m01)
    
    # Stage 2 Conditional Fused Probabilities P(G1..G4 | DR) using LogOdds
    p_m1234 = probs["stage2"]
    fuser_s2 = LogOddsFusion()
    weights_s2 = {'m12': 0.4, 'm23': 0.8, 'm34': 1.0}
    
    s2_fused_probs = np.zeros_like(p_m1234)
    for i in range(len(true_grades)):
        p_row = p_m1234[i]
        argmax_g = np.argmax(p_row) + 1
        b_probs = {}
        if argmax_g == 1:
            b_probs['m12'] = probs['stage_m12'][i, 1]
        elif argmax_g == 2:
            b_probs['m12'] = probs['stage_m12'][i, 1]
            b_probs['m23'] = probs['stage_m23'][i, 1]
        elif argmax_g == 3:
            b_probs['m23'] = probs['stage_m23'][i, 1]
            b_probs['m34'] = probs['stage_m34'][i, 1]
        elif argmax_g == 4:
            b_probs['m34'] = probs['stage_m34'][i, 1]
            
        s2_fused_probs[i] = fuser_s2.fuse_stage2(p_row, b_probs, weights=weights_s2)
        
    # --- 1. Stage-1 Threshold Sweep on Validation ---
    t_sweep_res = []
    for tau in [0.30, 0.35, 0.40, 0.45, 0.50]:
        s1_pred = (s1_fused_probs >= tau).astype(int)
        tn, fp, fn, tp = confusion_matrix(true_binary, s1_pred).ravel()
        t_sweep_res.append({
            "threshold": tau,
            "sensitivity": tp / (tp + fn + 1e-9),
            "specificity": tn / (tn + fp + 1e-9),
            "mcc": matthews_corrcoef(true_binary, s1_pred)
        })

    # --- 2. Architecture A: Hard Cascade ---
    arch_a_results = {}
    for tau in [0.30, 0.35, 0.40, 0.45, 0.50]:
        pred_arch_a = []
        for p_dr, p_s2 in zip(s1_fused_probs, s2_fused_probs):
            if p_dr < tau:
                pred_arch_a.append(0)
            else:
                pred_arch_a.append(np.argmax(p_s2) + 1)
        arch_a_results[f"tau_{tau:.2f}"] = evaluate_architecture_metrics(true_grades, np.array(pred_arch_a), s1_fused_probs, tau)

    # --- 3. Architecture B: Soft Probabilistic Cascade ---
    pred_arch_b = []
    for p_dr, p_s2 in zip(s1_fused_probs, s2_fused_probs):
        p5 = np.zeros(5)
        p5[0] = 1.0 - p_dr
        p5[1:] = p_dr * p_s2
        pred_arch_b.append(np.argmax(p5))
    # For soft cascade, we don't have a rigid threshold, but evaluate relative to true binary implicitly
    res_arch_b = evaluate_architecture_metrics(true_grades, np.array(pred_arch_b), s1_fused_probs, s1_thresh=None)

    # --- 4. Architecture C: Hybrid Safety Cascade ---
    hybrid_pairs = [
        (0.30, 0.50), (0.30, 0.55), (0.30, 0.60),
        (0.35, 0.50), (0.35, 0.55), (0.35, 0.60),
        (0.40, 0.50), (0.40, 0.55), (0.40, 0.60),
        (0.45, 0.55), (0.45, 0.60), (0.45, 0.65)
    ]
    res_arch_c_variants = {}
    for tau_low, tau_high in hybrid_pairs:
        pred_arch_c = []
        for p_dr, p_s2 in zip(s1_fused_probs, s2_fused_probs):
            if p_dr < tau_low:
                pred_arch_c.append(0)
            elif p_dr > tau_high:
                # Confident positive => Stage 2 posterior
                pred_arch_c.append(np.argmax(p_s2) + 1)
            else:
                # Uncertain => Joint 5-class
                p5 = np.zeros(5)
                p5[0] = 1.0 - p_dr
                p5[1:] = p_dr * p_s2
                pred_arch_c.append(np.argmax(p5))
        res_arch_c_variants[f"{tau_low:.2f}_{tau_high:.2f}"] = evaluate_architecture_metrics(
            true_grades, np.array(pred_arch_c), s1_fused_probs, s1_thresh=tau_low
        )

    return {
        "seed": seed,
        "stage1_threshold_sweep": t_sweep_res,
        "arch_a_hard": arch_a_results,
        "arch_b_soft": res_arch_b,
        "arch_c_hybrid": res_arch_c_variants
    }

def print_metrics_table(all_seed_results, hard_key, soft_data, hybrid_key):
    # Calculate means for each column
    def get_mean(metrics_path_fn):
        return np.mean([metrics_path_fn(r) for r in all_seed_results])

    def get_sum(metrics_path_fn):
        return np.sum([metrics_path_fn(r) for r in all_seed_results])

    def format_val(val, is_pct=False):
        if is_pct:
            return f"{val*100:.2f}%"
        return f"{val:.4f}"

    def extract_metrics(base_fn):
        return {
            "Stage-1 Sensitivity": format_val(get_mean(lambda r: base_fn(r)["stage1_sens"]), True),
            "Stage-1 Specificity": format_val(get_mean(lambda r: base_fn(r)["stage1_spec"]), True),
            "Stage-1 MCC": format_val(get_mean(lambda r: base_fn(r)["stage1_mcc"])),
            "G0 Sensitivity": format_val(get_mean(lambda r: base_fn(r)["per_class_sensitivity"]["G0"]), True),
            "G1 Sensitivity": format_val(get_mean(lambda r: base_fn(r)["per_class_sensitivity"]["G1"]), True),
            "G2 Sensitivity": format_val(get_mean(lambda r: base_fn(r)["per_class_sensitivity"]["G2"]), True),
            "G3 Sensitivity": format_val(get_mean(lambda r: base_fn(r)["per_class_sensitivity"]["G3"]), True),
            "G4 Sensitivity": format_val(get_mean(lambda r: base_fn(r)["per_class_sensitivity"]["G4"]), True),
            "5-class Accuracy": format_val(get_mean(lambda r: base_fn(r)["accuracy"]), True),
            "Macro F1": format_val(get_mean(lambda r: base_fn(r)["macro_f1"])),
            "QWK": format_val(get_mean(lambda r: base_fn(r)["qwk"])),
            "G3/4 → G0": f"{get_sum(lambda r: base_fn(r)['dangerous_errors']['G34_to_G0']):.0f}",
            "G0 → G3/4": f"{get_sum(lambda r: base_fn(r)['dangerous_errors']['G0_to_G34']):.0f}",
            "Severe FN Rate": format_val(get_mean(lambda r: base_fn(r)["dangerous_errors"]["severe_fn_rate"]), True)
        }

    m_hard = extract_metrics(lambda r: r["arch_a_hard"][hard_key])
    m_soft = extract_metrics(lambda r: r["arch_b_soft"])
    m_hybrid = extract_metrics(lambda r: r["arch_c_hybrid"][hybrid_key])

    rows = [
        "Stage-1 Sensitivity", "Stage-1 Specificity", "Stage-1 MCC",
        "G0 Sensitivity", "G1 Sensitivity", "G2 Sensitivity", "G3 Sensitivity", "G4 Sensitivity",
        "5-class Accuracy", "Macro F1", "QWK", "G3/4 → G0", "G0 → G3/4", "Severe FN Rate"
    ]
    
    print(f"{'Metric':<25} | {'Hard ('+hard_key+')':<15} | {'Soft':<15} | {'Hybrid ('+hybrid_key+')':<15}")
    print("-" * 77)
    for r in rows:
        print(f"{r:<25} | {m_hard[r]:<15} | {m_soft[r]:<15} | {m_hybrid[r]:<15}")

def print_confusion_matrices(all_seed_results, hard_key, hybrid_key):
    def get_cm_sum(base_fn):
        cms = [np.array(base_fn(r)["confusion_matrix"]) for r in all_seed_results]
        return np.sum(cms, axis=0)
        
    cm_hard = get_cm_sum(lambda r: r["arch_a_hard"][hard_key])
    cm_soft = get_cm_sum(lambda r: r["arch_b_soft"])
    cm_hybrid = get_cm_sum(lambda r: r["arch_c_hybrid"][hybrid_key])
    
    def print_cm(name, cm):
        print(f"\n{name} Confusion Matrix (Summed across seeds):")
        print("          Pred G0  Pred G1  Pred G2  Pred G3  Pred G4")
        for i in range(5):
            print(f"True G{i} | {cm[i][0]:>7d} {cm[i][1]:>8d} {cm[i][2]:>8d} {cm[i][3]:>8d} {cm[i][4]:>8d}")

    print_cm(f"Hard Cascade ({hard_key})", cm_hard)
    print_cm("Soft Probabilistic Cascade", cm_soft)
    print_cm(f"Hybrid Safety Cascade ({hybrid_key})", cm_hybrid)

def main():
    print("======================================================================")
    print("AAROGYANETRA - VALIDATION-ONLY ARCHITECTURE COMPARISON")
    print("======================================================================")
    print("Evaluating strictly on the 20% Validation Fusion Subset (`split='fusion'`)...")
    
    all_seed_results = []
    for seed in SEEDS:
        print(f"Running Validation Experiment for Seed {seed}...")
        res = run_experiment_for_seed(seed)
        all_seed_results.append(res)
        
    summary_report = {
        "timestamp": datetime.now().isoformat(),
        "dataset_split": "Validation 20% Fusion Subset (Zero Test Leakage)",
        "seeds": SEEDS,
        "seed_experiments": all_seed_results
    }
    
    report_path = BASE_DIR / "validation_architecture_experiment_report.json"
    with open(report_path, "w") as f:
        json.dump(summary_report, f, indent=2)
    with open("validation_architecture_experiment_report.json", "w") as f:
        json.dump(summary_report, f, indent=2)

    print("\n======================================================================")
    print("STAGE 1 THRESHOLD SWEEP SUMMARY (MEAN ACROSS 3 SEEDS)")
    print("======================================================================")
    for tau_idx, tau in enumerate([0.30, 0.35, 0.40, 0.45, 0.50]):
        sens_vals = [r["stage1_threshold_sweep"][tau_idx]["sensitivity"] for r in all_seed_results]
        spec_vals = [r["stage1_threshold_sweep"][tau_idx]["specificity"] for r in all_seed_results]
        mcc_vals = [r["stage1_threshold_sweep"][tau_idx]["mcc"] for r in all_seed_results]
        print(f"tau_DR = {tau:.2f} | Sens = {np.mean(sens_vals)*100:.2f}% | Spec = {np.mean(spec_vals)*100:.2f}% | MCC = {np.mean(mcc_vals):.4f}")

    print("\n======================================================================")
    print("HYBRID CASCADE VARIANTS SUMMARY (MEAN ACROSS 3 SEEDS)")
    print("======================================================================")
    print(f"{'tau_low':<7} | {'tau_high':<8} | {'QWK':<6} | {'Macro F1':<8} | {'Severe FN Rate':<14} | {'G3/4->G0':<8}")
    print("-" * 65)
    
    best_hybrid_key = None
    best_hybrid_score = -1
    
    hybrid_pairs = [
        (0.30, 0.50), (0.30, 0.55), (0.30, 0.60),
        (0.35, 0.50), (0.35, 0.55), (0.35, 0.60),
        (0.40, 0.50), (0.40, 0.55), (0.40, 0.60),
        (0.45, 0.55), (0.45, 0.60), (0.45, 0.65)
    ]
    for tau_low, tau_high in hybrid_pairs:
        k = f"{tau_low:.2f}_{tau_high:.2f}"
        qwk = np.mean([r["arch_c_hybrid"][k]["qwk"] for r in all_seed_results])
        f1 = np.mean([r["arch_c_hybrid"][k]["macro_f1"] for r in all_seed_results])
        s_fn = np.mean([r["arch_c_hybrid"][k]["dangerous_errors"]["severe_fn_rate"] for r in all_seed_results])
        g34_g0_sum = np.sum([r["arch_c_hybrid"][k]["dangerous_errors"]["G34_to_G0"] for r in all_seed_results])
        
        print(f"{tau_low:<7.2f} | {tau_high:<8.2f} | {qwk:.4f} | {f1:.4f}   | {s_fn*100:>5.2f}%         | {g34_g0_sum:.0f}")
        
        # Simple heuristic to pick the 'best' hybrid for the detailed table (maximize QWK - penalty for severe errors)
        score = qwk - (s_fn * 5)
        if score > best_hybrid_score:
            best_hybrid_score = score
            best_hybrid_key = k

    print("\n======================================================================")
    print("DETAILED COMPARISON TABLE")
    print("======================================================================")
    print_metrics_table(all_seed_results, hard_key="tau_0.45", soft_data=None, hybrid_key=best_hybrid_key)
    
    print("\n======================================================================")
    print("CONFUSION MATRICES")
    print("======================================================================")
    print_confusion_matrices(all_seed_results, hard_key="tau_0.45", hybrid_key=best_hybrid_key)
    
    print(f"\nSaved full experiment report to: {report_path}")

if __name__ == "__main__":
    main()
