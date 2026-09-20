import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:////app/sqlite_data/aarogyanetra.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(String)
    gender = Column(String)
    diabetes_duration = Column(String)
    mobile = Column(String)
    
    reports = relationship("ScreeningReport", back_populates="patient")


class ScreeningReport(Base):
    __tablename__ = "screening_reports"

    id = Column(String, primary_key=True, index=True)  # Using string for AN-2026-XXXX format
    patient_id = Column(Integer, ForeignKey("patients.id"))
    date = Column(String, default=lambda: datetime.now().strftime("%Y-%m-%d"))
    
    stage1_outcome = Column(String)  # NO_DR, DR_DETECTED, UNCERTAIN
    grade = Column(Integer, nullable=True)
    severity_key = Column(String, nullable=True)
    confidence = Column(String)
    confidence_score = Column(Float)
    referral_key = Column(String)
    timeline_key = Column(String)
    
    explanation_text = Column(Text, nullable=True)
    probabilities_json = Column(Text, nullable=True)
    
    image_path = Column(String) # path to original cropped
    heatmap_path = Column(String, nullable=True) # path to gradcam overlay
    
    iqa_passed = Column(Boolean, nullable=True, default=True)
    
    patient = relationship("Patient", back_populates="reports")

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
