import os
import csv
import shutil
from datetime import datetime
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.mongo_db import get_feedback_collection

EXPORT_DIR = "dataset/candidate_training_set"
os.makedirs(EXPORT_DIR, exist_ok=True)

def export_candidate_dataset():
    collection = get_feedback_collection()
    
    # We export BOTH confirmed and corrected predictions for a representative candidate set
    query = {
        "review_status": {"$in": ["confirmed_correct", "corrected_prediction"]}
    }
    
    cursor = collection.find(query)
    
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_folder = os.path.join(EXPORT_DIR, f"batch_{timestamp_str}")
    img_folder = os.path.join(export_folder, "images")
    os.makedirs(img_folder, exist_ok=True)
    
    csv_path = os.path.join(export_folder, "labels.csv")
    
    count = 0
    with open(csv_path, mode='w', newline='') as csv_file:
        fieldnames = ['image_filename', 'actual_grade', 'is_corrected', 'original_prediction', 'reviewer_id']
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        
        for doc in cursor:
            # Determine true grade
            true_grade = doc.get("actual_grade") if doc.get("review_status") == "corrected_prediction" else doc.get("predicted_grade")
            
            if true_grade is None:
                continue
                
            img_path = doc.get("image_path")
            if not img_path:
                continue
                
            # img_path might be like /uploads/xxxx_original.jpg. Convert to local path.
            # Assuming backend run from project root, uploads is at ./uploads
            local_img_path = "." + img_path
            
            if not os.path.exists(local_img_path):
                print(f"Warning: Image not found locally {local_img_path}")
                continue
                
            filename = os.path.basename(local_img_path)
            dest_img = os.path.join(img_folder, filename)
            
            shutil.copy2(local_img_path, dest_img)
            
            writer.writerow({
                'image_filename': filename,
                'actual_grade': true_grade,
                'is_corrected': doc.get("review_status") == "corrected_prediction",
                'original_prediction': doc.get("predicted_grade"),
                'reviewer_id': doc.get("reviewer_id", "UNKNOWN")
            })
            count += 1
            
    print(f"Exported {count} verified candidate samples to {export_folder}")
    print("This candidate dataset must undergo formal validation before training a new model version.")

if __name__ == "__main__":
    export_candidate_dataset()
