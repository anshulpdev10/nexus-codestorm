"""
Supabase (Postgres) data layer for BoxGuard.

Tables (see Backend/supabase_schema.sql):
  users, sessions, detection_logs

Rows keep an `_id` key (mirrors Supabase's `id`) so the frontend's
existing field names keep working.
"""
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import os

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
# Service-role key: server-side only. Never ship this to the browser.
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set as environment variables "
        "(see the project README, step 3)."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

SESSIONS = "sessions"
LOGS = "detection_logs"


def _out(row):
    """Rename Supabase's `id` to `_id` (frontend contract)."""
    if row is None:
        return None
    row = dict(row)
    if "id" in row:
        row["_id"] = str(row.pop("id"))
    return row


def _now():
    return datetime.now(timezone.utc).isoformat()


# ── Sessions ──────────────────────────────────────────────────

def batch_id_exists(batch_id: str, user_id: str = None) -> bool:
    """Check if a batch_id already exists for a specific user."""
    q = supabase.table(SESSIONS).select("id").eq("batch_id", batch_id)
    if user_id:
        q = q.eq("user_id", user_id)
    rows = q.limit(1).execute().data
    print(f"[batch_id_exists] batch={batch_id} user={user_id} found={bool(rows)}")
    return bool(rows)


def create_session(batch_id: str, operator_id: str, user_id: str, source_type: str = "live", upload_path: str = None) -> str:
    """Create a new session for a specific user. Returns the session id."""
    row = {
        "user_id": user_id,
        "batch_id": batch_id,
        "operator_id": operator_id,
        "started_at": _now(),
        "ended_at": None,
        "final_count": None,
        "video_path": None,
        "source_type": source_type,   # "live" | "upload"
        "upload_path": upload_path,   # original uploaded file path (upload sessions only)
        "status": "active",
    }
    result = supabase.table(SESSIONS).insert(row).execute()
    return str(result.data[0]["id"])


def end_session(session_id: str, final_count: int, video_path: str):
    """End a session."""
    supabase.table(SESSIONS).update({
        "ended_at": _now(),
        "final_count": final_count,
        "video_path": video_path,
        "status": "completed",
    }).eq("id", session_id).execute()


def get_session(session_id: str, user_id: str = None) -> dict | None:
    """Get a session by ID, optionally filtered by user. Malformed ids -> None."""
    try:
        q = supabase.table(SESSIONS).select("*").eq("id", session_id)
        if user_id:
            q = q.eq("user_id", user_id)
        rows = q.limit(1).execute().data
    except Exception as e:  # e.g. invalid uuid syntax from Postgres
        print(f"[get_session] lookup failed for {session_id!r}: {e}")
        return None
    return _out(rows[0]) if rows else None


def list_sessions(user_id: str = None, limit: int = 200) -> list:
    """List sessions, newest first, optionally filtered by user."""
    q = supabase.table(SESSIONS).select("*")
    if user_id:
        q = q.eq("user_id", user_id)
    rows = q.order("started_at", desc=True).limit(limit).execute().data
    return [_out(r) for r in rows]


# ── Detection Logs ────────────────────────────────────────────

def log_detection(session_id: str, box_count: int, confidence: float):
    """Log a detection event for a session."""
    supabase.table(LOGS).insert({
        "session_id": session_id,
        "timestamp": _now(),
        "box_count": box_count,
        "confidence": confidence,
    }).execute()


def get_logs_for_session(session_id: str) -> list:
    """Get all detection logs for a session, oldest first."""
    rows = (supabase.table(LOGS).select("*")
            .eq("session_id", session_id)
            .order("timestamp", desc=False)
            .execute().data)
    out = []
    for r in rows:
        r = _out(r)
        r["session_id"] = str(r["session_id"])
        out.append(r)
    return out


def delete_session(session_id: str, user_id: str = None) -> bool:
    """Delete a session. Its detection logs are removed by ON DELETE CASCADE.
    Returns True if the session existed and was deleted."""
    q = supabase.table(SESSIONS).delete().eq("id", session_id)
    if user_id:
        q = q.eq("user_id", user_id)
    rows = q.execute().data
    return bool(rows)


# ── Operator Stats ────────────────────────────────────────────

def get_operator_stats(user_id: str = None) -> list:
    """Operator statistics over completed sessions, sorted by total boxes.
    Same shape as the old Mongo aggregation: _id, total_sessions, total_boxes, avg_count."""
    q = supabase.table(SESSIONS).select("operator_id,final_count").eq("status", "completed")
    if user_id:
        q = q.eq("user_id", user_id)
    rows = q.execute().data

    groups = {}
    for r in rows:
        g = groups.setdefault(r["operator_id"], {"total_sessions": 0, "total_boxes": 0})
        g["total_sessions"] += 1
        g["total_boxes"] += r["final_count"] or 0

    out = [{
        "_id": op,
        "total_sessions": g["total_sessions"],
        "total_boxes": g["total_boxes"],
        "avg_count": g["total_boxes"] / g["total_sessions"],
    } for op, g in groups.items()]
    return sorted(out, key=lambda x: x["total_boxes"], reverse=True)
