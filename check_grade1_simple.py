import os
from pathlib import Path
from run_inference import InferencePipeline

BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
TEST_DIR = BASE_DIR / "test" / "1"

def main():
    pipeline = InferencePipeline(seed=42)
    images = list(TEST_DIR.glob("*.jpg"))
    total = len(images)
    false_negatives = 0
    
    with open("fns.txt", "w") as f:
        f.write(f"Testing {total} Grade 1 images...\n")
        for i, img_path in enumerate(images[:20]):
            res = pipeline.run(str(img_path))
            status = res.get("Stage1", {}).get("Status", "No DR")
            if status == "No DR":
                false_negatives += 1
                f.write(f"FN Image {i}: {img_path.name} | P_M0ALL: {res['Stage1']['P_M0ALL_DR']:.4f} | P_M01: {res['Stage1']['P_M01_DR']:.4f} | Fused: {res['Stage1']['Fused_DR_Prob']:.4f}\n")
        f.write(f"\nTested 20 images. False Negatives: {false_negatives}\n")

if __name__ == "__main__":
    main()
