import json
import numpy as np

def calculate_metrics_from_cm(cm):
    """Calculate metrics from a 5x5 confusion matrix (lists of lists)."""
    cm = np.array(cm)
    
    # cm[i, j] is true i, predicted j.
    # Class-wise sensitivities: TP_i / sum(row_i)
    sensitivities = []
    for i in range(5):
        denom = cm[i, :].sum()
        if denom == 0:
            sensitivities.append(0.0)
        else:
            sensitivities.append(cm[i, i] / denom)
            
    # G3/G4 -> G0
    g3_to_g0 = cm[3, 0]
    g4_to_g0 = cm[4, 0]
    high_severity_fn = g3_to_g0 + g4_to_g0
    
    return {
        "Grade 0 sensitivity": sensitivities[0],
        "Grade 1 sensitivity": sensitivities[1],
        "Grade 2 sensitivity": sensitivities[2],
        "Grade 3 sensitivity": sensitivities[3],
        "Grade 4 sensitivity": sensitivities[4],
        "G3/G4 -> G0": high_severity_fn
    }

def process_report(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # We want to average the metrics across the 3 seeds
    seeds_data = data["seed_details"]
    n = len(seeds_data)
    
    s1_sens = np.mean([s["stage1"]["sensitivity"] for s in seeds_data])
    s1_spec = np.mean([s["stage1"]["specificity"] for s in seeds_data])
    fnr = np.mean([s["stage1"]["fnr"] for s in seeds_data])
    mcc = np.mean([s["stage1"]["mcc"] for s in seeds_data])
    
    overall_qwk = np.mean([s["overall_5class"]["qwk"] for s in seeds_data])
    overall_f1 = np.mean([s["overall_5class"]["macro_f1"] for s in seeds_data])
    overall_acc = np.mean([s["overall_5class"]["accuracy"] for s in seeds_data])
    
    # For CM metrics, average across seeds
    all_g0_sens = []
    all_g1_sens = []
    all_g2_sens = []
    all_g3_sens = []
    all_g4_sens = []
    all_high_fn = []
    
    for s in seeds_data:
        cm_metrics = calculate_metrics_from_cm(s["overall_5class"]["confusion_matrix"])
        all_g0_sens.append(cm_metrics["Grade 0 sensitivity"])
        all_g1_sens.append(cm_metrics["Grade 1 sensitivity"])
        all_g2_sens.append(cm_metrics["Grade 2 sensitivity"])
        all_g3_sens.append(cm_metrics["Grade 3 sensitivity"])
        all_g4_sens.append(cm_metrics["Grade 4 sensitivity"])
        all_high_fn.append(cm_metrics["G3/G4 -> G0"])
        
    return {
        "Stage-1 sensitivity": f"{s1_sens:.4f}",
        "Stage-1 specificity": f"{s1_spec:.4f}",
        "FNR": f"{fnr:.4f}",
        "MCC": f"{mcc:.4f}",
        "Grade 0 sensitivity": f"{np.mean(all_g0_sens):.4f}",
        "Grade 1 sensitivity": f"{np.mean(all_g1_sens):.4f}",
        "Grade 2 sensitivity": f"{np.mean(all_g2_sens):.4f}",
        "Grade 3 sensitivity": f"{np.mean(all_g3_sens):.4f}",
        "Grade 4 sensitivity": f"{np.mean(all_g4_sens):.4f}",
        "G3/G4 \u2192 G0": f"{np.mean(all_high_fn):.1f}",
        "Overall 5-class QWK": f"{overall_qwk:.4f}",
        "Overall Macro-F1": f"{overall_f1:.4f}",
        "Overall accuracy": f"{overall_acc:.4f}"
    }

def main():
    old_file = "final_test_evaluation_report_architecture_frozen_weighted_v1.json"
    new_file = "final_test_evaluation_report_stage1_or_safety_net_experiment.json"
    
    metrics = [
        "Stage-1 sensitivity",
        "Stage-1 specificity",
        "FNR",
        "MCC",
        "Grade 0 sensitivity",
        "Grade 1 sensitivity",
        "Grade 2 sensitivity",
        "Grade 3 sensitivity",
        "Grade 4 sensitivity",
        "G3/G4 \u2192 G0",
        "Overall 5-class QWK",
        "Overall Macro-F1",
        "Overall accuracy"
    ]
    
    old_results = process_report(old_file)
    new_results = process_report(new_file)
    
    print("| Metric | Old frozen architecture | New OR rule |")
    print("|--------|-------------------------|-------------|")
    for m in metrics:
        print(f"| {m} | {old_results[m]} | {new_results[m]} |")
        
if __name__ == "__main__":
    main()
