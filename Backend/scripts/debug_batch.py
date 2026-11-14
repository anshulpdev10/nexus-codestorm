"""
Show all sessions for a batch ID.
Run from the Backend folder:  python -m scripts.debug_batch
"""
from core.database import supabase

BATCH = "BATCH-20000"

rows = supabase.table("sessions").select("*").eq("batch_id", BATCH).execute().data

print(f"Found {len(rows)} session(s) with batch_id '{BATCH}':")
for s in rows:
    print(f"  Session ID: {s['id']}")
    print(f"  User ID: {s.get('user_id') or 'NO USER ID'}")
    print(f"  Batch ID: {s['batch_id']}")
    print(f"  Operator ID: {s['operator_id']}")
    print(f"  Status: {s['status']}")
    print(f"  Started: {s['started_at']}")
    print("  ---")
