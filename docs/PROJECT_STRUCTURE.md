# BoxGuard - Project Structure

BoxGuard is an AI-powered warehouse box counting system. It uses YOLO object detection with centroid tracking to count boxes in real time from a live camera feed or an uploaded video.

## Folder Structure

```
nexus_codestorm/
│
├── Backend/                          # Flask backend (port 5000)
│   ├── core/
│   │   ├── app.py                   # Flask app, REST routes, WebSocket stream
│   │   ├── database.py              # MongoDB operations
│   │   ├── detection.py             # YOLO detection (auto-detects v5/v8 weights)
│   │   └── tracker.py               # Centroid tracking
│   ├── services/
│   │   ├── video_recorder.py        # Session recording -> data/recordings/
│   │   └── pdf_generator.py         # Challan PDFs -> data/challans/
│   ├── auth/
│   │   └── auth.py                  # JWT auth (bcrypt + PyJWT)
│   ├── scripts/                      # Manual debug/diagnostic scripts
│   ├── models/
│   │   ├── box_detection.pt         # Custom trained model (default)
│   │   └── yolov8n.pt               # Fallback if the custom model is missing
│   ├── .env                          # MONGO_URI, MODEL_PATH, JWT_SECRET
│   ├── requirements.txt
│   └── README.md                     # Backend API documentation
│
├── Frontend/                         # React + Vite frontend (port 5173)
│   ├── src/
│   │   ├── api/                     # Axios API client + WebSocket URL
│   │   ├── components/              # Shared UI components
│   │   ├── context/                 # SessionContext
│   │   ├── hooks/                   # useWebSocket
│   │   ├── pages/                   # Landing, Login, Signup, Dashboard,
│   │   │                            # Sessions, OperatorStats, Profile
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   └── package.json
│
├── data/                             # Runtime output (git-ignored)
│   ├── recordings/
│   ├── uploads/
│   └── challans/
│
├── docs/                             # This file, DESIGN_SYSTEM.md
├── archive/                          # Superseded early implementation (reference only)
├── start.bat                         # Starts backend + frontend on Windows
└── README.md
```

## Running

```bash
# Backend (from Backend/, with venv active)
python -m core.app

# Frontend (from Frontend/)
npm run dev
```

Or run `start.bat` from the project root on Windows; it uses `Backend/venv` when present.

All backend paths (`.env`, models, `data/`) are resolved relative to the source files, so the backend works regardless of the current working directory as long as it is started as a module (`python -m core.app`) from `Backend/`.

Debug scripts are run the same way, e.g. `python -m scripts.test_routes`.
