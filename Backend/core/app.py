import base64
from datetime import datetime
import json
import os
import re
import sys
import cv2
import numpy as np
import functools
from flask import Flask, jsonify, send_file, request, Response, g
from flask_cors import CORS
from flask_sock import Sock
from dotenv import load_dotenv

# Windows consoles default to cp1252, which can't print the ✓/✗ log markers
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from core.database import (
    create_session, end_session, get_session,
    list_sessions, log_detection, get_logs_for_session,
    get_operator_stats, delete_session, batch_id_exists,
)

# Try to import auth module, but don't fail if dependencies are missing
try:
    from auth.auth import create_user, login_user, verify_token, get_user_by_id, update_user
    AUTH_ENABLED = True
    print("[main] ✓ Authentication module loaded successfully")
except ImportError as e:
    AUTH_ENABLED = False
    print(f"[main] ✗ Authentication disabled - missing dependencies: {e}")
    print("[main] Run: pip install bcrypt pyjwt")

from services.video_recorder import VideoRecorder
from services.pdf_generator import generate_challan
from core.detection import BoxCounter


# ── Authentication Middleware ─────────────────────────────────────────────────
def _user_from_request(allow_query_token=False):
    """Return the verified user_id from a Bearer header (or ?token= when allowed).

    Browsers cannot send an Authorization header from <img src>, <video> or
    window.open(), so media routes accept the token as a query parameter.
    """
    if not AUTH_ENABLED:
        return None

    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):]
    elif allow_query_token:
        token = request.args.get("token")

    if not token:
        return None
    try:
        return verify_token(token).get("user_id")
    except Exception:
        return None


def _user_from_request_token(token):
    """Verify a raw JWT string (used by the WebSocket start message)."""
    if not AUTH_ENABLED or not token:
        return None
    try:
        return verify_token(token).get("user_id")
    except Exception:
        return None


def get_current_user_id():
    """The verified user for this request (set by @login_required)."""
    if hasattr(g, "user_id"):
        return g.user_id
    return _user_from_request()


def login_required(allow_query_token=False):
    """Reject the request with 401 unless it carries a valid token.

    Every session, control and upload route is user-scoped, so none of them
    may run without a verified user (an unscoped lookup would expose all data).
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if request.method == "OPTIONS":  # CORS preflight is answered by the route
                return fn(*args, **kwargs)
            user_id = _user_from_request(allow_query_token)
            if not user_id:
                return jsonify({"error": "Unauthorized"}), 401
            g.user_id = user_id
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_auth():
    """Decorator to require authentication for routes."""
    if not AUTH_ENABLED:
        return jsonify({"error": "Authentication not enabled"}), 503

    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    return None  # Auth successful


app = Flask(__name__)

# Configure CORS with explicit settings
CORS(app,
     resources={r"/*": {
         "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
         "methods": ["GET", "POST", "DELETE", "OPTIONS", "PUT", "PATCH"],
         "allow_headers": ["Content-Type", "Authorization"],
         "expose_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "max_age": 3600
     }})

sock = Sock(app)

MODEL_PATH   = os.path.join(BACKEND_DIR, os.getenv("MODEL_PATH", "models/box_detection.pt"))
FRAME_WIDTH  = 1280
FRAME_HEIGHT = 720
LOG_EVERY_N  = 30

UPLOAD_DIR = os.path.join(BACKEND_DIR, "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load YOLO model once at startup
print(f"[main] MODEL_PATH resolved to: {MODEL_PATH}")
print(f"[main] File exists: {os.path.exists(MODEL_PATH)}")
try:
    _counter = BoxCounter(MODEL_PATH)
    print("[main] YOLO model loaded successfully")
except Exception as e:
    import traceback
    _counter = None
    print(f"[main] WARN: Could not load model: {e}")
    traceback.print_exc()

# Batch ID: uppercase WORD-NUMBER with minimum 3 digits, e.g. BATCH-001, WH-001, BATCH-1111
BATCH_ID_RE = re.compile(r"^[A-Z][A-Z0-9]*-\d{3,}$")
# Operator ID: format OP-XXX with minimum 3 digits, e.g. OP-001, OP-1234
OPERATOR_ID_RE = re.compile(r"^OP-\d{3,}$")


def _validate_batch_id(batch_id: str, user_id: str = None):
    if not batch_id:
        return "Batch ID is required."
    if not BATCH_ID_RE.match(batch_id):
        return "Batch ID must be uppercase in format WORD-XXX (e.g. BATCH-001, WH-001). Minimum 3 digits required."
    if batch_id_exists(batch_id, user_id):
        return f"Batch ID '{batch_id}' already exists. Use a unique batch ID."
    return None


def _validate_operator_id(operator_id: str):
    if not operator_id:
        return "Operator ID is required."
    operator_id = operator_id.strip().upper()
    if not OPERATOR_ID_RE.match(operator_id):
        return "Operator ID must be in format OP-XXX (e.g. OP-001, OP-123). Minimum 3 digits required."
    return None


# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return jsonify({"status": "ok", "message": "WAREgaurd API is running"})


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


# ── Authentication ────────────────────────────────────────────────────────────
@app.route("/auth/signup", methods=["POST", "OPTIONS"])
def signup():
    print(f"[signup] Received {request.method} request")
    print(f"[signup] Headers: {dict(request.headers)}")

    if request.method == "OPTIONS":
        print("[signup] Handling OPTIONS preflight")
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    print("[signup] Handling POST request")

    if not AUTH_ENABLED:
        print("[signup] Auth not enabled")
        return jsonify({"success": False, "error": "Authentication module not available. Install bcrypt and pyjwt."}), 503

    try:
        data = request.get_json(silent=True) or {}
        # Never log the raw body: it contains the plaintext password
        print(f"[signup] Received data for: {data.get('email', '')}")

        email              = data.get("email", "").strip()
        password           = data.get("password", "")
        warehouse_name     = data.get("warehouse_name", "").strip()
        warehouse_location = data.get("warehouse_location", "").strip()
        contact_name       = data.get("contact_name", "").strip()
        contact_phone      = data.get("contact_phone", "").strip()
        ms_name            = data.get("ms_name", "").strip()
        transporter_id     = data.get("transporter_id", "").strip()
        courier_partner    = data.get("courier_partner", "").strip()

        print(f"[signup] Creating user: {email}")
        success, message, user_data = create_user(
            email, password, warehouse_name, warehouse_location,
            contact_name, contact_phone, ms_name, transporter_id, courier_partner
        )

        if success:
            print(f"[signup] User created successfully: {email}")
            return jsonify({"success": True, "message": message, "user": user_data}), 201
        else:
            print(f"[signup] User creation failed: {message}")
            return jsonify({"success": False, "error": message}), 200
    except Exception as e:
        print(f"[signup] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    if not AUTH_ENABLED:
        return jsonify({"success": False, "error": "Authentication module not available. Install bcrypt and pyjwt."}), 503

    try:
        data = request.get_json(silent=True) or {}

        email    = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required"}), 200

        success, message, user_data = login_user(email, password)

        if success:
            return jsonify({"success": True, "message": message, "user": user_data}), 200
        else:
            return jsonify({"success": False, "error": message}), 200
    except Exception as e:
        print(f"[login] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/profile", methods=["GET", "PUT", "OPTIONS"])
def profile():
    """Get or update current user's profile information."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    auth_error = require_auth()
    if auth_error:
        return auth_error

    user_id = get_current_user_id()

    # GET – Fetch profile
    if request.method == "GET":
        try:
            user = get_user_by_id(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            return jsonify({
                "email":              user.get("email"),
                "warehouse_name":     user.get("warehouse_name"),
                "warehouse_location": user.get("warehouse_location"),
                "contact_name":       user.get("contact_name"),
                "contact_phone":      user.get("contact_phone"),
                "ms_name":            user.get("ms_name"),
                "transporter_id":     user.get("transporter_id"),
                "courier_partner":    user.get("courier_partner"),
            }), 200
        except Exception as e:
            print(f"[get_profile] Error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    # PUT – Update profile
    if request.method == "PUT":
        try:
            data = request.get_json(silent=True) or {}
            update_fields = {}

            if "warehouse_name" in data:
                warehouse_name = data["warehouse_name"].strip()
                if not warehouse_name:
                    return jsonify({"error": "Warehouse name cannot be empty"}), 400
                update_fields["warehouse_name"] = warehouse_name

            if "warehouse_location" in data:
                warehouse_location = data["warehouse_location"].strip()
                if not warehouse_location:
                    return jsonify({"error": "Warehouse location cannot be empty"}), 400
                update_fields["warehouse_location"] = warehouse_location

            if "contact_name" in data:
                contact_name = data["contact_name"].strip()
                if not contact_name:
                    return jsonify({"error": "Contact name cannot be empty"}), 400
                update_fields["contact_name"] = contact_name

            if "contact_phone" in data:
                update_fields["contact_phone"] = data["contact_phone"].strip()

            if "ms_name" in data:
                ms_name = data["ms_name"].strip()
                if not ms_name:
                    return jsonify({"error": "M/S name cannot be empty"}), 400
                update_fields["ms_name"] = ms_name

            if "transporter_id" in data:
                transporter_id = data["transporter_id"].strip().upper()
                if not transporter_id:
                    return jsonify({"error": "Transporter ID cannot be empty"}), 400
                update_fields["transporter_id"] = transporter_id

            if "courier_partner" in data:
                courier_partner = data["courier_partner"].strip()
                if not courier_partner:
                    return jsonify({"error": "Courier partner cannot be empty"}), 400
                update_fields["courier_partner"] = courier_partner

            if not update_fields:
                return jsonify({"error": "No fields to update"}), 400

            # Saving unchanged values is not an error (update_user checks existence, not change)
            ok, msg = update_user(user_id, update_fields)
            if not ok:
                return jsonify({"error": msg}), (404 if msg == "User not found" else 400)

            user = get_user_by_id(user_id)
            return jsonify({
                "message": "Profile updated successfully",
                "user": {
                    "email":              user.get("email"),
                    "warehouse_name":     user.get("warehouse_name"),
                    "warehouse_location": user.get("warehouse_location"),
                    "contact_name":       user.get("contact_name"),
                    "contact_phone":      user.get("contact_phone"),
                    "ms_name":            user.get("ms_name"),
                    "transporter_id":     user.get("transporter_id"),
                    "courier_partner":    user.get("courier_partner"),
                }
            }), 200
        except Exception as e:
            print(f"[update_profile] Error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


@app.route("/auth/verify", methods=["GET", "OPTIONS"])
def verify():
    """Verify JWT token and return user data."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response, 200

    if not AUTH_ENABLED:
        return jsonify({"success": False, "error": "Authentication module not available"}), 503

    try:
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "No token provided"}), 401

        token   = auth_header.replace("Bearer ", "")
        payload = verify_token(token)
        user    = get_user_by_id(payload["user_id"])

        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        return jsonify({"success": True, "user": user}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        print(f"[verify] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/auth/me", methods=["GET", "OPTIONS"])
def get_current_user():
    """Get current user profile."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response, 200

    if not AUTH_ENABLED:
        return jsonify({"success": False, "error": "Authentication module not available"}), 503

    try:
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "No token provided"}), 401

        token   = auth_header.replace("Bearer ", "")
        payload = verify_token(token)
        user    = get_user_by_id(payload["user_id"])

        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        return jsonify({"success": True, "user": user}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 401
    except Exception as e:
        print(f"[get_current_user] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ── Batch / Operator Validation ───────────────────────────────────────────────
@app.route("/validate/batch", methods=["POST", "OPTIONS"])
@login_required()
def validate_batch():
    # Handle preflight request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200
    
    user_id  = get_current_user_id()
    data     = request.get_json(silent=True) or {}
    batch_id = (data.get("batch_id") or "").strip().upper()

    print(f"[validate_batch] Checking batch_id='{batch_id}' for user_id='{user_id}'")

    error = _validate_batch_id(batch_id, user_id)
    if error:
        return jsonify({"valid": False, "error": error}), 200

    return jsonify({"valid": True})


@app.route("/validate/operator", methods=["POST", "OPTIONS"])
def validate_operator():
    """Validate operator ID format only (operators can be reused across batches)."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    data        = request.get_json(silent=True) or {}
    operator_id = (data.get("operator_id") or "").strip().upper()

    error = _validate_operator_id(operator_id)
    if error:
        return jsonify({"valid": False, "error": error}), 200

    return jsonify({"valid": True})


# ── Sessions ──────────────────────────────────────────────────────────────────
@app.route("/sessions")
@login_required()
def get_sessions():
    """Get all sessions for the authenticated user."""
    user_id = get_current_user_id()
    return jsonify(list_sessions(user_id))


@app.route("/sessions/<session_id>", methods=["GET", "DELETE", "OPTIONS"])
@login_required()
def session_detail(session_id):
    """Get or delete a specific session (user-scoped)."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS')
        return response, 200

    user_id = get_current_user_id()
    session = get_session(session_id, user_id)

    if not session:
        return jsonify({"error": "Session not found"}), 404

    if request.method == "GET":
        return jsonify(session)

    # DELETE
    if request.method == "DELETE":
        try:
            if session.get("video_path") and os.path.exists(session["video_path"]):
                try:
                    os.remove(session["video_path"])
                    print(f"[DELETE] Removed video file: {session['video_path']}")
                except Exception as e:
                    print(f"[DELETE] Failed to remove video file: {e}")

            success = delete_session(session_id, user_id)

            if not success:
                return jsonify({"error": "Failed to delete session from database"}), 500

            return jsonify({"message": "Session deleted successfully"}), 200
        except Exception as e:
            print(f"[DELETE] Error deleting session: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


@app.route("/sessions/<session_id>/logs")
@login_required()
def get_session_logs(session_id):
    """Get logs for a specific session (user-scoped)."""
    user_id = get_current_user_id()
    session = get_session(session_id, user_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(get_logs_for_session(session_id))


@app.route("/sessions/<session_id>/challan", methods=["POST", "OPTIONS"])
@login_required()
def session_challan(session_id):
    """Generate and download challan PDF for a session (user-scoped)."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    user_id = get_current_user_id()
    session = get_session(session_id, user_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    try:
        logs      = get_logs_for_session(session_id)
        user_data = None
        if AUTH_ENABLED and user_id:
            try:
                user_data = get_user_by_id(user_id)
            except Exception as e:
                print(f"[Challan] Could not fetch user data: {e}")

        pdf_path = generate_challan(session, logs, user_data)
        if not os.path.exists(pdf_path):
            return jsonify({"error": "Failed to generate challan"}), 500

        filename = f"challan_{session.get('batch_id', session_id)}.pdf"
        return send_file(pdf_path, mimetype="application/pdf", as_attachment=True, download_name=filename)
    except Exception as e:
        print(f"[Challan] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/stats/operators")
@login_required()
def operator_stats():
    """Get operator statistics for the authenticated user."""
    user_id = get_current_user_id()
    return jsonify(get_operator_stats(user_id))


@app.route("/upload", methods=["POST", "OPTIONS"])
@login_required()
def upload_video():
    """Handle video file uploads."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400

        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads")
        os.makedirs(uploads_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_ext  = os.path.splitext(video_file.filename)[1]
        filename  = f"upload_{timestamp}{file_ext}"
        filepath  = os.path.abspath(os.path.join(uploads_dir, filename))

        video_file.save(filepath)
        print(f"[Upload] Video saved: {filename}")

        return jsonify({"success": True, "path": filepath, "filename": filename}), 200
    except Exception as e:
        print(f"[Upload] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── Video serving ─────────────────────────────────────────────────────────────
def _mjpeg_stream(path):
    """Stream any video file as MJPEG – works in all browsers regardless of codec.
    Accepts ?speed=0.5|1|1.5|2 query param to control playback rate."""
    try:
        speed = float(request.args.get("speed", 1))
        speed = max(0.25, min(speed, 4.0))
    except (ValueError, TypeError):
        speed = 1.0

    def generate():
        import time
        cap   = cv2.VideoCapture(path)
        fps   = cap.get(cv2.CAP_PROP_FPS) or 10
        delay = 1.0 / (fps * speed)
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    buf.tobytes() +
                    b"\r\n"
                )
                time.sleep(delay)
        finally:
            cap.release()

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/sessions/<session_id>/video")
@login_required(allow_query_token=True)
def session_video(session_id):
    """Download video for a session (user-scoped)."""
    user_id = get_current_user_id()
    session = get_session(session_id, user_id)

    if not session or not session.get("video_path"):
        return jsonify({"error": "Video not found"}), 404

    path = session["video_path"]
    if not os.path.exists(path):
        return jsonify({"error": "Video file missing"}), 404

    filename = f"session_{session_id}_{session.get('batch_id', 'video')}.mp4"
    return send_file(path, mimetype="video/mp4", as_attachment=True, download_name=filename)


@app.route("/sessions/<session_id>/video/stream")
@login_required(allow_query_token=True)
def session_video_stream(session_id):
    """Stream video for a session (user-scoped)."""
    user_id = get_current_user_id()
    session = get_session(session_id, user_id)

    if not session or not session.get("video_path"):
        return jsonify({"error": "Video not found"}), 404

    path = session["video_path"]
    if not os.path.exists(path):
        return jsonify({"error": "Video file missing"}), 404

    return _mjpeg_stream(path)


@app.route("/sessions/<session_id>/upload")
@login_required(allow_query_token=True)
def session_upload(session_id):
    """Serve uploaded file for a session (user-scoped)."""
    user_id = get_current_user_id()
    session = get_session(session_id, user_id)

    if not session or not session.get("upload_path"):
        return jsonify({"error": "No uploaded file for this session"}), 404

    path = session["upload_path"]
    if not os.path.exists(path):
        return jsonify({"error": "Uploaded file missing"}), 404

    filename = f"upload_{session_id}.mp4"
    return send_file(path, mimetype="video/mp4", as_attachment=True, download_name=filename)


@app.route("/sessions/<session_id>/upload/stream")
@login_required(allow_query_token=True)
def session_upload_stream(session_id):
    """Stream uploaded file for a session (user-scoped)."""
    user_id = get_current_user_id()
    session = get_session(session_id, user_id)

    if not session or not session.get("upload_path"):
        return jsonify({"error": "No uploaded file for this session"}), 404

    path = session["upload_path"]
    if not os.path.exists(path):
        return jsonify({"error": "Uploaded file missing"}), 404

    return _mjpeg_stream(path)


# ── WebSocket – live stream ───────────────────────────────────────────────────
# Global control variables
is_paused            = False
do_reset             = False
confidence_threshold = 0.35


@app.route("/control/pause", methods=["POST", "OPTIONS"])
@login_required()
def control_pause():
    """Toggle pause state for the active session."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    global is_paused
    is_paused = not is_paused
    return jsonify({"paused": is_paused})


@app.route("/control/reset", methods=["POST", "OPTIONS"])
@login_required()
def control_reset():
    """Reset the video to frame 0 and clear count history."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    global is_paused, do_reset
    is_paused = False
    do_reset  = True
    return jsonify({"reset": True})


@app.route("/settings/confidence", methods=["POST", "OPTIONS"])
@login_required()
def settings_confidence():
    """Update the confidence threshold for YOLO detection."""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200

    global confidence_threshold
    data  = request.get_json(silent=True) or {}
    value = data.get("value", 0.35)
    try:
        confidence_threshold = max(0.0, min(1.0, float(value)))
        print(f"[API] Confidence threshold updated to: {confidence_threshold:.2f}")
        return jsonify({"confidence": confidence_threshold})
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid confidence value"}), 400


@sock.route("/ws/stream")
def websocket_stream(ws):
    try:
        init = json.loads(ws.receive())
    except Exception:
        return

    if init.get("action") != "start":
        ws.send(json.dumps({"error": "First message must have action=start"}))
        return

    # The user comes from the verified JWT, never from a client-supplied user_id
    user_id = _user_from_request_token(init.get("token"))
    if not user_id:
        ws.send(json.dumps({"error": "Unauthorized: sign in again"}))
        return

    batch_id     = (init.get("batch_id") or "").strip().upper()
    operator_id  = (init.get("operator_id") or "").strip().upper()
    camera_index = int(init.get("camera_index", 0))
    video_path   = init.get("video_path", None)
    confidence   = float(init.get("confidence", 0.35))

    try:
        batch_error = _validate_batch_id(batch_id, user_id)
        if batch_error:
            ws.send(json.dumps({"error": batch_error}))
            return

        operator_error = _validate_operator_id(operator_id)
        if operator_error:
            ws.send(json.dumps({"error": operator_error}))
            return

        source_type = "upload" if video_path else "live"
        session_id  = create_session(batch_id, operator_id, user_id, source_type, video_path)

        counter = None
        if _counter:
            try:
                counter = BoxCounter(MODEL_PATH)
                counter.set_confidence(confidence)
            except Exception as e:
                print(f"[WS] Failed to create counter: {e}")

        recorder = VideoRecorder(session_id, fps=10, resolution=(FRAME_WIDTH, FRAME_HEIGHT))

        source = video_path if video_path else camera_index
        cap    = cv2.VideoCapture(source)
        if not video_path:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

        if not cap.isOpened():
            ws.send(json.dumps({"error": "Cannot open video source"}))
            end_session(session_id, 0, None)
            return

        ws.send(json.dumps({"session_id": session_id, "session_active": True, "count": 0, "frame": ""}))
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            ws.send(json.dumps({"error": f"Internal Server Error: {str(e)}"}))
        except Exception:
            pass
        return

    frame_num           = 0
    count               = 0
    max_count           = 0
    last_frame          = None
    last_count          = 0
    frame_box_count     = 0  # Actual boxes in current frame
    max_frame_count     = 0  # Max boxes seen in any single frame

    try:
        while ws.connected:
            global is_paused, confidence_threshold, do_reset

            if do_reset:
                do_reset           = False
                count              = 0
                max_count          = 0
                frame_num          = 0
                last_count         = 0
                frame_box_count    = 0
                max_frame_count    = 0

                if counter:
                    try:
                        from core.tracker import CentroidTracker
                        counter._tracker = CentroidTracker()
                    except ImportError:
                        pass

                if video_path:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

                is_paused = True
                ret, r_frame = cap.read()
                if ret:
                    r_frame    = cv2.resize(r_frame, (FRAME_WIDTH, FRAME_HEIGHT))
                    if counter:
                        r_frame = counter.draw_overlay(r_frame, 0)
                    last_frame = r_frame.copy()

            if counter and hasattr(counter, '_confidence_threshold'):
                if abs(counter._confidence_threshold - confidence_threshold) > 0.01:
                    print(f"[WS] Updating counter confidence from {counter._confidence_threshold:.2f} to {confidence_threshold:.2f}")
                    counter.set_confidence(confidence_threshold)

            if is_paused:
                if last_frame is not None:
                    _, buf = cv2.imencode(".jpg", last_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    try:
                        ws.send(json.dumps({
                            "frame":          base64.b64encode(buf).decode(),
                            "count":          last_count,
                            "session_active": True,
                            "session_id":     session_id,
                            "paused":         True,
                        }))
                    except Exception:
                        break
                import time
                time.sleep(0.1)
                continue

            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

            if counter:
                count, confidences, frame_box_count = counter.process_frame(frame)
                max_count       = max(max_count, count)  # Max tracker ID (for live)
                max_frame_count = max(max_frame_count, frame_box_count)  # Max boxes in any frame

                frame = counter.draw_overlay(frame, count)

                if video_path:
                    import time
                    time.sleep(0.03)

                frame_num += 1
                if frame_num % LOG_EVERY_N == 0:
                    avg_conf = float(np.mean(confidences)) if confidences else 0.0
                    log_detection(session_id, count, avg_conf)
            else:
                cv2.putText(frame, "No model loaded", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            last_frame = frame.copy()
            last_count = count

            recorder.write(frame)

            if not ws.connected:
                break

            # For display: show frame_box_count for video, tracker count for live
            display_count = frame_box_count if video_path else count
            
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            try:
                ws.send(json.dumps({
                    "frame":          base64.b64encode(buf).decode(),
                    "count":          display_count,
                    "session_active": True,
                    "session_id":     session_id,
                }))
            except Exception:
                break

    except Exception as e:
        print(f"[WS] Stream ended: {e}")
    finally:
        cap.release()
        saved_path  = recorder.stop()

        # For video upload: use frame_box_count (boxes in last frame)
        # For live monitoring: use max_count (total unique boxes tracked)
        final_count = frame_box_count if video_path else max_count
        print(f"[WS] Session ended - Source: {'video' if video_path else 'live'}, "
              f"Final count: {final_count}, Max tracked: {max_count}, "
              f"Last frame boxes: {frame_box_count}, Max frame boxes: {max_frame_count}")

        end_session(session_id, final_count, saved_path)
        try:
            if ws.connected:
                ws.send(json.dumps({
                    "frame":          "",
                    "count":          final_count,
                    "session_active": False,
                    "session_id":     session_id,
                }))
        except Exception:
            pass


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)