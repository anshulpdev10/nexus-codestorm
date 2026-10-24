# warehouse-box-counter-ai

AI-based warehouse box counting module using YOLO and Centroid Tracking.

## Features
- Real-time object detection using YOLO
- Robust tracking with CentroidTracker and temporal smoothing
- Configurable via environment variables
- REST API for processing single frames and MJPEG streaming

## Setup

1. Clone the repository
2. Install dependencies:
   `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and adjust the variables.
4. Obtain a YOLO `.pt` model and place it at `MODEL_PATH`.

## Running Locally
Run the Flask server:
```bash
python app.py
```

## Running with Docker
Build the docker image:
```bash
docker build -t warehouse-box-counter-ai .
```
Run the docker container:
```bash
docker run -p 8000:8000 --env-file .env warehouse-box-counter-ai
```

## API Endpoints
- `GET /health` - Health check.
- `POST /detect` - Accepts a JPEG via multipart form-data (field `frame`) and returns JSON `{"boxes": [...], "box_count": count}`.
- `GET /stream` - Provides an MJPEG video stream from the configured `VIDEO_SOURCE`.
- `POST /config` - Update parameters at runtime. Expects JSON: `{"confidence_threshold": 0.6, "max_disappeared": 15}`.
