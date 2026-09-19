import os
import sys
import json
import torch
import numpy as np
from pathlib import Path
from sklearn.metrics import matthews_corrcoef, balanced_accuracy_score

# Suppress warnings
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN_WARNING"] = "1"
import warnings
warnings.filterwarnings("ignore")

import timm
from src.representation import create_dataloader

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
TEST_DIR = BASE_DIR / "test"

def build_model(num_classes: int) -> torch.nn.Module:
    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)
    return model.to(DEVICE)

def get_predictions(model, loader):
    model.eval()
    softmax = torch.nn.Softmax(dim=1)
    all_probs, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(DEVICE, non_blocking=True)
            with torch.autocast(device_type="cuda", enabled=DEVICE.type == "cuda"):
                logits = model(imgs)
            all_probs.append(softmax(logits).cpu().numpy())
            all_labels.append(labels.numpy())
    return np.concatenate(all_probs), np.concatenate(all_labels)

def aggregate_metrics(metrics_list: list) -> dict:
    agg = {}
    for k in metrics_list[0].keys():
        vals = [m[k] for m in metrics_list]
        if isinstance(vals[0], list):
            arr = np.array(vals)
            mean_val = np.mean(arr, axis=0).tolist()
            std_val  = np.std(arr, axis=0, ddof=1).tolist() if len(vals) > 1 else [0.0]*len(mean_val)
            ci_low   = (np.mean(arr, axis=0) - 1.96 * np.std(arr, axis=0, ddof=1) / np.sqrt(len(vals))).tolist() if len(vals) > 1 else mean_val
            ci_high  = (np.mean(arr, axis=0) + 1.96 * np.std(arr, axis=0, ddof=1) / np.sqrt(len(vals))).tolist() if len(vals) > 1 else mean_val
            agg[k] = {"mean": mean_val, "std": std_val, "ci_low": ci_low, "ci_high": ci_high}
        else:
            arr = np.array(vals)
            mean_val = float(np.mean(arr))
            std_val  = float(np.std(arr, ddof=1)) if len(vals) > 1 else 0.0
            ci_low   = float(mean_val - 1.96 * std_val / np.sqrt(len(vals))) if len(vals) > 1 else mean_val
            ci_high  = float(mean_val + 1.96 * std_val / np.sqrt(len(vals))) if len(vals) > 1 else mean_val
            agg[k] = {"mean": mean_val, "std": std_val, "ci_low": ci_low, "ci_high": ci_high}
    return agg

def save_csv(results):
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
            while len(rc) < 4: rc.append(0.0)

            w.writerow([r["pipeline"], r["stage"], get_m("sensitivity"), get_m("specificity"),
                        get_m("fnr"), get_m("macroF1"), get_m("qwk"), get_m("ece"), get_m("roc_auc"), get_m("pr_auc"),
                        get_m("mcc"), get_m("balanced_acc"), rc[0], rc[1], rc[2], rc[3]])

def main():
    json_path = BASE_DIR / "representation_benchmark_results.json"
    with open(json_path, "r") as f:
        results = json.load(f)
        
    pipelines_to_fix = ["RGB", "Green_CLAHE", "Gray_CLAHE"]
    seeds = [42, 100, 2026]
    
    for r in results:
        pipe = r["pipeline"]
        stage = r["stage"]
        if pipe in pipelines_to_fix and stage in ["Stage1", "StageM01"]:
            print(f"Fixing {pipe} {stage}...")
            stage_str = "stage1" if stage == "Stage1" else "stage_m01"
            
            # Use test_loader matching stage1 format so it's correct for M01 if M01 was evaluated on M01 specific test set
            # Wait, StageM01 evaluate was run on StageM01 test set (which only has 0 and 1).
            # So we must create dataloader with the EXACT stage string!
            loader = create_dataloader(TEST_DIR, stage_str, pipe, batch_size=32, augment=False, num_workers=2)
            
            for i, seed in enumerate(seeds):
                opt_thresh = r["per_seed"][i]["opt_thresh"]
                model_path = BASE_DIR / f"{pipe}_{stage_str}_seed{seed}_model.pt"
                
                model = build_model(2)
                model.load_state_dict(torch.load(model_path, map_location=DEVICE, weights_only=True))
                
                probs, y_true = get_predictions(model, loader)
                pred = (probs[:, 1] >= opt_thresh).astype(int)
                
                mcc = float(matthews_corrcoef(y_true, pred))
                b_acc = float(balanced_accuracy_score(y_true, pred))
                
                r["per_seed"][i]["mcc"] = mcc
                r["per_seed"][i]["balanced_acc"] = b_acc
                print(f"  Seed {seed} -> MCC: {mcc:.4f} | B_Acc: {b_acc:.4f}")
                
            r["metrics"] = aggregate_metrics(r["per_seed"])
            
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
        
    save_csv(results)
    print("\nLegacy metrics fixed and saved to JSON and CSV!")

if __name__ == "__main__":
    main()
