import time
import numpy as np
import torch
import json
from pathlib import Path
from PIL import Image

# Import system modules
from run_inference import InferencePipeline
from src.preprocessing import RetinalPreprocessor
from src.xai import GradCAM, apply_heatmap
from src.llm_explainer import LLMExplainer
from src.iqa import assess_image_file

def run_timing_benchmark():
    print("==================================================")
    print(" AarogyaNetra End-to-End Latency Benchmark Engine")
    print("==================================================")

    # Pick a dummy or sample image
    img_path = Path("frontend/public/uploads")
    sample_imgs = list(img_path.glob("*.jpg")) + list(Path(".").glob("*.jpg"))
    if not sample_imgs:
        img = Image.fromarray((np.random.rand(512, 512, 3)*255).astype(np.uint8))
        test_img_path = "test_benchmark_fundus.jpg"
        img.save(test_img_path)
    else:
        test_img_path = str(sample_imgs[0])

    print(f"Using sample image for benchmark: {test_img_path}")
    
    # 1. Benchmark IQA (Python fallback vs MATLAB if loaded)
    t0 = time.perf_counter()
    iqa_res = assess_image_file(test_img_path)
    t_iqa_py = (time.perf_counter() - t0) * 1000
    print(f"[1] Python IQA Gate Time: {t_iqa_py:.2f} ms")

    # 2. Benchmark Preprocessing & Tensor Normalization
    preprocessor = RetinalPreprocessor(pipeline_name="RGB")
    pil_img = Image.open(test_img_path).convert("RGB")
    t0 = time.perf_counter()
    proc_np = preprocessor.preprocess_numpy(np.array(pil_img))
    import torchvision.transforms.functional as TF
    tensor_img = TF.to_tensor(proc_np)
    tensor_img = preprocessor.normalize_tensor(tensor_img).unsqueeze(0)
    if torch.cuda.is_available():
        tensor_img = tensor_img.to("cuda")
    t_prep = (time.perf_counter() - t0) * 1000
    print(f"[2] Preprocessing & Tensor Normalization: {t_prep:.2f} ms")

    # Initialize Inference Pipeline
    pipeline = InferencePipeline(seed=42)

    # Warmup runs for PyTorch engine
    _ = pipeline._predict("stage1", 2, tensor_img)
    _ = pipeline._predict("stage_m01", 2, tensor_img)

    # 3. Stage 1 Execution (M0ALL + Boundary M01)
    N_RUNS = 15
    t_s1_m0all = []
    t_s1_m01 = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        p_m0all = pipeline._predict("stage1", 2, tensor_img)
        t_s1_m0all.append((time.perf_counter() - t0)*1000)

        t0 = time.perf_counter()
        p_m01 = pipeline._predict("stage_m01", 2, tensor_img)
        t_s1_m01.append((time.perf_counter() - t0)*1000)

    avg_s1_m0all = float(np.mean(t_s1_m0all))
    avg_s1_m01 = float(np.mean(t_s1_m01))
    avg_stage1_total = avg_s1_m0all + avg_s1_m01
    print(f"[3] Stage 1 - Global Model (M0ALL): {avg_s1_m0all:.2f} ms")
    print(f"[3] Stage 1 - Boundary Evaluator (M01): {avg_s1_m01:.2f} ms")
    print(f"[3] Stage 1 - Total Combined: {avg_stage1_total:.2f} ms")

    # 4. Stage 2 Execution (M1234 + Boundary Evaluators M12, M23, M34)
    t_s2_m1234 = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        p_m1234 = pipeline._predict("stage2", 4, tensor_img)
        t_s2_m1234.append((time.perf_counter() - t0)*1000)

    avg_s2_m1234 = float(np.mean(t_s2_m1234))

    # Boundary Evaluators timing (M12, M23, M34)
    t_boundaries = {}
    for b_name in ["stage_m12", "stage_m23", "stage_m34"]:
        _ = pipeline._predict(b_name, 2, tensor_img)
        t_list = []
        for _ in range(N_RUNS):
            t0 = time.perf_counter()
            _ = pipeline._predict(b_name, 2, tensor_img)
            t_list.append((time.perf_counter() - t0)*1000)
        t_boundaries[b_name] = float(np.mean(t_list))

    print(f"[4] Stage 2 - Global Multi-class (M1234): {avg_s2_m1234:.2f} ms")
    print(f"[4] Boundary Evaluator M12: {t_boundaries['stage_m12']:.2f} ms")
    print(f"[4] Boundary Evaluator M23: {t_boundaries['stage_m23']:.2f} ms")
    print(f"[4] Boundary Evaluator M34: {t_boundaries['stage_m34']:.2f} ms")
    
    avg_stage2_active = avg_s2_m1234 + t_boundaries['stage_m12'] + t_boundaries['stage_m23']
    print(f"[4] Stage 2 - Total Active DR Path (M1234 + 2 Boundary Models): {avg_stage2_active:.2f} ms")

    # 5. Grad-CAM (XAI Layer) Execution
    model_cam = pipeline.models["stage1"]
    cam_gen = GradCAM(model_cam, target_layer_name="conv_head")
    t_gradcam = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        hmap = cam_gen.generate(tensor_img, target_class_idx=0)
        t_gradcam.append((time.perf_counter() - t0)*1000)
    cam_gen.remove_hooks()
    avg_gradcam = float(np.mean(t_gradcam))
    print(f"[5] XAI Layer (Grad-CAM Generation): {avg_gradcam:.2f} ms")

    # 6. RAG / LLM Explainer Layer
    explainer = LLMExplainer()
    dummy_result = {
        "Final_Grade": "Grade 2 (Moderate DR)",
        "Stage1": {"Fused_DR_Prob": 0.88, "Status": "DR Detected"},
        "Stage2": {"Final_Grade": "Grade 2", "M1234_Argmax": 2},
        "language": "en"
    }
    t0 = time.perf_counter()
    exp_res = explainer.generate_explanation(dummy_result)
    t_rag = (time.perf_counter() - t0)*1000
    print(f"[6] RAG / LLM Explainer Layer: {t_rag:.2f} ms")

    # 7. Total End-to-End Pipeline Summary
    total_no_dr = t_iqa_py + t_prep + avg_stage1_total + avg_gradcam + t_rag
    total_dr = t_iqa_py + t_prep + avg_stage1_total + avg_stage2_active + avg_gradcam + t_rag

    summary = {
        "iqa_python_ms": t_iqa_py,
        "iqa_matlab_est_ms": 120.0,
        "preprocessing_ms": t_prep,
        "stage1_m0all_ms": avg_s1_m0all,
        "stage1_m01_ms": avg_s1_m01,
        "stage1_total_ms": avg_stage1_total,
        "stage2_m1234_ms": avg_s2_m1234,
        "boundary_evaluator_m12_ms": t_boundaries['stage_m12'],
        "boundary_evaluator_m23_ms": t_boundaries['stage_m23'],
        "boundary_evaluator_m34_ms": t_boundaries['stage_m34'],
        "stage2_active_total_ms": avg_stage2_active,
        "gradcam_xai_ms": avg_gradcam,
        "rag_llm_explainer_ms": t_rag,
        "total_e2e_no_dr_ms": total_no_dr,
        "total_e2e_dr_ms": total_dr
    }

    with open("latency_benchmark_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\n==================================================")
    print(" BENCHMARK SUMMARY (Saved to latency_benchmark_results.json)")
    print(f" End-to-End Latency (No DR Path): {total_no_dr:.2f} ms ({total_no_dr/1000:.3f} s)")
    print(f" End-to-End Latency (DR Detected Path): {total_dr:.2f} ms ({total_dr/1000:.3f} s)")
    print("==================================================")

if __name__ == "__main__":
    run_timing_benchmark()
