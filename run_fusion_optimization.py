import os
import json
import torch
import numpy as np
import timm
from pathlib import Path
from sklearn.metrics import confusion_matrix, matthews_corrcoef, f1_score, balanced_accuracy_score, cohen_kappa_score
import pandas as pd
from datetime import datetime

from src.representation import create_dataloader
from src.decision_fusion import WeightedProbabilityFusion, LogOddsFusion

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
SEED = 42

STAGES = ["stage1", "stage_m01", "stage2", "stage_m12", "stage_m23", "stage_m34"]
NUM_CLASSES = {"stage1": 2, "stage_m01": 2, "stage2": 4, "stage_m12": 2, "stage_m23": 2, "stage_m34": 2}

def load_calibrated_temperatures():
    temp_path = BASE_DIR / "calibrated_temperatures.json"
    if temp_path.exists():
        with open(temp_path, "r") as f:
            return json.load(f)
    print("Warning: calibrated_temperatures.json not found! Using T=1.0")
    return {}

def extract_logits_for_all_models():
    """Extracts probabilities for ALL models on the 20% fusion validation split."""
    print("Precomputing probabilities on the fusion validation set...")
    loader = create_dataloader(BASE_DIR / "val", "stage1", "RGB", batch_size=32, augment=False, split="fusion")
    
    true_grades = []
    for path, _ in loader.dataset.samples:
        grade = int(Path(path).parent.name)
        true_grades.append(grade)
    true_grades = np.array(true_grades)
    
    # Store probability outputs
    outputs = {}
    temps = load_calibrated_temperatures()
    
    for stage in STAGES:
        print(f"  Extracting for {stage}...")
        model_path = BASE_DIR / f"RGB_{stage}_seed{SEED}_model.pt"
        if not model_path.exists():
            raise FileNotFoundError(f"Missing model: {model_path}")
            
        model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=NUM_CLASSES[stage])
        model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        model.to(DEVICE)
        model.eval()
        
        stage_probs = []
        temp = temps.get(stage, {}).get("optimal_temperature_mean", 1.0)
        
        with torch.no_grad():
            for imgs, _ in loader:
                logits = model(imgs.to(DEVICE))
                scaled_logits = logits / temp
                probs = torch.softmax(scaled_logits, dim=1).cpu().numpy()
                stage_probs.append(probs)
        outputs[stage] = np.concatenate(stage_probs, axis=0)
        
    return true_grades, outputs

def _prob_to_logit(p, eps=1e-6):
    p = np.clip(p, eps, 1.0 - eps)
    return np.log(p / (1.0 - p))

def _logit_to_prob(l):
    return 1.0 / (1.0 + np.exp(-l))

def fast_fuse_stage1(p_m0all, p_m01, w_boundary, threshold, method="weighted"):
    w_parent = 1.0 - w_boundary
    if method == "weighted":
        fused_prob = w_parent * p_m0all + w_boundary * p_m01
    else:
        l_parent = _prob_to_logit(p_m0all)
        l_boundary = _prob_to_logit(p_m01)
        fused_prob = _logit_to_prob(w_parent * l_parent + w_boundary * l_boundary)
        
    return (fused_prob >= threshold).astype(int), fused_prob

def fast_fuse_stage2(p_m1234, boundary_probs, method="weighted"):
    N = p_m1234.shape[0]
    fused_probs = p_m1234.copy()
    argmax_g = np.argmax(p_m1234, axis=1) # 0 to 3
    
    for i in range(N):
        g = argmax_g[i]
        boundaries_to_apply = []
        if g == 0: boundaries_to_apply = ['m12']
        elif g == 1: boundaries_to_apply = ['m12', 'm23']
        elif g == 2: boundaries_to_apply = ['m23', 'm34']
        elif g == 3: boundaries_to_apply = ['m34']
        
        for b_name in boundaries_to_apply:
            b_idx = {'m12': (0,1), 'm23': (1,2), 'm34': (2,3)}[b_name]
            p_bound = boundary_probs[b_name]['probs'][i]
            w_bound = boundary_probs[b_name]['w']
            w_parent = 1.0 - w_bound
            
            i_idx, j_idx = b_idx
            sum_ij = fused_probs[i, i_idx] + fused_probs[i, j_idx]
            if sum_ij < 1e-9: continue
            
            p_parent_j = fused_probs[i, j_idx] / sum_ij
            
            if method == "weighted":
                p_fused_j = w_parent * p_parent_j + w_bound * p_bound
            else:
                l_parent_j = _prob_to_logit(p_parent_j)
                l_bound_j = _prob_to_logit(p_bound)
                p_fused_j = _logit_to_prob(w_parent * l_parent_j + w_bound * l_bound_j)
                
            fused_probs[i, j_idx] = sum_ij * p_fused_j
            fused_probs[i, i_idx] = sum_ij * (1.0 - p_fused_j)
            
    return fused_probs

def optimize_stage1(true_grades, outputs, target_sens=0.90):
    print(f"\n--- Stage 1 Optimization (Target Sens >= {target_sens}) ---")
    y_true = (true_grades > 0).astype(int)
    p_m0all = outputs["stage1"][:, 1]
    p_m01 = outputs["stage_m01"][:, 1]
    
    results = []
    best_config = None
    best_spec = -1
    best_mcc = -1
    
    for method in ["weighted", "logodds"]:
        for w_boundary in np.arange(0.0, 1.01, 0.05):
            for threshold in np.arange(0.1, 0.91, 0.05):
                preds, _ = fast_fuse_stage1(p_m0all, p_m01, w_boundary, threshold, method)
                
                tn, fp, fn, tp = confusion_matrix(y_true, preds, labels=[0,1]).ravel()
                sens = tp / (tp + fn) if (tp+fn)>0 else 0
                spec = tn / (tn + fp) if (tn+fp)>0 else 0
                mcc = matthews_corrcoef(y_true, preds)
                
                res = {
                    "stage": "stage1",
                    "method": method,
                    "weight_boundary": w_boundary,
                    "threshold": threshold,
                    "sensitivity": sens,
                    "specificity": spec,
                    "mcc": mcc
                }
                results.append(res)
                
                if sens >= target_sens:
                    if spec > best_spec or (spec == best_spec and mcc > best_mcc):
                        best_spec = spec
                        best_mcc = mcc
                        best_config = res
                        
    print(f"Best Stage 1 Config: {best_config}")
    return best_config, pd.DataFrame(results)

def optimize_stage2(true_grades, outputs, s1_config):
    print("\n--- Stage 2 End-to-End Optimization ---")
    p_m0all = outputs["stage1"][:, 1]
    p_m01 = outputs["stage_m01"][:, 1]
    s1_preds, _ = fast_fuse_stage1(p_m0all, p_m01, s1_config["weight_boundary"], s1_config["threshold"], s1_config["method"])
    
    p_m1234 = outputs["stage2"]
    p_m12 = outputs["stage_m12"][:, 1]
    p_m23 = outputs["stage_m23"][:, 1]
    p_m34 = outputs["stage_m34"][:, 1]
    
    results = []
    best_config = None
    best_qwk = -1
    
    for method in ["weighted", "logodds"]:
        for w12 in np.arange(0.0, 1.01, 0.2):
            for w23 in np.arange(0.0, 1.01, 0.2):
                for w34 in np.arange(0.0, 1.01, 0.2):
                    
                    b_probs = {
                        'm12': {'probs': p_m12, 'w': w12},
                        'm23': {'probs': p_m23, 'w': w23},
                        'm34': {'probs': p_m34, 'w': w34}
                    }
                    
                    s2_fused = fast_fuse_stage2(p_m1234, b_probs, method)
                    s2_preds = np.argmax(s2_fused, axis=1) + 1 # Grades 1-4
                    
                    final_preds = np.where(s1_preds == 0, 0, s2_preds)
                    
                    qwk = cohen_kappa_score(true_grades, final_preds, weights="quadratic")
                    macro_f1 = f1_score(true_grades, final_preds, average="macro")
                    
                    res = {
                        "stage": "stage2_end2end",
                        "method": method,
                        "w12": w12,
                        "w23": w23,
                        "w34": w34,
                        "qwk": qwk,
                        "macro_f1": macro_f1
                    }
                    results.append(res)
                    
                    if qwk > best_qwk:
                        best_qwk = qwk
                        best_config = res
                        
    print(f"Best Stage 2 Config: {best_config}")
    return best_config, pd.DataFrame(results)

def main():
    true_grades, outputs = extract_logits_for_all_models()
    
    s1_config, s1_df = optimize_stage1(true_grades, outputs, target_sens=0.90)
    
    if s1_config is None:
        print("Warning: No Stage 1 config met the 90% sensitivity threshold! Falling back to best MCC.")
        s1_config = s1_df.loc[s1_df['mcc'].idxmax()].to_dict()
        
    s2_config, s2_df = optimize_stage2(true_grades, outputs, s1_config)
    
    final_params = {
        "stage1": {
            "method": s1_config["method"],
            "boundary_weight": float(s1_config["weight_boundary"]),
            "threshold": float(s1_config["threshold"])
        },
        "stage2": {
            "M12": {"method": s2_config["method"], "boundary_weight": float(s2_config["w12"])},
            "M23": {"method": s2_config["method"], "boundary_weight": float(s2_config["w23"])},
            "M34": {"method": s2_config["method"], "boundary_weight": float(s2_config["w34"])}
        }
    }
    
    with open("optimal_fusion_params.json", "w") as f:
        json.dump(final_params, f, indent=2)
    with open(BASE_DIR / "optimal_fusion_params.json", "w") as f:
        json.dump(final_params, f, indent=2)
        
    full_df = pd.concat([s1_df, s2_df], ignore_index=True)
    full_df.to_csv("fusion_optimization_results.csv", index=False)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "validation_sample_count": len(true_grades),
        "constraint": "Sensitivity >= 0.90",
        "stage1_selected": {k: float(v) if isinstance(v, np.floating) else v for k, v in s1_config.items()},
        "stage2_selected": {k: float(v) if isinstance(v, np.floating) else v for k, v in s2_config.items()}
    }
    with open("fusion_optimization_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    print("\nOptimization complete! Saved parameters to optimal_fusion_params.json")

if __name__ == "__main__":
    main()
