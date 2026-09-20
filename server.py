import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
import uuid
import json
from datetime import datetime
import shutil
import logging
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Project-root-relative MATLAB path (portability) ──────────────────────────
_PROJECT_ROOT = Path(__file__).resolve().parent
IQA_MATLAB_PATH = os.environ.get(
    "IQA_MATLAB_PATH",
    str(_PROJECT_ROOT / "src" / "IQA_Matlab")
)


class _NumpyEncoder(json.JSONEncoder):
    """Serialise numpy scalars/arrays to Python-native types."""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def _json_dumps(obj):
    return json.dumps(obj, cls=_NumpyEncoder)

from typing import Optional
from fastapi import FastAPI, File, UploadFile, Depends, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.database import get_db, Patient, ScreeningReport
from src.services.clinical_feedback import ClinicalFeedbackService
from src.schemas.clinical_feedback import ClinicalFeedbackCreate
from src.iqa_matlab import MatlabIQA

feedback_service = ClinicalFeedbackService()

from run_inference import InferencePipeline

app = FastAPI()

from fastapi.responses import JSONResponse
import traceback
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "traceback": traceback.format_exc()}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("frontend/public/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="frontend/public/uploads"), name="uploads")

os.makedirs("backend_generated/audio", exist_ok=True)
app.mount("/audio", StaticFiles(directory="backend_generated/audio"), name="audio")

from src.tts.indic_tts import get_tts_service
from src.tts.script_generator import generate_speech_script
from src.tts.cache import get_audio_url_from_path

pipeline_instance = None
matlab_iqa = None

@app.on_event("startup")
def load_models():
    global pipeline_instance, matlab_iqa
    iqa_engine_type = os.environ.get("IQA_ENGINE", "matlab").lower()
    if iqa_engine_type == "python_fallback":
        print("Explicitly configured to use Python Fallback for IQA.")
        matlab_iqa = None
    else:
        print("Starting MATLAB IQA engine...")
        try:
            matlab_iqa = MatlabIQA(matlab_path=IQA_MATLAB_PATH)
            print("MATLAB IQA engine started.")
        except Exception as e:
            print(f"CRITICAL ERROR: MATLAB IQA engine failed to start ({e}).")
            print("Set IQA_ENGINE=python_fallback in your environment if you want to bypass MATLAB.")
            raise e

    print("Loading ML models...")
    pipeline_instance = InferencePipeline(iqa_engine=matlab_iqa)
    os.makedirs("frontend/public/uploads", exist_ok=True)
    print("Models loaded successfully!")

    print("Loading TTS engine...")
    get_tts_service()
    print("TTS engine loaded successfully!")

@app.on_event("shutdown")
def shutdown():
    global matlab_iqa
    if matlab_iqa is not None:
        print("Shutting down MATLAB engine...")
        matlab_iqa.close()
        print("MATLAB engine closed.")

class PatientCreate(BaseModel):
    name: str = "Anonymous"
    age: str = ""
    gender: str = ""
    diabetesDuration: str = ""
    mobile: str = ""

@app.post("/api/patients")
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    db_patient = Patient(
        name=patient.name or "Anonymous",
        age=patient.age or "",
        gender=patient.gender or "",
        diabetes_duration=patient.diabetesDuration or "",
        mobile=patient.mobile or ""
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return {"id": db_patient.id}

@app.post("/api/screen")
async def screen_image(
    patient_id: str = Form("1"), 
    language: str = Form("en"),
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    try:
        pid = int(patient_id)
    except (ValueError, TypeError):
        default_p = db.query(Patient).first()
        if not default_p:
            default_p = Patient(name="Default Patient", age="30", gender="other", diabetes_duration="1 to 5 years", mobile="")
            db.add(default_p)
            db.commit()
            db.refresh(default_p)
        pid = default_p.id

    img_id = str(uuid.uuid4())
    img_data = await file.read()
    
    # Save the file temporarily to pass to the pipeline
    temp_path = f"frontend/public/uploads/{img_id}_temp.jpg"
    with open(temp_path, "wb") as f:
        f.write(img_data)
        
    result = pipeline_instance.run(temp_path, language=language)

    # ── IQA REJECT: short-circuit response ─────────────────────────────────
    if result.get("Final_Grade") == "UNGRADABLE" and result.get("recommendation") == "RECAPTURE":
        iqa = result.get("IQA", {})
        reject_reason = result.get("reason") or iqa.get("reason") or "Image quality insufficient for analysis."
        # Ensure failed_checks is always present for frontend rendering
        if "failed_checks" not in iqa:
            iqa["failed_checks"] = []
        # Keep temp file alive so the frontend can show the image; it will be
        # garbage-collected on a future successful upload or server restart.
        response_payload = {
            "id": None,
            "stage1Outcome": "UNGRADABLE",
            "grade": 0,
            "severityKey": "severityNone",
            "confidence": "REVIEW",
            "confidenceScore": 0.0,
            "referralKey": "recRecapture",
            "timelineKey": "recRecaptureTimeline",
            "explanation": reject_reason,
            "reason": reject_reason,
            "imageData": f"/uploads/{img_id}_temp.jpg",
            "heatmapDataUrl": f"/uploads/{img_id}_temp.jpg",
            "overlayDataUrl": f"/uploads/{img_id}_temp.jpg",
            "iqaPassed": False,
            "iqaScore": 0.0,
            "iqaDetails": iqa,
            "probabilities": {}
        }
        return response_payload
    # ───────────────────────────────────────────────────────────────────────


    # ── Artifact collection ───────────────────────────────────────────────────
    # run_inference.py now saves original/gradcam/npy into the same directory
    # as the input (frontend/public/uploads/). We just need to rename them to
    # stable report-ID-based filenames and clean up the temp upload.
    uploads_dir = Path("frontend/public/uploads")
    final_original = str(uploads_dir / f"{img_id}_original.jpg")
    final_heatmap  = str(uploads_dir / f"{img_id}_heatmap.png")

    # Original image saved by run_inference.py alongside the temp input
    inferred_original = str(uploads_dir / f"{img_id}_temp_original.jpg")
    if os.path.exists(inferred_original):
        shutil.move(inferred_original, final_original)
    elif os.path.exists(temp_path):
        shutil.copy(temp_path, final_original)

    xai = result.get("xai", {})
    heatmap_file = xai.get("heatmap")
    # heatmap_file path comes from run_inference.py — already in uploads dir
    if heatmap_file and os.path.exists(heatmap_file):
        shutil.move(heatmap_file, final_heatmap)
    elif os.path.exists(final_original):
        shutil.copy(final_original, final_heatmap)

    # Clean up the raw temp upload (the permanent original is now stored above)
    if os.path.exists(temp_path) and temp_path != final_original:
        try:
            os.remove(temp_path)
        except OSError as exc:
            logger.warning("Could not delete temp upload %s: %s", temp_path, exc)

    # Extract final grade 
    final_grade_str = result.get("Final_Grade", "Grade 0")
    if "UNGRADABLE" in final_grade_str:
        grade = 0
        stage1_outcome = "UNGRADABLE"
        severity_key = "severityNone"
        referral_key = "recRoutine"
        timeline_key = "recRoutineTimeline"
    elif "Grade 0" in final_grade_str:
        grade = 0
        stage1_outcome = "NO_DR"
        severity_key = "severityNone"
        referral_key = "recRoutine"
        timeline_key = "recRoutineTimeline"
    elif "Grade 1" in final_grade_str:
        grade = 1
        stage1_outcome = "DR_DETECTED"
        severity_key = 'severityMild'
        referral_key = 'recFollowUp'
        timeline_key = 'recFollowUpTimeline'
    elif "Grade 2" in final_grade_str:
        grade = 2
        stage1_outcome = "DR_DETECTED"
        severity_key = 'severityModerate'
        referral_key = 'recClinicalReview'
        timeline_key = 'recClinicalReviewTimeline'
    elif "Grade 3" in final_grade_str:
        grade = 3
        stage1_outcome = "DR_DETECTED"
        severity_key = 'severitySevere'
        referral_key = 'recReferral'
        timeline_key = 'recReferralTimeline'
    elif "Grade 4" in final_grade_str:
        grade = 4
        stage1_outcome = "DR_DETECTED"
        severity_key = 'severityProliferative'
        referral_key = 'recReferral'
        timeline_key = 'recReferralTimeline'
    else:
        grade = 0
        stage1_outcome = "UNCERTAIN"
        severity_key = "severityNone"
        referral_key = "recRoutine"
        timeline_key = "recRoutineTimeline"
            
    explanation_dict = result.get("explanation") or {}
    if isinstance(explanation_dict, dict):
        explanation_text = explanation_dict.get("text", explanation_dict.get("error", "Explanation not available"))
    else:
        explanation_text = str(explanation_dict)
    
    stage1 = result.get("Stage1", {})
    stage2 = result.get("Stage2", {})
    
    if "Fused_Probs" in stage2:
        conf_score = stage2["Fused_Probs"].get(f"Grade {grade}", 0.0)
    else:
        conf_score = 1.0 - stage1.get("Fused_DR_Prob", 0.0) if grade == 0 else stage1.get("Fused_DR_Prob", 0.0)

    confidence_val = "HIGH" if conf_score >= 0.8 else "REVIEW"

    # UUID-based report ID: AN-2026-<8 uppercase hex chars> — effectively collision-free
    report_id = f"AN-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"

    db_report = ScreeningReport(
        id=report_id,
        patient_id=pid,
        stage1_outcome=stage1_outcome,
        grade=grade,
        severity_key=severity_key,
        confidence=confidence_val,
        confidence_score=conf_score,
        referral_key=referral_key,
        timeline_key=timeline_key,
        explanation_text=explanation_text,
        probabilities_json=_json_dumps(result),
        image_path=f"/uploads/{img_id}_original.jpg",
        heatmap_path=f"/uploads/{img_id}_heatmap.png",
        iqa_passed=True,      # Explicit: image passed IQA gate to reach this point
    )
    db.add(db_report)
    db.commit()
    
    return {
        "id": report_id,
        "date": db_report.date,
        "stage1Outcome": stage1_outcome,
        "grade": grade,
        "severityKey": severity_key,
        "confidence": db_report.confidence,
        "confidenceScore": db_report.confidence_score,
        "referralKey": referral_key,
        "timelineKey": timeline_key,
        "explanation": explanation_text,
        "imageData": f"/uploads/{img_id}_original.jpg",
        "heatmapDataUrl": f"/uploads/{img_id}_heatmap.png",
        "overlayDataUrl": f"/uploads/{img_id}_heatmap.png",
        "probabilities": result
    }

@app.get("/api/reports")
def get_reports(db: Session = Depends(get_db)):
    reports = db.query(ScreeningReport).all()
    out = []
    for r in reports:
        report_data = {
            "id": r.id,
            "date": r.date,
            "patient": {
                "name": r.patient.name,
                "age": r.patient.age,
                "gender": r.patient.gender,
                "diabetesDuration": r.patient.diabetes_duration,
                "mobile": r.patient.mobile
            },
            "stage1Outcome": r.stage1_outcome,
            "grade": r.grade,
            "severityKey": r.severity_key,
            "confidence": r.confidence,
            "confidenceScore": r.confidence_score,
            "referralKey": r.referral_key,
            "timelineKey": r.timeline_key,
            "explanation": r.explanation_text,
            "probabilities": json.loads(r.probabilities_json) if r.probabilities_json else None,
            "imageData": r.image_path,
            "heatmapDataUrl": r.heatmap_path,
            "iqaPassed": r.iqa_passed
        }
        try:
            feedbacks = feedback_service.get_feedback_by_report(r.id)
            if feedbacks:
                latest = feedbacks[0]
                if getattr(latest, "referral_hospital", None):
                    report_data["referral_hospital"] = latest.referral_hospital
                if getattr(latest, "referral_state", None):
                    report_data["referral_state"] = latest.referral_state
        except Exception:
            pass # Fail gracefully if mongo is down
        out.append(report_data)
    return out

@app.post("/api/feedback")
def submit_feedback(feedback: ClinicalFeedbackCreate):
    """
    Clinical feedback submission.
    Returns HTTP 503 with a user-facing message if MongoDB is unavailable,
    so that a MongoDB outage never takes down the screening service.
    """
    try:
        result = feedback_service.submit_feedback(feedback)
        return result
    except Exception as e:
        err_msg = str(e)
        if any(kw in err_msg.lower() for kw in ("connection", "mongo", "socket", "timeout", "refused")):
            raise HTTPException(
                status_code=503,
                detail="Clinical feedback service is temporarily unavailable. "
                       "The screening result has been saved. Please try submitting feedback later."
            )
        raise HTTPException(status_code=500, detail=err_msg)

@app.get("/api/feedback/{report_id}")
def get_feedback(report_id: str):
    try:
        return feedback_service.get_feedback_by_report(report_id)
    except Exception as e:
        err_msg = str(e)
        if any(kw in err_msg.lower() for kw in ("connection", "mongo", "socket", "timeout", "refused")):
            raise HTTPException(status_code=503, detail="Feedback service unavailable.")
        raise HTTPException(status_code=500, detail=err_msg)

@app.get("/api/doctor/stats")
def get_doctor_stats(doctor_name: str = Query(...)):
    try:
        return feedback_service.get_doctor_stats(doctor_name)
    except Exception as e:
        err_msg = str(e)
        if any(kw in err_msg.lower() for kw in ("connection", "mongo", "socket", "timeout", "refused")):
            raise HTTPException(status_code=503, detail="Feedback service unavailable.")
        raise HTTPException(status_code=500, detail=err_msg)

@app.get("/api/doctor/reports")
def get_doctor_reports(doctor_name: str = Query(...), db: Session = Depends(get_db)):
    try:
        reports = feedback_service.get_doctor_reports(doctor_name)
        # Enrich with patient name from SQLite
        for r in reports:
            report_id_str = r.get("report_id")
            if report_id_str:
                db_report = db.query(ScreeningReport).filter(ScreeningReport.id == report_id_str).first()
                if db_report and db_report.patient:
                    r["patient_name"] = db_report.patient.name
                else:
                    r["patient_name"] = "Unknown"
            else:
                r["patient_name"] = "Unknown"
        return reports
    except Exception as e:
        err_msg = str(e)
        if any(kw in err_msg.lower() for kw in ("connection", "mongo", "socket", "timeout", "refused")):
            raise HTTPException(status_code=503, detail="Feedback service unavailable.")
        raise HTTPException(status_code=500, detail=err_msg)

@app.get("/api/doctors")
def get_all_doctors():
    try:
        return feedback_service.get_all_doctors()
    except Exception as e:
        err_msg = str(e)
        if any(kw in err_msg.lower() for kw in ("connection", "mongo", "socket", "timeout", "refused")):
            return [] # Fail gracefully if mongo is down
        raise HTTPException(status_code=500, detail=err_msg)

class TTSRequest(BaseModel):
    report_id: str
    language: str

@app.post("/api/tts")
def generate_tts(req: TTSRequest, db: Session = Depends(get_db)):
    try:
        report = db.query(ScreeningReport).filter(ScreeningReport.id == req.report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        report_dict = {
            "id": report.id,
            "stage1Outcome": report.stage1_outcome,
            "grade": report.grade,
            "iqaPassed": report.iqa_passed
        }
        
        script = generate_speech_script(report_dict, req.language)
        tts_service = get_tts_service()
        filepath = tts_service.synthesize(script, req.language)
        audio_url = get_audio_url_from_path(filepath)
        
        return {"success": True, "audio_url": audio_url, "language": req.language}
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
