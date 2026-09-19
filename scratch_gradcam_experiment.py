import torch
import numpy as np
from PIL import Image
import cv2
import json
import torchvision.transforms as T
import torch.nn.functional as F

from src.xai import GradCAM, apply_heatmap

def get_cam(model, input_tensor, target_layer, target_class):
    # Ensure gradients can be computed
    model.eval()
    model.zero_grad()
    
    # We will manually do grad-cam instead of using the wrapper to easily get unnormalized
    # We use a custom hook to grab the gradients and activations
    activations = None
    gradients = None
    
    def forward_hook(module, input, output):
        nonlocal activations
        activations = output
        
    def backward_hook(module, grad_input, grad_output):
        nonlocal gradients
        gradients = grad_output[0]
        
    # Find layer
    layer = dict([*model.named_modules()])[target_layer]
    
    h1 = layer.register_forward_hook(forward_hook)
    h2 = layer.register_full_backward_hook(backward_hook)
    
    input_tensor = input_tensor.clone().detach().requires_grad_(True)
    out = model(input_tensor)
    
    one_hot = torch.zeros_like(out)
    one_hot[0][target_class] = 1.0
    out.backward(gradient=one_hot)
    
    h1.remove()
    h2.remove()
    
    # compute CAM
    weights = torch.mean(gradients, dim=[2, 3], keepdim=True)
    cam = torch.sum(weights * activations, dim=1, keepdim=True)
    cam = F.relu(cam)
    cam = cam.cpu().detach().numpy()[0, 0]
    
    return cam

def main():
    img_path = "D:/Projects/AarogyaNetra/0024cdab0c1e-GF-600-HB_original.jpg"
    target_class = 0 # Grade 1 is index 0
    
    # Load Image
    pil_img = Image.open(img_path).convert("RGB")
    transform = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    tensor_img = transform(pil_img).unsqueeze(0)
    
    # Load Model (Stage 2)
    import timm
    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=4)
    ckpt = torch.load(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline\RGB_stage2_seed42_model.pt", map_location='cpu')
    model.load_state_dict(ckpt)
    model.eval()
    
    layers = ["conv_head", "blocks.5.3.conv_pwl", "blocks.4.2.conv_pwl", "blocks.3.1.conv_pwl"]
    
    results = {}
    
    for layer in layers:
        print(f"\\nProcessing layer: {layer}")
        try:
            cam = get_cam(model, tensor_img, layer, target_class)
            
            shape = cam.shape
            print(f"Shape: {shape}")
            
            unnorm_min = float(cam.min())
            unnorm_max = float(cam.max())
            unnorm_mean = float(cam.mean())
            
            print(f"Unnormalized Min: {unnorm_min}, Max: {unnorm_max}")
            
            # Normalize
            if unnorm_max - unnorm_min > 1e-9:
                norm_cam = (cam - unnorm_min) / (unnorm_max - unnorm_min)
            else:
                norm_cam = np.zeros_like(cam)
                
            # Save heatmap
            save_path = f"0024cdab0c1e_gradcam_{layer.replace('.','_')}.png"
            apply_heatmap(pil_img, norm_cam, save_path)
            print(f"Saved to {save_path}")
            
            results[layer] = {
                "shape": list(shape),
                "unnorm_min": unnorm_min,
                "unnorm_max": unnorm_max,
                "unnorm_mean": unnorm_mean,
                "norm_mean": float(norm_cam.mean()),
                "zero_frac": float(np.mean(norm_cam == 0)),
                "raw_sample": norm_cam.round(3).tolist() if shape[0] <= 14 else "too large"
            }
        except Exception as e:
            print(f"Failed on {layer}: {e}")
            
    with open("gradcam_experiment.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
