import os
from pathlib import Path
from tqdm import tqdm
from run_inference import InferencePipeline

BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
TEST_DIR = BASE_DIR / "test" / "1"

def main():
    pipeline = InferencePipeline(seed=42)
    images = list(TEST_DIR.glob("*.jpg"))
    total = len(images)
    false_negatives = 0
    
    print(f"Testing {total} Grade 1 images...")
    
    for img_path in tqdm(images[:100]):
        res = pipeline.run(str(img_path))
        status = res.get("Stage1", {}).get("Status", "No DR")
        if status == "No DR":
            false_negatives += 1
            print(f"FN Image: {img_path.name} | P_M0ALL: {res['Stage1']['P_M0ALL_DR']:.4f} | P_M01: {res['Stage1']['P_M01_DR']:.4f} | Fused: {res['Stage1']['Fused_DR_Prob']:.4f}")
            
    print(f"\nTested 100 images. False Negatives: {false_negatives} (FN Rate: {false_negatives/100:.2%})")

if __name__ == "__main__":
    main()
