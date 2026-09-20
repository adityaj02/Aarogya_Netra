import time
import os
import torch
from pathlib import Path
from PIL import Image

from src.iqa_matlab import MatlabIQA
from src.preprocessing import RetinalPreprocessor
from src.decision_fusion import WeightedProbabilityFusion, LogOddsFusion
import timm

from src.xai import GradCAM
from src.llm_explainer import LLMExplainer
from src.tts.indic_tts import get_tts_service

def main():
    print("Loading models...")
    device = torch.device("cpu")
    iqa_engine = MatlabIQA()
    preprocessor = RetinalPreprocessor("RGB")
    llm = LLMExplainer()
    
    # Load ML models
    m0_all = timm.create_model('resnet50', pretrained=False, num_classes=2).to(device)
    m0_1 = timm.create_model('resnet50', pretrained=False, num_classes=2).to(device)
    m1234 = timm.create_model('resnet50', pretrained=False, num_classes=4).to(device)
    m0_all.eval()
    m0_1.eval()
    m1234.eval()
    
    grad_cam = GradCAM(m1234, target_layer_name="layer4")
    
    # Collect 20 images from dataset
    dataset_dir = Path("/app/archive (1)/master_dataset_baseline/test")
    if not dataset_dir.exists():
        dataset_dir = Path("/app/models") # fallback if no dataset mounted
    
    image_paths = []
    
    # Ensure there's a valid fundus image for benchmarking
    dataset_dir = Path("/app/frontend/public/uploads")
    for ext in ["*_original.jpg", "*_original.png"]:
        image_paths.extend(list(dataset_dir.rglob(ext)))
    
    if len(image_paths) == 0:
        print("No images found in /app/frontend/public/uploads.")
        return
        
    # Repeat the same images to get at least 20 if there aren't enough
    while len(image_paths) < 20:
        image_paths.extend(image_paths)
    
    image_paths = image_paths[:20]
        
    print(f"Starting benchmark on {len(image_paths)} images...")
    
    timings = {
        "IQA": [],
        "Stage1": [],
        "Stage2": [],
        "GradCAM": [],
        "RAG": [],
        "TTS": [],
        "Total": []
    }
    
    for i, img_path in enumerate(image_paths):
        print(f"Processing image {i+1}/{len(image_paths)}...")
        img_path_str = str(img_path)
        start_total = time.time()
        
        # 1. IQA
        t0 = time.time()
        _ = iqa_engine.assess(img_path_str)
        timings["IQA"].append((time.time() - t0) * 1000)
        
        # Preprocessing
        img = Image.open(img_path_str).convert("RGB")
        _ = preprocessor.preprocess_pil(img)
        tensor = torch.randn(1, 3, 224, 224).to(device)
        
        # 2. Stage 1
        t0 = time.time()
        with torch.no_grad():
            _ = m0_all(tensor)
            _ = m0_1(tensor)
        timings["Stage1"].append((time.time() - t0) * 1000)
        
        # 3. Stage 2
        t0 = time.time()
        with torch.no_grad():
            logits = m1234(tensor)
        timings["Stage2"].append((time.time() - t0) * 1000)
        
        # 4. GradCAM
        t0 = time.time()
        _ = grad_cam.generate(tensor, target_class_idx=3)
        timings["GradCAM"].append((time.time() - t0) * 1000)
        
        # 5. RAG / LLM
        mock_result = {
            "probabilities": {
                "Final_Grade": "Grade 3",
                "Stage1": {"Status": "DR Detected"},
                "Stage2": {"Fused_Probs": {"Grade 3": 0.95}}
            }
        }
        t0 = time.time()
        _ = llm.generate_explanation(mock_result)
        timings["RAG"].append((time.time() - t0) * 1000)
        
        # 6. TTS
        t0 = time.time()
        _ = get_tts_service().synthesize("This is a test explanation for the benchmark.", "en")
        timings["TTS"].append((time.time() - t0) * 1000)
        
        timings["Total"].append((time.time() - start_total) * 1000)
        
    print("\n--- Benchmark Results (Averages over 20 runs) ---")
    for key, values in timings.items():
        avg_ms = sum(values) / len(values)
        print(f"{key}: {avg_ms:.2f} ms")

if __name__ == "__main__":
    main()
