# Project Restructure Plan

## Current Issues
- Mixed test files and production code
- `ai/` folder appears to be old/experimental code
- No clear separation between core, optional, and utility modules
- Test files scattered in Backend folder

## Proposed Structure

```
nexus_codestorm/
├── backend/
│   ├── core/                  # Core application modules
│   │   ├── __init__.py
│   │   ├── app.py            # Flask app (renamed from main.py)
│   │   ├── database.py       # MongoDB operations
│   │   ├── detection.py      # YOLO detection
│   │   └── tracker.py        # Centroid tracking
│   ├── services/             # Business logic services
│   │   ├── __init__.py
│   │   ├── video_recorder.py
│   │   └── pdf_generator.py
│   ├── auth/                 # Authentication module (optional)
│   │   ├── __init__.py
│   │   └── auth.py
│   ├── models/               # YOLO model files
│   │   ├── best.pt          # Custom trained model
│   │   └── yolov8n.pt       # Fallback model
│   ├── utils/                # Utility scripts
│   │   ├── __init__.py
│   │   └── start_server.py  # Helper startup script
│   ├── tests/                # Test and debug scripts
│   │   ├── check_sessions.py
│   │   ├── debug_batch.py
│   │   ├── test_confidence.py
│   │   ├── test_imports.py
│   │   ├── test_routes.py
│   │   └── test_server.html
│   ├── .env                  # Environment variables
│   ├── .gitignore
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── README.md
│
├── data/                     # Data storage
│   ├── recordings/          # Session video recordings
│   ├── uploads/             # User uploaded videos
│   └── challans/            # Generated PDF challans
│
├── archive/                  # Archived/experimental code
│   └── ai/                  # Old AI implementation
│
├── .gitignore
├── README.md
├── DESIGN_SYSTEM.md
└── docker-compose.yml       # Optional: for future deployment
```

## Migration Steps

### Phase 1: Backend Restructure
1. Create new folder structure
2. Move core modules to `backend/core/`
3. Move services to `backend/services/`
4. Move auth to `backend/auth/`
5. Move tests to `backend/tests/`
6. Move utilities to `backend/utils/`
7. Update all imports

### Phase 2: Archive Old Code
1. Move `ai/` folder to `archive/ai/`
2. Add README explaining it's archived

### Phase 3: Data Folder Consolidation
1. Move `recordings/`, `uploads/`, `challans/` to top-level `data/`
2. Update paths in code

### Phase 4: Frontend (Already Clean)
- Frontend structure is already good, no changes needed

### Phase 5: Root Cleanup
- Update root .gitignore
- Update README with new structure
- Remove temporary files

## Files to Delete (After Backup)
- `Backend/main_minimal.py` (minimal test version)
- `Backend/restructure.py` (migration script, run once)
- `Backend/install_auth.bat` (Windows batch file)
- `Backend/restart_server.bat` (Windows batch file)
- Test HTML files scattered around

## Import Changes Required
After restructure, imports will change:
```python
# Old
from database import create_session
from video_recorder import VideoRecorder
from detection import BoxCounter

# New
from core.database import create_session
from services.video_recorder import VideoRecorder
from core.detection import BoxCounter
```
