import os
from dotenv import load_dotenv
load_dotenv()
import uuid
import json
import random
from io import BytesIO
from datetime import datetime
import shutil
import numpy as np


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
from fastapi import FastAPI, File, UploadFile, Depends, Form, HTTPException
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

pipeline_instance = None
matlab_iqa = None

IQA_MATLAB_PATH = r"D:\Projects\AarogyaNetra\src\IQA_Matlab"

@app.on_event("startup")
def load_models():
    global pipeline_instance, matlab_iqa
    print("Starting MATLAB IQA engine...")
    try:
        matlab_iqa = MatlabIQA(matlab_path=IQA_MATLAB_PATH)
        print("MATLAB IQA engine started.")
    except Exception as e:
        print(f"WARNING: MATLAB IQA engine failed to start ({e}). IQA gate will be skipped.")
        matlab_iqa = None

    print("Loading ML models...")
    pipeline_instance = InferencePipeline(iqa_engine=matlab_iqa)
    os.makedirs("frontend/public/uploads", exist_ok=True)
    print("Models loaded successfully!")

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
        return {
            "id": None,
            "stage1Outcome": "UNGRADABLE",
            "grade": 0,
            "severityKey": "severityNone",
            "confidence": "REVIEW",
            "confidenceScore": 0.0,
            "referralKey": "recRoutine",
            "timelineKey": "recRoutineTimeline",
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
    # ───────────────────────────────────────────────────────────────────────


    original_cwd_path = f"{img_id}_temp_original.jpg"
    final_original = f"frontend/public/uploads/{img_id}_original.jpg"
    if os.path.exists(original_cwd_path):
        shutil.move(original_cwd_path, final_original)
    elif os.path.exists(temp_path):
        # Fallback to temp image if original not created
        shutil.copy(temp_path, final_original)
        
    xai = result.get("xai", {})
    heatmap_file = xai.get("heatmap")
    final_heatmap = f"frontend/public/uploads/{img_id}_heatmap.png"
    if heatmap_file and os.path.exists(heatmap_file):
        shutil.move(heatmap_file, final_heatmap)
    else:
        # Fallback if heatmap failed
        if os.path.exists(final_original):
            shutil.copy(final_original, final_heatmap)

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

    report_id = f"AN-{datetime.now().year}-{random.randint(1000, 9999)}"
    
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
        heatmap_path=f"/uploads/{img_id}_heatmap.png"
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
        out.append({
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
        })
    return out

@app.post("/api/feedback")
def submit_feedback(feedback: ClinicalFeedbackCreate):
    try:
        result = feedback_service.submit_feedback(feedback)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feedback/{report_id}")
def get_feedback(report_id: str):
    try:
        return feedback_service.get_feedback_by_report(report_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
