# BoxGuard Backend

Professional Flask-based backend for the Warehouse Box Counter system.

## Project Structure

```
Backend/
├── core/                     # Core application modules
│   ├── __init__.py
│   ├── app.py               # Main Flask application
│   ├── database.py          # MongoDB operations
│   ├── detection.py         # YOLO box detection
│   └── tracker.py           # Centroid tracking algorithm
├── services/                # Business logic services
│   ├── __init__.py
│   ├── video_recorder.py    # Video recording service
│   └── pdf_generator.py     # PDF challan generation
├── auth/                    # Authentication (optional)
│   ├── __init__.py
│   └── auth.py              # JWT-based authentication
├── scripts/                 # Manual debug/diagnostic scripts (run with python -m scripts.<name>)
│   ├── check_sessions.py
│   ├── debug_batch.py
│   ├── start_server.py      # Dependency check + start
│   ├── test_confidence.py
│   ├── test_imports.py
│   ├── test_routes.py
│   └── test_server.html
├── models/                  # YOLO model files
│   ├── box_detection.pt    # Custom trained model
│   └── yolov8n.pt          # Fallback generic model
├── .env                     # Environment configuration
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Quick Start

### 1. Install Dependencies

```bash
cd Backend
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` file with your MongoDB connection:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/warehouse_counter
MODEL_PATH=models/box_detection.pt
JWT_SECRET=your-secret-key
```

### 3. Run Server

```bash
python -m core.app
```

Or use the helper script:

```bash
python -m scripts.start_server
```

Server runs on `http://localhost:5000`

## API Endpoints

### Health
- `GET /` - Health check
- `GET /health` - Health status

### Authentication (Optional)
- `POST /auth/signup` - Register new user
- `POST /auth/login` - User login
- `GET /auth/verify` - Verify JWT token
- `GET /auth/me` - Get current user profile
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Validation
- `POST /validate/batch` - Validate batch ID
- `POST /validate/operator` - Validate operator ID

### Sessions
- `GET /sessions` - List all sessions (user-scoped)
- `GET /sessions/<id>` - Get session details
- `DELETE /sessions/<id>` - Delete session
- `GET /sessions/<id>/logs` - Get detection logs
- `POST /sessions/<id>/challan` - Generate PDF challan

### Stats
- `GET /stats/operators` - Get operator statistics

### Video
- `POST /upload` - Upload video file
- `GET /sessions/<id>/video` - Download session video
- `GET /sessions/<id>/video/stream` - Stream session video
- `GET /sessions/<id>/upload/stream` - Stream uploaded video

### WebSocket
- `WS /ws/stream` - Live detection stream

## WebSocket Protocol

### Connect & Start Session

```json
{
  "action": "start",
  "batch_id": "BATCH-001",
  "operator_id": "OP-001",
  "camera_index": 0,
  "video_path": null,
  "confidence": 0.35,
  "user_id": "optional_user_id"
}
```

### Receive Frames

```json
{
  "frame": "base64_encoded_jpeg",
  "count": 15,
  "session_active": true,
  "session_id": "session_id_here"
}
```

## Dependencies

- **Flask** - Web framework
- **flask-cors** - CORS support
- **flask-sock** - WebSocket support
- **pymongo** - MongoDB driver
- **opencv-python** - Computer vision
- **ultralytics** - YOLOv8 detection
- **reportlab** - PDF generation
- **bcrypt** - Password hashing (optional)
- **pyjwt** - JWT tokens (optional)

## Architecture

- **Flask App**: REST API + WebSocket server
- **MongoDB Atlas**: Cloud database for sessions and logs
- **YOLO Detection**: Real-time box counting
- **Centroid Tracking**: Stable object tracking across frames
- **Video Recording**: MP4 session recordings
- **PDF Generation**: Professional challan documents

## Development

### Run Tests

```bash
cd tests
python test_imports.py
python test_routes.py
python test_confidence.py
```

### Debug

```bash
python -m scripts.check_sessions
python -m scripts.debug_batch
```

## Production Notes

- Set `debug=False` in `app.run()`
- Use a production WSGI server (gunicorn, uwsgi)
- Set strong `JWT_SECRET` in production
- Configure proper CORS origins
- Use HTTPS in production

## License

Proprietary - BoxGuard Systems
