"""
Quick smoke test for the MATLAB IQA bridge.
Usage:
    python test_iqa.py                      # tests with a sample from uploads/
    python test_iqa.py path/to/image.jpg    # tests with a specific image
"""
import sys
import os

# ---------------------------------------------------------------------------
# Pick an image to test with
# ---------------------------------------------------------------------------
if len(sys.argv) > 1:
    image_path = sys.argv[1]
else:
    # Auto-pick the first .jpg/.png found in uploads/
    upload_dir = "frontend/public/uploads"
    candidates = [
        os.path.join(upload_dir, f)
        for f in os.listdir(upload_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]
    if not candidates:
        print("No images found in frontend/public/uploads/")
        print("Provide an image path as an argument:  python test_iqa.py path/to/image.jpg")
        sys.exit(1)
    image_path = candidates[0]

print(f"\n Testing image: {image_path}")
print("-" * 60)

# ---------------------------------------------------------------------------
# Run IQA
# ---------------------------------------------------------------------------
from src.iqa_matlab import MatlabIQA

print("Starting MATLAB engine (this takes ~15s the first time)...")
iqa = MatlabIQA(matlab_path=r"D:\Projects\AarogyaNetra\src\IQA_Matlab")

result = iqa.assess(image_path)
iqa.close()

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
status = result["status"]
icon   = "[PASS]" if status == "ACCEPT" else "[FAIL]"

print(f"\n {icon}  Status    : {status}")
print(f"    Reason    : {result['reason']}")
print(f"    FOV Ratio : {result['fovRatio']:.3f}  (min 0.15)")
print(f"    Brightness: {result['brightness']:.1f}  (range 20–240)")
print(f"    Dark Ratio: {result['darkRatio']:.3f}  (max 0.15)")
print(f"    Blur Score: {result['blurScore']:.2f}  (min 3.0)")
print("-" * 60)

if status == "ACCEPT":
    print(" >> Image would PASS to PyTorch pipeline.")
else:
    print(f" >> Image would be REJECTED -- frontend returns UNGRADABLE / RECAPTURE.")
print()
