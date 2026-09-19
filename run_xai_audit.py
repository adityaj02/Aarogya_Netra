"""
AarogyaNetra - Multi-Grade XAI Visual Audit
============================================
Samples one image per grade (0–4) from the test set and generates
a side-by-side (original | masked Grad-CAM) strip for each.
Run once to freeze XAI. Do not re-run after confirming.
"""
import json
from pathlib import Path
from PIL import Image
import numpy as np
import cv2

from run_inference import InferencePipeline

BASE_DIR = Path(r"d:\Projects\AarogyaNetra\archive (1)\master_dataset_baseline")
TEST_DIR = BASE_DIR / "test"
OUT_DIR = Path(r"d:\Projects\AarogyaNetra\xai_audit")
OUT_DIR.mkdir(exist_ok=True)

GRADES = [0, 1, 2, 3, 4]


def sample_one(grade: int) -> Path:
    folder = TEST_DIR / str(grade)
    imgs = sorted(folder.glob("*.jpg"))
    if not imgs:
        raise FileNotFoundError(f"No test images for grade {grade} in {folder}")
    return imgs[0]


def make_strip(orig_path: Path, heatmap_path: Path, grade: int, result: dict) -> Path:
    orig = Image.open(orig_path).convert("RGB").resize((448, 448))
    heatmap = Image.open(heatmap_path).convert("RGB").resize((448, 448))

    strip_w = orig.width * 2 + 12
    strip_h = orig.height + 48
    strip = Image.new("RGB", (strip_w, strip_h), (18, 18, 24))
    strip.paste(orig, (0, 48))
    strip.paste(heatmap, (orig.width + 12, 48))

    import PIL.ImageDraw
    draw = PIL.ImageDraw.Draw(strip)

    final_grade = result.get("Final_Grade", "Grade ?")
    stage1_status = result.get("Stage1", {}).get("Status", "N/A")
    title = f"Grade {grade} GT  |  Prediction: {final_grade}  |  Stage1: {stage1_status}"
    draw.text((6, 10), "ORIGINAL", fill=(180, 180, 200))
    draw.text((orig.width + 18, 10), "GRAD-CAM (fundus masked)", fill=(255, 160, 80))
    draw.text((6, 28), title, fill=(200, 200, 200))

    out = OUT_DIR / f"audit_grade{grade}.png"
    strip.save(out)
    return out


def main():
    pipeline = InferencePipeline(seed=42)
    audit_log = []

    for grade in GRADES:
        try:
            img_path = sample_one(grade)
            print(f"\n[Grade {grade}] Running inference on: {img_path.name}")
            result = pipeline.run(str(img_path), generate_cams=True, generate_explanation=False)

            xai = result.get("xai", {})
            if "error" in xai:
                print(f"  [WARN] XAI error: {xai['error']}")
                audit_log.append({"grade": grade, "image": img_path.name, "status": "xai_error", "error": xai["error"]})
                continue

            heatmap_path = Path(xai.get("heatmap", ""))
            if not heatmap_path.exists():
                heatmap_path = Path(r"d:\Projects\AarogyaNetra") / heatmap_path.name

            strip_path = make_strip(img_path, heatmap_path, grade, result)
            print(f"  Strip saved: {strip_path}")

            entry = {
                "grade": grade,
                "image": img_path.name,
                "status": "ok",
                "prediction": result.get("Final_Grade"),
                "stage1_status": result.get("Stage1", {}).get("Status"),
                "xai_method": xai.get("method"),
                "visualization_mask": xai.get("visualization_mask"),
                "heatmap": str(heatmap_path),
                "raw_cam": xai.get("raw_cam"),
            }
            audit_log.append(entry)

        except Exception as e:
            print(f"  [ERROR] Grade {grade}: {e}")
            import traceback
            traceback.print_exc()
            audit_log.append({"grade": grade, "status": "error", "error": str(e)})

    log_path = OUT_DIR / "audit_log.json"
    with open(log_path, "w") as f:
        json.dump(audit_log, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Audit complete. {len([e for e in audit_log if e['status']=='ok'])}/{len(GRADES)} grades successful.")
    print(f"Strips saved to: {OUT_DIR}")
    print(f"Audit log: {log_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
