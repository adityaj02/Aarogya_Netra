import os
import json
import torch
import numpy as np
import timm
from PIL import Image
from pathlib import Path
import argparse
from typing import Dict, Any, Tuple

from src.preprocessing import RetinalPreprocessor
from src.decision_fusion import WeightedProbabilityFusion, LogOddsFusion, RuleBasedClinicalThresholding
from src.xai import GradCAM, apply_heatmap
from src.llm_explainer import LLMExplainer
from src.iqa import assess_image_file

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")




class InferencePipeline:
    def __init__(self, seed: int = 42, fusion_strategy: str = None, iqa_engine=None):
        self.seed = seed
        self.iqa_engine = iqa_engine  # Optional MatlabIQA instance
        self.preprocessor = RetinalPreprocessor(pipeline_name="RGB")
        self.llm_explainer = LLMExplainer()
        
        # Load calibrated temperatures
        temp_path = BASE_DIR / "calibrated_temperatures.json"
        if temp_path.exists():
            with open(temp_path, "r") as f:
                self.temps = json.load(f)
        else:
            print("Warning: calibrated_temperatures.json not found! Using T=1.0 for all models.")
            self.temps = {}

        # Load optimal fusion parameters
        fusion_params_path = BASE_DIR / "optimal_fusion_params.json"
        if not fusion_params_path.exists():
            fusion_params_path = Path("optimal_fusion_params.json")

        if fusion_params_path.exists():
            with open(fusion_params_path, "r") as f:
                self.fusion_params = json.load(f)
        else:
            print("Warning: optimal_fusion_params.json not found! Using default parameters.")
            self.fusion_params = {}

        # Determine fusion strategies and parameters
        s1_params = self.fusion_params.get("stage1", {})
        s2_params = self.fusion_params.get("stage2", {})

        s1_strategy = fusion_strategy or s1_params.get("method", "weighted")
        s1_w_boundary = s1_params.get("boundary_weight", 0.4)
        self.s1_threshold = s1_params.get("threshold", 0.5)

        if s1_strategy == "weighted":
            self.stage1_fuser = WeightedProbabilityFusion(w_global=1.0 - s1_w_boundary, w_boundary=s1_w_boundary)
        else:
            self.stage1_fuser = LogOddsFusion()

        # Stage 2 setup
        s2_m12_method = s2_params.get("M12", {}).get("method", "logodds")
        s2_strategy = fusion_strategy or s2_m12_method
        if s2_strategy == "weighted":
            self.stage2_fuser = WeightedProbabilityFusion()
        else:
            self.stage2_fuser = LogOddsFusion()

        self.s2_weights = {
            'm12': s2_params.get("M12", {}).get("boundary_weight", 0.4),
            'm23': s2_params.get("M23", {}).get("boundary_weight", 0.4),
            'm34': s2_params.get("M34", {}).get("boundary_weight", 0.4),
        }

        self.fusion_strategy = s1_strategy
        self.rule_fuser = RuleBasedClinicalThresholding()
        
        # Lazy model loading cache
        self.models = {}

    def _get_temp(self, stage: str) -> float:
        return self.temps.get(stage, {}).get("optimal_temperature_mean", 1.0)

    def _load_model(self, stage: str, num_classes: int) -> torch.nn.Module:
        if stage in self.models:
            return self.models[stage]
            
        model_path = BASE_DIR / f"RGB_{stage}_seed{self.seed}_model.pt"
        if not model_path.exists():
            raise FileNotFoundError(f"Model checkpoint not found: {model_path}")
            
        model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=num_classes)
        model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        model.to(DEVICE)
        model.eval()
        self.models[stage] = model
        return model

    def _predict(self, stage: str, num_classes: int, tensor_img: torch.Tensor) -> np.ndarray:
        model = self._load_model(stage, num_classes)
        temp = self._get_temp(stage)
        
        with torch.no_grad():
            logits = model(tensor_img)
            # Apply Temperature Scaling to logits
            scaled_logits = logits / temp
            probs = torch.softmax(scaled_logits, dim=1)[0].cpu().numpy()
            
        return probs

    def _finalize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        explanation = self.llm_explainer.generate_explanation(result)
        if explanation.get("generated", False):
            result["explanation"] = explanation
        elif "error" in explanation:
            result["explanation"] = {"error": explanation["error"]}
        return result

    def run(self, img_path: str, language: str = "en", generate_cams: bool = True, generate_explanation: bool = True) -> Dict[str, Any]:
        """
        IQA Gate Architecture:
        ─────────────────────
        MATLAB available?
             │
         YES ┤   → MATLAB is canonical gate
             │      ACCEPT → proceed to ML pipeline
             │      REJECT → UNGRADABLE
             │
         NO  ┤   → Python OpenCV fallback is gate
                    ACCEPT → proceed to ML pipeline
                    REJECT → UNGRADABLE

        The engine used is recorded in IQA result as "engine": "MATLAB" | "Python-Fallback".
        """
        import logging as _logging
        _iqa_log = _logging.getLogger("aarogya.iqa")

        iqa_result = None
        iqa_rejected = False
        iqa_reason = ""

        # ── Step 1A: MATLAB Engine (canonical gate) ─────────────────────────────
        if self.iqa_engine is not None:
            try:
                iqa_result = self.iqa_engine.assess(img_path)  # already normalised schema
                if iqa_result.get("status") == "REJECT":
                    iqa_rejected = True
                    iqa_reason = f"MATLAB IQA: {iqa_result.get('reason', 'Quality criteria not met')}"
                    _iqa_log.warning("[IQA MATLAB] REJECT — %s", iqa_reason)
                else:
                    m = iqa_result.get("metrics", {})
                    _iqa_log.info(
                        "[IQA MATLAB] ACCEPT — brightness=%.1f  blur=%.3f",
                        m.get("brightness") or 0.0,
                        m.get("blur_score") or 0.0,
                    )
            except Exception as exc:
                _iqa_log.warning(
                    "[IQA MATLAB] Engine call failed (%s). Falling back to Python OpenCV IQA.", exc
                )
                iqa_result = None  # will trigger Python fallback below

        # ── Step 1B: Python OpenCV fallback (only when MATLAB unavailable) ───────
        if iqa_result is None:
            py_iqa_res = assess_image_file(img_path)
            failed_checks = py_iqa_res.failed_checks if not py_iqa_res.passed else []
            iqa_result = {
                "engine":        "Python-Fallback",
                "status":        "REJECT" if not py_iqa_res.passed else "ACCEPT",
                "reason":        f"Failed checks: {', '.join(failed_checks)}" if failed_checks else "",
                "failed_checks": failed_checks,
                "metrics":       getattr(py_iqa_res, "scores", {}),
            }
            if not py_iqa_res.passed:
                iqa_rejected = True
                iqa_reason = f"Python IQA: [{', '.join(failed_checks)}]"
                _iqa_log.warning("[IQA Python-Fallback] REJECT — %s", iqa_reason)
            else:
                _iqa_log.info("[IQA Python-Fallback] ACCEPT")

        # ── Step 1C: Gate decision ────────────────────────────────────────────────
        if iqa_rejected:
            _iqa_log.info("[IQA GATE] REJECT — %s", iqa_reason)
            return {
                "IQA": iqa_result,
                "Final_Grade": "UNGRADABLE",
                "recommendation": "RECAPTURE",
                "reason": iqa_reason,
            }

        # 2. Preprocessing
        try:
            pil_img = Image.open(img_path).convert("RGB")
            processed_np = self.preprocessor.preprocess_numpy(np.array(pil_img))
            
            # The visualization image is the cropped/resized geometry but BEFORE tensor normalization
            vis_img = Image.fromarray(processed_np)
            
            import torchvision.transforms.functional as TF
            # Convert to float tensor and scale to [0,1] for normalization
            tensor_img = TF.to_tensor(processed_np)
            tensor_img = self.preprocessor.normalize_tensor(tensor_img).unsqueeze(0).to(DEVICE)
        except Exception as e:
            return self._finalize_result({"Final_Grade": "UNGRADABLE/RECAPTURE", "Reason": f"Preprocessing Error: {str(e)}"})

        # 3. Stage 1 (Global M0ALL & Boundary M01)
        p_m0all = self._predict("stage1", 2, tensor_img)[1] # Prob of DR
        p_m01 = self._predict("stage_m01", 2, tensor_img)[1] # Prob of DR

        # Stage 1 Fusion
        if isinstance(self.stage1_fuser, WeightedProbabilityFusion):
            fused_s1, status = self.stage1_fuser.fuse_stage1(p_m0all, p_m01, threshold=self.s1_threshold)
        else:
            w_b = self.fusion_params.get("stage1", {}).get("boundary_weight", 0.4)
            fused_s1, status = self.stage1_fuser.fuse_stage1(p_m0all, p_m01, w_global=1.0 - w_b, w_boundary=w_b, threshold=self.s1_threshold)
            


        result = {
            "language": language,
            "Stage1": {
                "P_M0ALL_DR": float(p_m0all),
                "P_M01_DR": float(p_m01),
                "Fused_DR_Prob": float(fused_s1),
                "Threshold_Used": float(self.s1_threshold),
                "Status": status
            }
        }

        # 4. Stage 2 (If DR detected)
        if status == "No DR":
            result["Final_Grade"] = "Grade 0 (No DR)"
            
            if generate_cams:
                # Generate Grad-CAM (XAI) for Stage 1
                original_stem = Path(img_path).stem
                target_class = int(0)
                final_grade_num = int(0)
                model_name = "M0ALL"
                interpretation = "Regions contributing most strongly to the selected model's No-DR prediction."

                # Save all artifacts beside the input image, not in CWD
                img_dir = Path(img_path).parent
                gradcam_save_path = str(img_dir / f"{original_stem}_gradcam_{model_name}_G{final_grade_num}.png")
                raw_cam_save_path = str(img_dir / f"{original_stem}_raw_cam_{model_name}_G{final_grade_num}.npy")
                original_save_path = str(img_dir / f"{original_stem}_original.jpg")
                
                pil_img.save(original_save_path)
                
                try:
                    cam_generator = GradCAM(self.models["stage1"], target_layer_name="conv_head")
                    heatmap_2d = cam_generator.generate(tensor_img, target_class)
                    
                    # Save raw CAM for auditability
                    np.save(raw_cam_save_path, heatmap_2d)
                    
                    # Generate fundus mask to prevent background visualization
                    vis_np = np.array(vis_img.convert("L"))
                    mask_full = (vis_np > 10).astype(np.float32)
                    
                    apply_heatmap(vis_img, heatmap_2d, gradcam_save_path, mask_full=mask_full)
                    cam_generator.remove_hooks()
                    
                    result["xai"] = {
                        "method": "Grad-CAM",
                        "model": model_name,
                        "target_grade": final_grade_num,
                        "visualization_mask": "fundus_mask",
                        "heatmap": gradcam_save_path,
                        "raw_cam": raw_cam_save_path,
                        "interpretation": interpretation
                    }
                except Exception as e:
                    result["xai"] = {"error": f"Failed to generate Grad-CAM: {str(e)}"}
            return self._finalize_result(result) if generate_explanation else result

        # Run M1234
        p_m1234 = self._predict("stage2", 4, tensor_img) # Grades 1, 2, 3, 4
        argmax_grade = np.argmax(p_m1234) + 1
        
        result["Stage2"] = {
            "M1234_Probs": {f"Grade {i+1}": float(p_m1234[i]) for i in range(4)},
            "M1234_Argmax": int(argmax_grade)
        }

        # Route to boundaries based on M1234 argmax
        boundary_probs = {}
        if argmax_grade == 1:
            # G1 -> M01 (already computed) + M12
            p_m12 = self._predict("stage_m12", 2, tensor_img)[1]
            boundary_probs['m12'] = p_m12
            result["Stage2"]["P_M12"] = float(p_m12)
        elif argmax_grade == 2:
            # G2 -> M12 + M23
            p_m12 = self._predict("stage_m12", 2, tensor_img)[1]
            p_m23 = self._predict("stage_m23", 2, tensor_img)[1]
            boundary_probs['m12'] = p_m12
            boundary_probs['m23'] = p_m23
            result["Stage2"]["P_M12"] = float(p_m12)
            result["Stage2"]["P_M23"] = float(p_m23)
        elif argmax_grade == 3:
            # G3 -> M23 + M34
            p_m23 = self._predict("stage_m23", 2, tensor_img)[1]
            p_m34 = self._predict("stage_m34", 2, tensor_img)[1]
            boundary_probs['m23'] = p_m23
            boundary_probs['m34'] = p_m34
            result["Stage2"]["P_M23"] = float(p_m23)
            result["Stage2"]["P_M34"] = float(p_m34)
        elif argmax_grade == 4:
            # G4 -> M34
            p_m34 = self._predict("stage_m34", 2, tensor_img)[1]
            boundary_probs['m34'] = p_m34
            result["Stage2"]["P_M34"] = float(p_m34)

        # Stage 2 Fusion
        fused_p_m1234 = self.stage2_fuser.fuse_stage2(p_m1234, boundary_probs, weights=self.s2_weights)

        final_argmax = np.argmax(fused_p_m1234) + 1
        result["Stage2"]["Fused_Probs"] = {f"Grade {i+1}": float(fused_p_m1234[i]) for i in range(4)}
        result["Final_Grade"] = f"Grade {final_argmax}"

        if generate_cams:
            # Generate Grad-CAM (XAI)
            original_stem = Path(img_path).stem
            target_class = int(final_argmax - 1)
            final_grade_num = int(final_argmax)
            model_name = "M1234"
            interpretation = "Regions contributing most strongly to the selected model's prediction."

            # Save all artifacts beside the input image, not in CWD
            img_dir = Path(img_path).parent
            gradcam_save_path = str(img_dir / f"{original_stem}_gradcam_{model_name}_G{final_grade_num}.png")
            raw_cam_save_path = str(img_dir / f"{original_stem}_raw_cam_{model_name}_G{final_grade_num}.npy")
            original_save_path = str(img_dir / f"{original_stem}_original.jpg")
            
            # Save the original for clinical comparison
            pil_img.save(original_save_path)
            
            try:
                cam_generator = GradCAM(self.models["stage2"], target_layer_name="conv_head")
                heatmap_2d = cam_generator.generate(tensor_img, target_class)
                
                # Save raw CAM for auditability
                np.save(raw_cam_save_path, heatmap_2d)
                
                # Generate fundus mask to prevent background visualization
                vis_np = np.array(vis_img.convert("L"))
                mask_full = (vis_np > 10).astype(np.float32)
                
                apply_heatmap(vis_img, heatmap_2d, gradcam_save_path, mask_full=mask_full)
                cam_generator.remove_hooks()
                
                result["xai"] = {
                    "method": "Grad-CAM",
                    "model": model_name,
                    "target_grade": final_grade_num,
                    "visualization_mask": "fundus_mask",
                    "heatmap": gradcam_save_path,
                    "raw_cam": raw_cam_save_path,
                    "interpretation": interpretation
                }
            except Exception as e:
                result["xai"] = {"error": f"Failed to generate Grad-CAM: {str(e)}"}

        return self._finalize_result(result) if generate_explanation else result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AarogyaNetra Inference Engine")
    parser.add_argument("--image", type=str, required=True, help="Path to fundus image")
    parser.add_argument("--seed", type=int, default=42, help="Model seed to use")
    parser.add_argument("--fusion", type=str, default="weighted", choices=["weighted", "logodds"], help="Fusion strategy")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: Image {args.image} not found.")
        exit(1)

    print(f"Running inference on {args.image}...")
    pipeline = InferencePipeline(seed=args.seed, fusion_strategy=args.fusion)
    result = pipeline.run(args.image)
    
    print("\n--- INFERENCE RESULTS ---")
    print(json.dumps(result, indent=2))
