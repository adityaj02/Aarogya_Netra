import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Default to localhost if not specified in environment
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = "aarogyanetra_db"

logger = logging.getLogger(__name__)

# Global client
client = None
db = None

def get_mongo_db():
    """
    Returns the MongoDB database instance.
    Initializes the connection if it hasn't been established yet.
    """
    global client, db
    
    if db is None:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            # Verify connection
            client.admin.command('ping')
            db = client[DATABASE_NAME]
            logger.info(f"Successfully connected to MongoDB at {MONGO_URI}")
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            # We don't raise immediately here so the app can still start without MongoDB,
            # but any query will fail.
            raise e
            
    return db

def get_feedback_collection():
    """Returns the clinical_feedback collection"""
    database = get_mongo_db()
    return database["clinical_feedback"]
