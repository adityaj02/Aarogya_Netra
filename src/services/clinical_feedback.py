import uuid
import logging
from typing import List, Optional
from datetime import datetime

from src.mongo_db import get_feedback_collection
from src.schemas.clinical_feedback import ClinicalFeedbackCreate, ClinicalFeedbackInDB

logger = logging.getLogger(__name__)


class ClinicalFeedbackService:
    """
    Service for clinical feedback CRUD operations against MongoDB.

    MongoDB is intentionally lazy-initialized: the connection is only
    attempted when a method is actually called, so a MongoDB outage at
    startup does NOT crash the FastAPI screening server.
    """

    def __init__(self):
        # Do NOT connect to MongoDB here; keep startup side-effect-free.
        self._collection = None

    def _get_collection(self):
        """Lazily resolve and cache the MongoDB collection handle."""
        if self._collection is None:
            self._collection = get_feedback_collection()
        return self._collection

    def submit_feedback(self, feedback: ClinicalFeedbackCreate) -> ClinicalFeedbackInDB:
        """
        Validates and inserts a new clinical feedback record into MongoDB.
        """
        feedback_id = f"FB-{uuid.uuid4().hex[:8].upper()}"

        is_correct = feedback.is_correct
        if is_correct is None:
            if feedback.review_status == "confirmed_correct":
                is_correct = True
            elif feedback.review_status == "corrected_prediction":
                is_correct = False

        db_feedback = ClinicalFeedbackInDB(
            feedback_id=feedback_id,
            timestamp=datetime.utcnow(),
            is_correct=is_correct,
            **feedback.dict(exclude_unset=True)
        )

        collection = self._get_collection()
        collection.insert_one(db_feedback.dict())
        logger.info("Feedback %s submitted for report %s", feedback_id, feedback.report_id)
        return db_feedback

    def get_feedback_by_report(self, report_id: str) -> List[ClinicalFeedbackInDB]:
        """
        Retrieves all feedback records for a specific screening report.
        """
        collection = self._get_collection()
        cursor = collection.find({"report_id": report_id}).sort("timestamp", -1)
        results = []
        for doc in cursor:
            if "_id" in doc:
                del doc["_id"]
            results.append(ClinicalFeedbackInDB(**doc))
        return results

