<div align="center">

# 📦 BoxGuard

**AI-powered box counting for warehouse packing.**
Count boxes with a camera, keep a video record of every session, and generate a packing challan in one click.

![AI Powered](https://img.shields.io/badge/AI-YOLO%20Vision-0ea5e9?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61dafb?style=for-the-badge&logo=react&logoColor=white)
![Backend](https://img.shields.io/badge/Backend-Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Database](https://img.shields.io/badge/Database-Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)

[Features](#-features) · [Quick Start](#-quick-start) · [How It Works](#-how-it-works) · [API](#-api-reference) · [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Features

| | |
|---|---|
| 🎯 **Live box counting** | YOLO detection with a tracker, so each box is counted once, from a live camera or an uploaded video. |
| 🎚️ **Adjustable confidence** | Tune the detection threshold (default 35%) during a session. |
| 🎥 **Session recordings** | Every session is recorded and can be replayed at 0.5×–2× speed. |
| 🧾 **Packing challans** | One-click PDF challans with your company, transporter and courier details. |
| 📊 **Operator analytics** | Throughput trends, operator leaderboard, 24-hour activity and a full PDF export. |
| 🔐 **Accounts** | Sign-up and login with JWT sessions (24 h) and strong-password rules. |
| 🧭 **Live dashboard** | Real-time frames and counts streamed over WebSocket. |

---

## 🧱 Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Framer Motion, Recharts, React Router 7, Axios, jsPDF
- **Backend:** Python, Flask, flask-sock (WebSocket), Flask-CORS, OpenCV
- **AI:** Ultralytics YOLO (custom `box_detection.pt`, with `yolov8n.pt` as fallback), PyTorch
- **Data:** Supabase (Postgres) for users, sessions and detection logs
- **Files:** ReportLab for challan PDFs; local folders for recordings and uploads

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 20.19+ or 22.12+** (tested with 22.16)
- **A free Supabase account:** [supabase.com](https://supabase.com)
- **Webcam** (optional, for live counting)

### 1. Clone the project

```bash
git clone <repository-url>
cd nexus-codestorm
```

### 2. Set up Supabase (one time)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **Project Settings → API** and copy the **Project URL** and the **`service_role` / secret key**.
3. Open **SQL Editor**, paste the contents of [`Backend/supabase_schema.sql`](Backend/supabase_schema.sql), and click **Run**.

### 3. Configure the backend

Set these environment variables in the terminal you start the backend from:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Project URL, e.g. `https://your-project-ref.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Your `service_role` / secret key |
| `JWT_SECRET` | A long random string |
| `MODEL_PATH` | `models/box_detection.pt` (optional, this is the default) |

Windows (PowerShell):

```powershell
$env:SUPABASE_URL = "https://your-project-ref.supabase.co"
$env:SUPABASE_SERVICE_KEY = "your-service-role-key"
$env:JWT_SECRET = "a-long-random-string"
```

macOS / Linux:

```bash
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
export JWT_SECRET="a-long-random-string"
```

> ⚠️ The service key bypasses database security. Keep it on the server only and never put it in the frontend.

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

### 4. Install the frontend

```bash
cd ../Frontend
npm install
```

### 5. Run it

**Option A: one click (Windows)**

```bash
start.bat
```

**Option B: two terminals**

```bash
# Terminal 1: backend API on http://localhost:5000
cd Backend
python -m core.app

# Terminal 2: frontend on http://localhost:5173
cd Frontend
npm run dev
```

Open **http://localhost:5173**, create an account, and start your first session. 🎉

---

## 🔄 How It Works

```
 ┌──────────────┐   WebSocket frames   ┌──────────────────┐   box counts    ┌──────────────┐
 │  Camera or   │ ───────────────────▶ │  Flask backend   │ ──────────────▶ │   Supabase   │
 │  video file  │                      │  YOLO + tracker  │   session logs  │  (Postgres)  │
 └──────────────┘                      └────────┬─────────┘                 └──────────────┘
                                                │ live frames + count
                                                ▼
                                       ┌──────────────────┐
                                       │  React dashboard │  → challan PDF, recordings, analytics
                                       └──────────────────┘
```

1. **Set up a session.** Enter a batch ID (`BATCH-001`) and an operator ID (`OP-001`), then pick a camera or upload a video.
2. **Count.** The model detects boxes on each frame. The tracker gives each box an ID, so a box is counted once even as it moves.
3. **Control.** Pause, resume or reset, and adjust the confidence threshold while the session runs.
4. **Finish.** Stop the session. The count, recording and logs are saved to Supabase and the `data/` folder.
5. **Review.** Download the challan PDF, watch the recording, or check operator analytics.

---

## 🧭 Using BoxGuard

### Batch and operator IDs

| Field | Format | Examples | Rules |
|---|---|---|---|
| Batch ID | `WORD-NUMBER` | `BATCH-001`, `WH-123` | Uppercase, at least 3 digits, unique per user |
| Operator ID | `OP-NUMBER` | `OP-001`, `OP-123` | Uppercase, at least 3 digits, reusable across batches |

### Password rules

At least 8 characters, with one uppercase letter, one lowercase letter, one number and one special character from `@ $ ! % * ? &`.

### Video sources

- **Live camera:** uses the default webcam.
- **Upload video:** MP4, AVI, MOV, MKV or WEBM.

### Challans

The challan includes your M/S name, transporter ID, courier partner, batch and operator, box count, pickup date, and a generation timestamp. Set these under **Profile Settings**.

---

## 📁 Project Structure

```
nexus-codestorm/
├── Backend/                    Flask API, detection, database and PDF generation
│   ├── core/                   app.py (routes), database.py (Supabase), detection.py (YOLO), tracker.py
│   ├── auth/                   JWT login, signup and password rules
│   ├── services/               video_recorder.py, pdf_generator.py
│   ├── scripts/                Debug and diagnostic helpers
│   ├── models/                 box_detection.pt (custom), yolov8n.pt (fallback)
│   ├── supabase_schema.sql     Database tables (run once in Supabase)
│   └── requirements.txt
├── Frontend/                   React + Vite dashboard
│   └── src/                    pages/, components/, api/, hooks/, context/
├── data/                       Generated files (git-ignored): uploads, recordings, challans
├── docs/                       Design system and structure notes
├── archive/                    Earlier implementation, kept for reference
└── start.bat                   Starts backend and frontend (Windows)
```

---

## 🔌 API Reference

Base URL: `http://localhost:5000`. Protected routes take `Authorization: Bearer <token>`.

### Accounts

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/signup` | Create an account (returns a token) |
| `POST` | `/auth/login` | Log in (returns a token) |
| `GET` | `/auth/verify` | Check a token and get the user |
| `GET` | `/auth/me` | Get the current user |
| `GET` / `PUT` | `/profile` | Read or update warehouse and challan details |

### Validation

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/validate/batch` | Check a batch ID format and uniqueness |
| `POST` | `/validate/operator` | Check an operator ID format |

### Sessions and analytics

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/sessions` | List your sessions, newest first |
| `GET` / `DELETE` | `/sessions/<id>` | Get or delete one session |
| `GET` | `/sessions/<id>/logs` | Detection logs for a session |
| `POST` | `/sessions/<id>/challan` | Generate the challan PDF |
| `GET` | `/sessions/<id>/video` | Download the recording |
| `GET` | `/sessions/<id>/video/stream` | Stream the recording (`?speed=0.5–4`) |
| `GET` | `/sessions/<id>/upload/stream` | Stream the uploaded source video |
| `GET` | `/stats/operators` | Operator totals and averages |
| `POST` | `/upload` | Upload a video file for a session |

### Live control

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/control/pause` | Toggle pause |
| `POST` | `/control/reset` | Reset the count and rewind |
| `POST` | `/settings/confidence` | Set the threshold, `{"value": 0.35}` |
| `WS` | `/ws/stream` | Live detection stream |

### WebSocket protocol

**1. Start a session** (first message after connecting):

```json
{
  "action": "start",
  "batch_id": "BATCH-001",
  "operator_id": "OP-001",
  "camera_index": 0,
  "video_path": null,
  "confidence": 0.35,
  "user_id": "your-user-id"
}
```

**2. Receive frames** (repeated until the session ends):

```json
{ "frame": "<base64 JPEG>", "count": 15, "session_active": true, "session_id": "…" }
```

When `session_active` becomes `false`, the session has ended. An `error` field means the request was rejected.

---

## 🛠️ Troubleshooting

| Symptom | Fix |
|---|---|
| `SUPABASE_URL and SUPABASE_SERVICE_KEY must be set` | Set both environment variables in the terminal before starting the backend (see step 3). |
| Login or sessions return errors | Confirm the schema ran in Supabase (SQL Editor → `supabase_schema.sql`). |
| Frontend shows *Backend not reachable* | Start the backend and check it is on port 5000. |
| Camera not working | Allow camera access in the browser, and make sure no other app is using the webcam. |
| Model not found | `Backend/models/box_detection.pt` must exist. Without it, the fallback `yolov8n.pt` is used. |
| Recording is not H.264 | H.264 (`avc1`) is not always available. Recordings fall back to MP4 (`mp4v`) or AVI (MJPG). They still save. |

Debug helpers, run from `Backend/`:

```bash
python -m scripts.check_sessions     # list sessions and operator stats
python -m scripts.debug_batch        # inspect one batch
python -m scripts.start_server       # check dependencies, then start
```

---

## 🔐 Security Notes

BoxGuard is a working prototype. Before you deploy it, review these:

- Keep `SUPABASE_SERVICE_KEY` and `JWT_SECRET` secret. Use a long random `JWT_SECRET`.
- Some read routes (session details, recordings) do not yet require a login. Require a token on those routes before exposing the server.
- The WebSocket trusts the `user_id` sent in the start message. Check it against the JWT before production use.
- Run behind HTTPS and a production server such as gunicorn. Turn off debug mode.

---

## 🗺️ Roadmap

- Require authentication on every session route
- Verify WebSocket users from the JWT
- Move API URLs into environment variables for deployment
- Share one detection model across sessions for faster start-up

---

## 📄 License

© 2025 BoxGuard Systems. All rights reserved.

---

<div align="center">

**BoxGuard**: Count smarter. Pack smarter. Ship smarter. 📦

</div>
