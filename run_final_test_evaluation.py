import os
import json
import torch
import numpy as np
from pathlib import Path
from sklearn.metrics import (
    confusion_matrix, matthews_corrcoef, f1_score,
    balanced_accuracy_score, cohen_kappa_score, accuracy_score
)
import pandas as pd
from tqdm import tqdm
from datetime import datetime

from run_inference import InferencePipeline

BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
TEST_DIR = BASE_DIR / "test"
SEEDS = [42, 100, 2026]

def get_test_image_paths_and_labels():
    items = []
    for cls_dir in sorted(TEST_DIR.iterdir()):
        if cls_dir.is_dir():
            try:
                grade = int(cls_dir.name)
            except ValueError:
                continue
            for fpath in sorted(cls_dir.glob("*.jpg")):
                items.append((str(fpath), grade))
    return items

def main():
    print("======================================================================")
    print("AAROGYANETRA - FINAL UNTOUCHED TEST SET EVALUATION")
    print("======================================================================")
    
    test_items = get_test_image_paths_and_labels()
    print(f"Total Test Set Images: {len(test_items)}")
    
    true_grades = np.array([item[1] for item in test_items])
    true_binary_dr = (true_grades > 0).astype(int)
    
    seed_results = []
    
    for seed in SEEDS:
        print(f"\n---> Evaluating Seed {seed} on Test Set...")
        pipeline = InferencePipeline(seed=seed)
        
        preds_s1_status = []
        preds_s1_prob = []
        preds_final_grade = []
        
        for fpath, true_grade in tqdm(test_items, desc=f"Seed {seed}"):
            res = pipeline.run(fpath, generate_cams=False, generate_explanation=False)
            
            s1_prob = res.get("Stage1", {}).get("Fused_DR_Prob", 0.0)
            status = res.get("Stage1", {}).get("Status", "No DR")
            final_grade_str = res.get("Final_Grade", "Grade 0 (No DR)")
            
            preds_s1_prob.append(s1_prob)
            preds_s1_status.append(1 if status == "DR Detected" else 0)
            
            if "Grade 0" in final_grade_str:
                pred_g = 0
            elif "Grade 1" in final_grade_str:
                pred_g = 1
            elif "Grade 2" in final_grade_str:
                pred_g = 2
            elif "Grade 3" in final_grade_str:
                pred_g = 3
            elif "Grade 4" in final_grade_str:
                pred_g = 4
            else:
                pred_g = 0
                
            preds_final_grade.append(pred_g)
            
        preds_s1_status = np.array(preds_s1_status)
        preds_final_grade = np.array(preds_final_grade)
        
        # 1. Stage 1 Binary Referral Metrics
        tn, fp, fn, tp = confusion_matrix(true_binary_dr, preds_s1_status).ravel()
        sens = tp / (tp + fn + 1e-9)
        spec = tn / (tn + fp + 1e-9)
        fnr = fn / (tp + fn + 1e-9)
        s1_bacc = balanced_accuracy_score(true_binary_dr, preds_s1_status)
        s1_mcc = matthews_corrcoef(true_binary_dr, preds_s1_status)
        
        # 2. Stage 2 4-Class Severity Grading (on true DR > 0 images)
        dr_mask = (true_grades > 0)
        true_s2 = true_grades[dr_mask]
        pred_s2 = preds_final_grade[dr_mask]
        
        # Map 1..4 to 0..3 for sklearn metrics
        true_s2_mapped = true_s2 - 1
        pred_s2_mapped = np.clip(pred_s2 - 1, 0, 3)
        
        s2_qwk = cohen_kappa_score(true_s2_mapped, pred_s2_mapped, weights="quadratic")
        s2_macro_f1 = f1_score(true_s2_mapped, pred_s2_mapped, average="macro")
        s2_acc = accuracy_score(true_s2_mapped, pred_s2_mapped)
        
        # 3. Overall 5-Class System Evaluation
        overall_qwk = cohen_kappa_score(true_grades, preds_final_grade, weights="quadratic")
        overall_macro_f1 = f1_score(true_grades, preds_final_grade, average="macro")
        overall_acc = accuracy_score(true_grades, preds_final_grade)
        cm_5class = confusion_matrix(true_grades, preds_final_grade, labels=[0, 1, 2, 3, 4]).tolist()
        
        seed_res = {
            "seed": seed,
            "stage1": {
                "sensitivity": float(sens),
                "specificity": float(spec),
                "fnr": float(fnr),
                "balanced_accuracy": float(s1_bacc),
                "mcc": float(s1_mcc),
                "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn)
            },
            "stage2": {
                "qwk": float(s2_qwk),
                "macro_f1": float(s2_macro_f1),
                "accuracy": float(s2_acc)
            },
            "overall_5class": {
                "qwk": float(overall_qwk),
                "macro_f1": float(overall_macro_f1),
                "accuracy": float(overall_acc),
                "confusion_matrix": cm_5class
            }
        }
        seed_results.append(seed_res)
        
        print(f"--- Seed {seed} Results ---")
        print(f"  Stage 1 Referral: Sens = {sens:.4f} (>= 0.90 Target) | Spec = {spec:.4f} | MCC = {s1_mcc:.4f}")
        print(f"  Stage 2 4-Class : QWK = {s2_qwk:.4f} | Macro F1 = {s2_macro_f1:.4f}")
        print(f"  Overall 5-Class : QWK = {overall_qwk:.4f} | Macro F1 = {overall_macro_f1:.4f} | Acc = {overall_acc:.4f}")

    # Compute Summary Statistics across seeds
    s1_sens_vals = [r["stage1"]["sensitivity"] for r in seed_results]
    s1_spec_vals = [r["stage1"]["specificity"] for r in seed_results]
    s1_mcc_vals = [r["stage1"]["mcc"] for r in seed_results]
    s2_qwk_vals = [r["stage2"]["qwk"] for r in seed_results]
    overall_qwk_vals = [r["overall_5class"]["qwk"] for r in seed_results]
    overall_f1_vals = [r["overall_5class"]["macro_f1"] for r in seed_results]
    overall_acc_vals = [r["overall_5class"]["accuracy"] for r in seed_results]
    
    summary = {
        "stage1_sensitivity": f"{np.mean(s1_sens_vals):.4f} ± {np.std(s1_sens_vals):.4f}",
        "stage1_specificity": f"{np.mean(s1_spec_vals):.4f} ± {np.std(s1_spec_vals):.4f}",
        "stage1_mcc": f"{np.mean(s1_mcc_vals):.4f} ± {np.std(s1_mcc_vals):.4f}",
        "stage2_qwk": f"{np.mean(s2_qwk_vals):.4f} ± {np.std(s2_qwk_vals):.4f}",
        "overall_5class_qwk": f"{np.mean(overall_qwk_vals):.4f} ± {np.std(overall_qwk_vals):.4f}",
        "overall_5class_macro_f1": f"{np.mean(overall_f1_vals):.4f} ± {np.std(overall_f1_vals):.4f}",
        "overall_5class_accuracy": f"{np.mean(overall_acc_vals):.4f} ± {np.std(overall_acc_vals):.4f}",
    }
    
    full_report = {
        "timestamp": datetime.now().isoformat(),
        "total_test_images": len(test_items),
        "seeds_evaluated": SEEDS,
        "summary": summary,
        "seed_details": seed_results
    }
    
    with open("final_test_evaluation_baseline.json", "w") as f:
        json.dump(full_report, f, indent=2)
    with open(BASE_DIR / "final_test_evaluation_baseline.json", "w") as f:
        json.dump(full_report, f, indent=2)

    print("\n======================================================================")
    print("FINAL TEST EVALUATION SUMMARY (MEAN ± STD ACROSS 3 SEEDS)")
    print("======================================================================")
    for k, v in summary.items():
        print(f"  {k:30s}: {v}")
    print("======================================================================")
    print("Saved report to final_test_evaluation_baseline.json")

if __name__ == "__main__":
    main()
