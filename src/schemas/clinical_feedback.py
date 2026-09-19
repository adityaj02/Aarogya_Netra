from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ReviewStatus(str, Enum):
    CONFIRMED_CORRECT = "confirmed_correct"
    CORRECTED_PREDICTION = "corrected_prediction"
    NEEDS_REVIEW = "needs_review"

class ClinicalFeedbackCreate(BaseModel):
    report_id: str
    patient_id: Optional[int] = None
    image_id: Optional[str] = None
    
    # AI Predictions
    predicted_grade: Optional[int] = None
    predicted_stage1_status: Optional[str] = None
    
    # Doctor Validation
    review_status: ReviewStatus
    is_correct: Optional[bool] = None  # derived or explicitly sent
    actual_grade: Optional[int] = None
    doctor_comments: Optional[str] = None
    reviewer_id: str  # Mandatory to know who reviewed it
    referral_hospital: Optional[str] = None  # Hospital referral from directory
    referral_state: Optional[str] = None     # State of referral hospital
    
    # System Versions & Snapshot
    model_version: Optional[str] = "v1.0.0"
    fusion_version: Optional[str] = "v1.0.0"
    preprocessing_version: Optional[str] = "v1.0.0"
    
    # The complete inference snapshot (stage1 and stage2 probabilities)
    inference_snapshot: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @validator("actual_grade")
    def actual_grade_required_if_corrected(cls, v, values):
        if values.get("review_status") == ReviewStatus.CORRECTED_PREDICTION and v is None:
            raise ValueError("actual_grade is required when review_status is corrected_prediction")
        return v
        
class ClinicalFeedbackInDB(ClinicalFeedbackCreate):
    feedback_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
