"""
AarogyaNetra - Representation & Dataset Module
===============================================
PyTorch Dataset and DataLoader implementations for representation benchmarking.
Implements REP-001..REP-004 and DS-001..DS-005.
"""

import os
import random
import hashlib
from pathlib import Path
from typing import List, Tuple, Optional, Union

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms.functional as TF
from PIL import Image

from src.preprocessing import RetinalPreprocessor, PIPE_STATS


class AarogyaNetraDataset(Dataset):
    """
    PyTorch Dataset for AarogyaNetra Retinal Fundus Images.
    Integrates RetinalPreprocessor executing the FR-003 sequential pipeline.
    """

    def __init__(
        self,
        root_dir: Union[str, Path],
        stage: str = "stage1",
        pipeline_name: str = "RGB",
        target_size: Tuple[int, int] = (224, 224),
        augment: bool = False,
        enable_border_crop: bool = True,
        enable_illumination: bool = False,
        split: str = "all"
    ):
        self.root_dir = Path(root_dir)
        self.stage = stage
        self.pipeline_name = pipeline_name
        self.augment = augment
        self.preprocessor = RetinalPreprocessor(
            pipeline_name=pipeline_name,
            target_size=target_size,
            enable_border_crop=enable_border_crop,
            enable_illumination=enable_illumination
        )

        # Boundary validators use binary labelling over adjacent grade pairs
        BOUNDARY_STAGES = {
            "stage_m01": (["0", "1"],   {"0": 0, "1": 1}),
            "stage_m12": (["1", "2"],   {"1": 0, "2": 1}),
            "stage_m23": (["2", "3"],   {"2": 0, "3": 1}),
            "stage_m34": (["3", "4"],   {"3": 0, "4": 1}),
        }

        if stage == "stage1":
            folders = ["0", "1", "2", "3", "4"]
            label_map = None
        elif stage in BOUNDARY_STAGES:
            folders, label_map = BOUNDARY_STAGES[stage]
        else:  # stage2: grade 1-4 → labels 0-3
            folders = ["1", "2", "3", "4"]
            label_map = None

        self.samples: List[Tuple[str, int]] = []
        seen = set()

        for folder in folders:
            folder_path = self.root_dir / folder
            if not folder_path.exists():
                continue
            for fpath in folder_path.iterdir():
                if fpath.is_file() and fpath.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    key = str(fpath).lower()
                    if key not in seen:
                        # Deterministic 80/20 split
                        if split != "all":
                            h = int(hashlib.md5(fpath.name.encode()).hexdigest(), 16) % 10
                            if split == "calib" and h >= 8:
                                continue
                            if split == "fusion" and h < 8:
                                continue

                        seen.add(key)
                        if label_map is not None:
                            label = label_map[folder]
                        elif stage == "stage1":
                            label = 0 if folder == "0" else 1
                        else:  # stage2
                            label = int(folder) - 1
                        self.samples.append((str(fpath), label))

        if not self.samples:
            raise RuntimeError(f"No valid fundus images found in {root_dir} for stage='{stage}'")

        self.labels = [s[1] for s in self.samples]

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        path, label = self.samples[idx]
        img_pil = Image.open(path).convert("RGB")
        
        # OPTIMIZATION: Shrink image to speed up CPU processing and ColorJitter
        img_pil.thumbnail((800, 800), Image.Resampling.LANCZOS)
        
        img_rgb = np.array(img_pil)

        # Execute FR-003 Preprocessing
        processed_np = self.preprocessor.preprocess_numpy(img_rgb)

        # Convert to PIL for data augmentation if enabled
        processed_pil = Image.fromarray(processed_np)

        if self.augment:
            if random.random() > 0.5:
                processed_pil = TF.hflip(processed_pil)
            if random.random() > 0.5:
                processed_pil = TF.vflip(processed_pil)
            angle = random.uniform(-15, 15)
            processed_pil = TF.rotate(processed_pil, angle)
            # Add ColorJitter for regularization against lighting
            if random.random() > 0.5:
                brightness_factor = random.uniform(0.8, 1.2)
                processed_pil = TF.adjust_brightness(processed_pil, brightness_factor)
            if random.random() > 0.5:
                contrast_factor = random.uniform(0.8, 1.2)
                processed_pil = TF.adjust_contrast(processed_pil, contrast_factor)

        # Convert to float tensor [0, 1] and normalize
        tensor_img = TF.to_tensor(processed_pil)
        tensor_img = self.preprocessor.normalize_tensor(tensor_img)

        return tensor_img, label


def create_dataloader(
    root_dir: Union[str, Path],
    stage: str = "stage1",
    pipeline_name: str = "RGB",
    target_size: Tuple[int, int] = (224, 224),
    batch_size: int = 16,
    augment: bool = False,
    num_workers: int = 0,
    enable_border_crop: bool = True,
    enable_illumination: bool = False,
    split: str = "all"
) -> DataLoader:
    """
    DataLoader factory function with class-balanced sampling for training sets.
    """
    dataset = AarogyaNetraDataset(
        root_dir=root_dir,
        stage=stage,
        pipeline_name=pipeline_name,
        target_size=target_size,
        augment=augment,
        enable_border_crop=enable_border_crop,
        enable_illumination=enable_illumination,
        split=split
    )

    if augment:
        # Class weighting for balanced sampling
        counts = np.bincount(dataset.labels)
        weights = 1.0 / (counts[dataset.labels] + 1e-6)
        sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)
        return DataLoader(
            dataset,
            batch_size=batch_size,
            sampler=sampler,
            num_workers=num_workers,
            pin_memory=torch.cuda.is_available()
        )

    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available()
    )
