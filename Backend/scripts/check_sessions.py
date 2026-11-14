#!/usr/bin/env python3
"""
Quick script to check what sessions exist in Supabase.
Run from the Backend folder:  python -m scripts.check_sessions
"""
from core.database import supabase, list_sessions, get_operator_stats

print("=" * 60)
print("SUPABASE SESSIONS CHECK")
print("=" * 60)

total = supabase.table("sessions").select("id", count="exact").execute().count or 0
print(f"\nTotal sessions in database: {total}")

if total == 0:
    print("\nNo sessions found in database!")
    print("\nPossible reasons:")
    print("  1. No sessions have been created yet")
    print("  2. SUPABASE_URL / SUPABASE_SERVICE_KEY environment variables are wrong")
    print("  3. Schema not applied (run Backend/supabase_schema.sql)")
else:
    print(f"\nFound {total} sessions!\n")
    print("=" * 60)
    print("ALL SESSIONS:")
    print("=" * 60)

    for doc in list_sessions():
        print(f"\nSession ID: {doc['_id']}")
        print(f"   User ID: {doc.get('user_id') or 'NO USER ID'}")
        print(f"   Batch ID: {doc.get('batch_id', 'N/A')}")
        print(f"   Operator: {doc.get('operator_id', 'N/A')}")
        print(f"   Status: {doc.get('status', 'N/A')}")
        print(f"   Final Count: {doc.get('final_count', 'N/A')}")
        print(f"   Started: {doc.get('started_at', 'N/A')}")
        print(f"   Source: {doc.get('source_type', 'N/A')}")

    print("\n" + "=" * 60)
    print("OPERATOR STATS (completed sessions):")
    print("=" * 60)
    for op in get_operator_stats():
        print(f"  {op['_id']}: {op['total_sessions']} sessions, "
              f"{op['total_boxes']} boxes, avg {op['avg_count']:.1f}")
