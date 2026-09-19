"""
AarogyaNetra - Confidence Calibration Module
=============================================
Implements post-hoc confidence calibration techniques and metrics as specified in SRS v2.0 Section 3.7:
- Temperature Scaling
- Platt Scaling
- Expected Calibration Error (ECE) & Reliability Diagram metrics
"""

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import Tuple, Dict, Any


def compute_ece(confidences: np.ndarray, correctness: np.ndarray, n_bins: int = 10) -> Dict[str, Any]:
    """
    Computes Expected Calibration Error (ECE) and bin statistics for reliability diagrams.
    """
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    total_samples = len(confidences)

    bin_accs = []
    bin_confs = []
    bin_counts = []

    for i in range(n_bins):
        mask = (confidences >= bins[i]) & (confidences < bins[i + 1])
        count = mask.sum()
        bin_counts.append(count)
        if count > 0:
            acc = correctness[mask].mean()
            conf = confidences[mask].mean()
            bin_accs.append(acc)
            bin_confs.append(conf)
            ece += (count / total_samples) * abs(acc - conf)
        else:
            bin_accs.append(0.0)
            bin_confs.append(0.0)

    return {
        "ece": float(ece),
        "bin_accs": bin_accs,
        "bin_confs": bin_confs,
        "bin_counts": bin_counts,
        "bins": bins.tolist()
    }


class TemperatureScaler(nn.Module):
    """
    Learns a single scalar parameter T > 0 to scale logits: logits / T.
    """
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        return logits / self.temperature

    def fit(self, logits: torch.Tensor, labels: torch.Tensor, max_iter: int = 50, lr: float = 0.01):
        """Fits temperature T using Negative Log Likelihood loss on validation set."""
        optimizer = optim.LBFGS([self.temperature], lr=lr, max_iter=max_iter)
        criterion = nn.CrossEntropyLoss()

        def eval_loss():
            optimizer.zero_grad()
            loss = criterion(self.forward(logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval_loss)
        return self.temperature.item()
