from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "warehouse_counter"

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

sessions_col = db["sessions"]
logs_col = db["detection_logs"]


# ── Sessions ──────────────────────────────────────────────────

def batch_id_exists(batch_id: str, user_id: str = None) -> bool:
    """Check if a batch_id already exists for a specific user."""
    query = {"batch_id": batch_id}
    if user_id:
        query["user_id"] = user_id
    print(f"[batch_id_exists] Query: {query}")
    result = sessions_col.find_one(query)
    print(f"[batch_id_exists] Found: {result is not None}")
    if result:
        print(f"[batch_id_exists] Session details: user_id={result.get('user_id')}, batch_id={result.get('batch_id')}, status={result.get('status')}")
    return result is not None


def create_session(batch_id: str, operator_id: str, user_id: str, source_type: str = "live", upload_path: str = None) -> str:
    """Create a new session for a specific user."""
    doc = {
        "user_id": user_id,  # Link session to user
        "batch_id": batch_id,
        "operator_id": operator_id,
        "started_at": datetime.now(timezone.utc),
        "ended_at": None,
        "final_count": None,
        "video_path": None,
        "source_type": source_type,   # "live" | "upload"
        "upload_path": upload_path,   # original uploaded file path (upload sessions only)
        "status": "active",
    }
    result = sessions_col.insert_one(doc)
    return str(result.inserted_id)


def end_session(session_id: str, final_count: int, video_path: str):
    """End a session."""
    sessions_col.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "ended_at": datetime.now(timezone.utc),
            "final_count": final_count,
            "video_path": video_path,
            "status": "completed",
        }}
    )


def get_session(session_id: str, user_id: str = None) -> dict:
    """Get a session by ID, optionally filtered by user."""
    query = {"_id": ObjectId(session_id)}
    if user_id:
        query["user_id"] = user_id
    doc = sessions_col.find_one(query)
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def list_sessions(user_id: str = None, limit: int = 200) -> list:
    """List sessions, optionally filtered by user."""
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    results = []
    for doc in sessions_col.find(query).sort("started_at", DESCENDING).limit(limit):
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


# ── Detection Logs ────────────────────────────────────────────

def log_detection(session_id: str, box_count: int, confidence: float):
    """Log a detection event for a session."""
    logs_col.insert_one({
        "session_id": ObjectId(session_id),
        "timestamp": datetime.now(timezone.utc),
        "box_count": box_count,
        "confidence": confidence,
    })


def get_logs_for_session(session_id: str) -> list:
    """Get all detection logs for a session."""
    results = []
    for doc in logs_col.find({"session_id": ObjectId(session_id)}).sort("timestamp", 1):
        doc["_id"] = str(doc["_id"])
        doc["session_id"] = str(doc["session_id"])
        results.append(doc)
    return results


def delete_session(session_id: str, user_id: str = None) -> bool:
    """Delete a session and all its detection logs. Returns True if session existed."""
    query = {"_id": ObjectId(session_id)}
    if user_id:
        query["user_id"] = user_id
    
    result = sessions_col.delete_one(query)
    logs_col.delete_many({"session_id": ObjectId(session_id)})
    return result.deleted_count > 0


# ── Operator Stats ────────────────────────────────────────────

def get_operator_stats(user_id: str = None) -> list:
    """Get operator statistics, optionally filtered by user."""
    match_stage = {"status": "completed"}
    if user_id:
        match_stage["user_id"] = user_id
    
    pipeline = [
        {"$match": match_stage},
        {"$group": {
            "_id": "$operator_id",
            "total_sessions": {"$sum": 1},
            "total_boxes": {"$sum": "$final_count"},
            "avg_count": {"$avg": "$final_count"},
        }},
        {"$sort": {"total_boxes": -1}},
    ]
    return list(sessions_col.aggregate(pipeline))
