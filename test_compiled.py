import sys
import os
sys.path.append(os.path.abspath('matlab_compiled/FundusIQA'))

import FundusIQA
import matlab
import numpy as np
import cv2

print("Initializing FundusIQA...")
pkg = FundusIQA.initialize()
print("Initialized.")

# Read a test image
img = cv2.imread("archive (1)/master_dataset_baseline/M0ALL/train/mild/0024cdab0c1e.png")
if img is None:
    print("Test image not found, creating dummy.")
    img = np.zeros((224, 224, 3), dtype=np.uint8)

# Convert to MATLAB array
matlab_img = matlab.uint8(img.tolist())

print("Calling assessFundusQuality...")
result = pkg.assessFundusQuality(matlab_img)
print("Result:", result)

pkg.terminate()
print("Done.")
