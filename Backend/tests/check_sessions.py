#!/usr/bin/env python3
"""
Quick script to check what sessions exist in MongoDB
"""
from database import sessions_col, list_sessions
from bson import ObjectId

print("=" * 60)
print("MONGODB SESSIONS CHECK")
print("=" * 60)

# Get total count
total = sessions_col.count_documents({})
print(f"\n📊 Total sessions in database: {total}")

if total == 0:
    print("\n❌ No sessions found in database!")
    print("\nPossible reasons:")
    print("  1. No sessions have been created yet")
    print("  2. MongoDB connection issue")
    print("  3. Wrong database/collection name")
else:
    print(f"\n✅ Found {total} sessions!\n")
    
    # Show all sessions
    print("=" * 60)
    print("ALL SESSIONS:")
    print("=" * 60)
    
    for doc in sessions_col.find().sort("started_at", -1):
        print(f"\n📦 Session ID: {doc['_id']}")
        print(f"   User ID: {doc.get('user_id', 'NO USER ID')}")
        print(f"   Batch ID: {doc.get('batch_id', 'N/A')}")
        print(f"   Operator: {doc.get('operator_id', 'N/A')}")
        print(f"   Status: {doc.get('status', 'N/A')}")
        print(f"   Final Count: {doc.get('final_count', 'N/A')}")
        print(f"   Started: {doc.get('started_at', 'N/A')}")
        print(f"   Source: {doc.get('source_type', 'N/A')}")
    
    # Check sessions by user
    print("\n" + "=" * 60)
    print("SESSIONS BY USER:")
    print("=" * 60)
    
    pipeline = [
        {"$group": {
            "_id": "$user_id",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    for result in sessions_col.aggregate(pipeline):
        user_id = result['_id']
        count = result['count']
        print(f"\n👤 User: {user_id if user_id else 'NO USER ID'}")
        print(f"   Sessions: {count}")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
