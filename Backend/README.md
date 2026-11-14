# BoxGuard Backend

The Flask API behind BoxGuard. It runs the YOLO box counter, streams live frames over WebSocket, stores data in Supabase, and generates challan PDFs.

> For the full API and setup guide, see the [project README](../README.md).

## Setup

**Requirements:** Python 3.10+ and a Supabase project.

```bash
cd Backend
pip install -r requirements.txt
```

**1. Create the database tables.** In the Supabase dashboard, open **SQL Editor**, paste [`supabase_schema.sql`](supabase_schema.sql), and run it. Safe to re-run.

**2. Set environment variables** in the terminal you run the backend from:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Project Settings → API keys → secret / `service_role` key |
| `JWT_SECRET` | Any long random string |
| `MODEL_PATH` | `models/box_detection.pt` (optional, default) |

Windows (PowerShell): `$env:SUPABASE_URL = "https://…"`. macOS/Linux: `export SUPABASE_URL="https://…"`.

**3. Run.**

```bash
python -m core.app
```

The API listens on **http://localhost:5000**. Check it with `GET /health`.

## Project layout

```
Backend/
├── core/
│   ├── app.py              Flask routes and WebSocket stream
│   ├── database.py         Supabase data access (sessions, logs, stats)
│   ├── detection.py        YOLO loading, inference and overlay drawing
│   └── tracker.py          Centroid tracker, so each box is counted once
├── auth/
│   └── auth.py             Signup, login, bcrypt hashing and JWT tokens
├── services/
│   ├── video_recorder.py   Saves each session as a video file
│   └── pdf_generator.py    Builds the challan PDF with ReportLab
├── scripts/                Debug helpers (run with python -m scripts.<name>)
├── models/                 box_detection.pt (custom), yolov8n.pt (fallback)
├── supabase_schema.sql     Database tables and security settings
└── requirements.txt
```

## Data

| Table | Holds |
|---|---|
| `users` | Accounts, warehouse and challan details (passwords are bcrypt hashes) |
| `sessions` | Batch, operator, box count, status, and paths to recordings and uploads |
| `detection_logs` | Box counts and confidence sampled during a session. Deleted with their session. |

Row-level security is on for all three tables, with no public policies. The backend's service key can read and write them.

## Helper scripts

Run from the `Backend/` folder:

```bash
python -m scripts.check_sessions     # count sessions and print operator stats
python -m scripts.debug_batch        # show every session for one batch
python -m scripts.start_server       # check dependencies, then start the API
```

## Development notes

- The detection model loads once at start-up. Each new session creates its own counter and tracker.
- Generated files go in `../data/` (`uploads/`, `recordings/`, `challans/`). The folder is git-ignored.
- Before deploying, see the **Security Notes** in the project README.
