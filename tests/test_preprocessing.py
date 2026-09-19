"""
Unit tests for AarogyaNetra Preprocessing and Representation Module
"""

import unittest
import numpy as np
import torch
from PIL import Image

from src.preprocessing import (
    remove_black_borders, resize_image, apply_clahe, apply_illumination_correction, RetinalPreprocessor
)
from src.representation import AarogyaNetraDataset


class TestPreprocessing(unittest.TestCase):

    def setUp(self):
        # Create a synthetic fundus-like image (black background with a colored circle in middle)
        self.img_np = np.zeros((400, 400, 3), dtype=np.uint8)
        cv2_circle = np.zeros((400, 400, 3), dtype=np.uint8)
        import cv2
        cv2.circle(cv2_circle, (200, 200), 120, (180, 100, 50), -1)
        self.img_np = cv2_circle

    def test_black_border_crop(self):
        cropped = remove_black_borders(self.img_np)
        self.assertLess(cropped.shape[0], 400)
        self.assertLess(cropped.shape[1], 400)
        self.assertGreater(cropped.shape[0], 200)

    def test_resize_image(self):
        resized = resize_image(self.img_np, (224, 224))
        self.assertEqual(resized.shape, (224, 224, 3))

    def test_clahe(self):
        gray = np.random.randint(0, 256, (100, 100), dtype=np.uint8)
        clahe_out = apply_clahe(gray)
        self.assertEqual(clahe_out.shape, (100, 100))

    def test_illumination_correction(self):
        corr = apply_illumination_correction(self.img_np)
        self.assertEqual(corr.shape, self.img_np.shape)

    def test_all_pipelines(self):
        pipelines = ["RGB", "Green_CLAHE", "Gray_CLAHE", "LAB_L_CLAHE", "MaxGreenGsc_CLAHE"]
        for pipe in pipelines:
            prep = RetinalPreprocessor(pipeline_name=pipe, target_size=(224, 224))
            out_np = prep.preprocess_numpy(self.img_np)
            self.assertEqual(out_np.shape, (224, 224, 3), f"Failed shape for pipeline {pipe}")


if __name__ == "__main__":
    unittest.main()
