#!/usr/bin/env python3
"""
Script to update imports in main.py for new folder structure
"""

import re

# Read the original file
with open('Backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Update imports
content = content.replace(
    'from database import',
    'from core.database import'
)

content = content.replace(
    'from auth import',
    'from auth.auth import'
)

content = content.replace(
    'from video_recorder import VideoRecorder',
    'from services.video_recorder import VideoRecorder'
)

content = content.replace(
    'from pdf_generator import generate_challan',
    'from services.pdf_generator import generate_challan'
)

content = content.replace(
    'from detection import BoxCounter',
    'from core.detection import BoxCounter'
)

# Fix the database.db import in profile route
content = content.replace(
    'from database import db',
    'from core.database import db'
)

# Fix tracker import in websocket
content = content.replace(
    'from tracker import CentroidTracker',
    'from core.tracker import CentroidTracker'
)

# Update paths for models, uploads, recordings, challans
content = content.replace(
    'os.path.join(os.path.dirname(__file__), os.getenv("MODEL_PATH", "models/best.pt"))',
    'os.path.join(os.path.dirname(__file__), "..", "Backend", "models", os.getenv("MODEL_PATH", "best.pt"))'
)

content = content.replace(
    'os.path.join(os.path.dirname(__file__), "..", "uploads")',
    'os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads")'
)

# Write to new location
with open('backend/core/app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Created backend/core/app.py with updated imports")
