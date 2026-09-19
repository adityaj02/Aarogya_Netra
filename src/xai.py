import torch
import torch.nn.functional as F
import numpy as np
import cv2
import logging
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)

class GradCAM:
    """
    Model-agnostic implementation of Grad-CAM.
    Attaches hooks to capture activations and gradients.
    """
    def __init__(self, model: torch.nn.Module, target_layer_name: str):
        self.model = model
        self.target_layer_name = target_layer_name
        self.gradients = None
        self.activations = None
        self.hooks = []
        self._register_hooks()

    def _register_hooks(self):
        target_layer = None
        for name, module in self.model.named_modules():
            if name == self.target_layer_name:
                target_layer = module
                break
        
        if target_layer is None:
            raise ValueError(f"Target layer '{self.target_layer_name}' not found in model.")

        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.hooks.append(target_layer.register_forward_hook(forward_hook))
        self.hooks.append(target_layer.register_full_backward_hook(backward_hook))

    def remove_hooks(self):
        """Clean up hooks to prevent memory leaks and stale tensors."""
        for hook in self.hooks:
            hook.remove()
        self.hooks = []
        self.gradients = None
        self.activations = None

    def generate(self, input_tensor: torch.Tensor, target_class_idx: int) -> np.ndarray:
        """
        Generate the Grad-CAM heatmap (2D numpy array [0,1]) for the given input and class.
        """
        # Ensure we can compute gradients
        was_training = self.model.training
        self.model.eval()
        
        self.model.zero_grad(set_to_none=True)
        input_tensor = input_tensor.clone().detach().requires_grad_(True)

        output = self.model(input_tensor)
        
        if self.activations is None:
            raise RuntimeError("Activations not populated. Target layer might not have been executed in forward pass.")

        # Compute gradient for the target class
        one_hot = torch.zeros_like(output)
        one_hot[0][target_class_idx] = 1.0
        
        output.backward(gradient=one_hot)

        if self.gradients is None:
            raise RuntimeError("Gradients not populated. Hook failed.")

        # alpha_k = global average pool of gradients
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
        
        # Weighted sum of activations
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        
        # ReLU
        cam = F.relu(cam)
        
        # Normalize to [0,1]
        cam = cam.cpu().numpy()[0, 0]
        cam_min, cam_max = cam.min(), cam.max()
        if cam_max - cam_min > 1e-9:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        logger.debug(
            "[Grad-CAM] layer=%s  act=%s  grad=%s  cam=%s  min=%.4f  max=%.4f  mean=%.4f  nonzero=%.3f",
            self.target_layer_name,
            tuple(self.activations.shape),
            tuple(self.gradients.shape),
            tuple(cam.shape),
            float(cam.min()),
            float(cam.max()),
            float(cam.mean()),
            float(np.mean(cam > 0)),
        )
        logger.debug("[Grad-CAM RAW]\n%s", np.round(cam, 3))
            
        if was_training:
            self.model.train()
            
        return cam

def apply_heatmap(original_pil_img: Image.Image, heatmap_2d: np.ndarray, save_path: Optional[str] = None, mask_full: Optional[np.ndarray] = None) -> Image.Image:
    """
    Resizes the [0,1] heatmap to match the original image, applies COLORMAP_TURBO, 
    blends it at 50% opacity, and optionally saves the result.
    """
    w, h = original_pil_img.size
    # Resize heatmap (cv2 takes (width, height))
    heatmap_resized = cv2.resize(heatmap_2d, (w, h))
    
    if mask_full is not None:
        heatmap_resized = heatmap_resized * mask_full
    
    # Map to 8-bit and apply colormap
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_TURBO)
    
    if mask_full is not None:
        # Zero out the colormap background entirely
        mask_3d = np.repeat(mask_full[:, :, np.newaxis], 3, axis=2)
        heatmap_colored = (heatmap_colored * mask_3d).astype(np.uint8)
        
    heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    
    # Blend with original image
    orig_np = np.array(original_pil_img.convert("RGB"))
    overlay = cv2.addWeighted(orig_np, 0.5, heatmap_colored, 0.5, 0)
    
    final_img = Image.fromarray(overlay)
    if save_path:
        final_img.save(save_path)
        
    return final_img
