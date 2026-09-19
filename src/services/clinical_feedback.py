import uuid
from typing import List, Optional
from datetime import datetime

from src.mongo_db import get_feedback_collection
from src.schemas.clinical_feedback import ClinicalFeedbackCreate, ClinicalFeedbackInDB

class ClinicalFeedbackService:
    def __init__(self):
        self.collection = get_feedback_collection()
        
    def submit_feedback(self, feedback: ClinicalFeedbackCreate) -> ClinicalFeedbackInDB:
        """
        Validates and inserts a new clinical feedback record into MongoDB.
        """
        # Create a unique ID for the feedback
        feedback_id = f"FB-{uuid.uuid4().hex[:8].upper()}"
        
        # Determine is_correct if not explicitly set
        is_correct = feedback.is_correct
        if is_correct is None:
            if feedback.review_status == "confirmed_correct":
                is_correct = True
            elif feedback.review_status == "corrected_prediction":
                is_correct = False
        
        # Prepare the document
        db_feedback = ClinicalFeedbackInDB(
            feedback_id=feedback_id,
            timestamp=datetime.utcnow(),
            is_correct=is_correct,
            **feedback.dict(exclude_unset=True)
        )
        
        # Insert into MongoDB
        self.collection.insert_one(db_feedback.dict())
        
        return db_feedback
        
    def get_feedback_by_report(self, report_id: str) -> List[ClinicalFeedbackInDB]:
        """
        Retrieves all feedback records for a specific screening report.
        """
        cursor = self.collection.find({"report_id": report_id}).sort("timestamp", -1)
        results = []
        for doc in cursor:
            # MongoDB adds _id which we don't need in our Pydantic model
            if "_id" in doc:
                del doc["_id"]
            results.append(ClinicalFeedbackInDB(**doc))
        return results
