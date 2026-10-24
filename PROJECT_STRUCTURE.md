# BoxGuard - Project Structure

> **Last Updated**: June 13, 2026  
> **Status**: Restructured for production readiness

## Overview

BoxGuard is an AI-powered warehouse box counting system built for a 24-hour hackathon. The system uses YOLOv8 object detection with centroid tracking to accurately count boxes in real-time from live camera feeds or uploaded videos.

## Folder Structure

```
nexus_codestorm/
│
├── backend/                          # Flask backend (ACTIVE)
│   ├── core/                         # Core application modules
│   │   ├── app.py                   # Main Flask application
│   │   ├── database.py              # MongoDB operations
│   │   ├── detection.py             # YOLO detection engine
│   │   └── tracker.py               # Centroid tracking
│   ├── services/                     # Business logic
│   │   ├── video_recorder.py        # Session recording
│   │   └── pdf_generator.py         # Challan PDF generation
│   ├── auth/                         # Authentication (optional)
│   │   └── auth.py                  # JWT-based auth
│   ├── utils/                        # Utility scripts
│   │   └── start_server.py          # Startup helper
│   ├── tests/                        # Test & debug scripts
│   ├── models/                       # YOLO model files
│   │   ├── best.pt                  # Custom trained model
│   │   └── yolov8n.pt               # Fallback model
│   ├── .env                          # Environment config
│   ├── requirements.txt              # Python dependencies
│   └── README.md                     # Backend documentation
│
├── Frontend/                         # React frontend (ACTIVE)
│   ├── src/
│   │   ├── api/                     # API client functions
│   │   ├── components/              # Reusable components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── pages/                   # Page components
│   │   │   ├── Dashboard.jsx        # Main detection interface
│   │   │   ├── Sessions.jsx         # Session history
│   │   │   └── OperatorStats.jsx    # Operator statistics
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # Entry point
│   ├── public/                       # Static assets
│   ├── package.json                  # Node dependencies
│   └── README.md                     # Frontend documentation
│
├── data/                             # Runtime data storage
│   ├── recordings/                  # Session video recordings
│   ├── uploads/                     # User uploaded videos
│   └── challans/                    # Generated PDF challans
│
├── archive/                          # Archived/experimental code
│   ├── ai/                          # Old implementation (superseded)
│   └── README.md                     # Archive documentation
│
├── Backend/                          # Old backend folder (to be removed)
│   └── [legacy files]               # Keep temporarily for reference
│
├── .gitignore                        # Git ignore rules
├── DESIGN_SYSTEM.md                  # Design system documentation
├── PROJECT_STRUCTURE.md              # This file
├── RESTRUCTURE_PLAN.md               # Restructuring plan & notes
└── README.md                         # Main project README
```

## Active Components

### Backend (`/backend/`)
- **Language**: Python 3.10+
- **Framework**: Flask + flask-sock (WebSocket)
- **Database**: MongoDB Atlas (cloud)
- **AI/ML**: YOLOv8 (Ultralytics) + OpenCV
- **Port**: 5000

### Frontend (`/Frontend/`)
- **Language**: JavaScript (ES6+)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Port**: 5173

### Data Storage (`/data/`)
- **recordings/**: MP4 session recordings
- **uploads/**: User-uploaded video files
- **challans/**: Generated PDF documents

## Archived Components

### `/archive/ai/`
Early implementation attempt with different architecture. Superseded by current modular backend structure. Kept for reference only.

## Key Features

1. **Live Camera Feed**: Real-time box detection from webcam
2. **Video Upload**: Process pre-recorded videos
3. **Session Management**: Track batches and operators
4. **PDF Challan Generation**: Professional packing slips
5. **Operator Statistics**: Performance analytics
6. **Authentication**: Optional JWT-based user auth
7. **WebSocket Streaming**: Low-latency video feed

## Technology Stack

### Backend
- Flask 2.3+
- PyMongo (MongoDB driver)
- OpenCV (cv2)
- Ultralytics YOLOv8
- ReportLab (PDF generation)
- bcrypt + PyJWT (auth)

### Frontend  
- React 18
- Vite
- Tailwind CSS
- Axios
- React Router DOM
- lucide-react

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Configure .env with MongoDB URI
python -m core.app
```

### Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

## Migration Notes

**Restructure Date**: June 13, 2026

### What Changed
- Moved core modules to `backend/core/`
- Moved services to `backend/services/`
- Moved auth to `backend/auth/`
- Moved tests to `backend/tests/`
- Consolidated data in `data/` folder
- Archived old `ai/` folder
- Updated all imports

### What's Next
- Remove old `Backend/` folder after validation
- Update deployment scripts
- Update documentation links

## Documentation

- `/backend/README.md` - Backend API documentation
- `/Frontend/README.md` - Frontend component docs
- `/DESIGN_SYSTEM.md` - UI/UX design system
- `/archive/README.md` - Archive information

## License

Proprietary - BoxGuard Systems
