from database import sessions_col

# Check all sessions with batch_id "BATCH-20000"
sessions = list(sessions_col.find({"batch_id": "BATCH-20000"}))

print(f"Found {len(sessions)} session(s) with batch_id 'BATCH-20000':")
for session in sessions:
    print(f"  Session ID: {session['_id']}")
    print(f"  User ID: {session.get('user_id', 'NO USER ID')}")
    print(f"  Batch ID: {session['batch_id']}")
    print(f"  Operator ID: {session['operator_id']}")
    print(f"  Status: {session['status']}")
    print(f"  Started: {session['started_at']}")
    print("  ---")
