import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

import json
import cv2
import numpy as np
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv

from src.detector import detect_boxes
from src.tracker import CentroidTracker
from src.counter import get_stable_count, is_inside_roi
from src.utils import encode_frame_to_jpeg, draw_overlay, get_centroid
from src.utils import preprocess_frame

load_dotenv()

app = Flask(__name__)

confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", 0.5))
max_disappeared = int(os.getenv("MAX_DISAPPEARED", 10))
max_distance = int(os.getenv("MAX_DISTANCE", 60))

try:
    roi_points_str = os.getenv("ROI_POINTS", "[[0,0],[640,0],[640,480],[0,480]]")
    roi_points = json.loads(roi_points_str)
    roi_polygon = np.array(roi_points, dtype=np.int32)
except Exception:
    roi_polygon = np.array([[0,0],[640,0],[640,480],[0,480]], dtype=np.int32)

tracker = CentroidTracker(max_disappeared=max_disappeared, max_distance=max_distance)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/config', methods=['POST'])
def update_config():
    global confidence_threshold, tracker
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400
    
    if 'confidence_threshold' in data:
        confidence_threshold = float(data['confidence_threshold'])
    if 'max_disappeared' in data:
        tracker.max_disappeared = int(data['max_disappeared'])
        
    return jsonify({
        "status": "success", 
        "confidence_threshold": confidence_threshold, 
        "max_disappeared": tracker.max_disappeared
    }), 200

def process_frame(frame):
    global tracker
    frame = preprocess_frame(frame)
    boxes = detect_boxes(frame, confidence_threshold)
    roi_boxes = []
    
    for box in boxes:
        x1, y1, x2, y2 = box
        cx, cy = get_centroid(x1, y1, x2, y2)
        if is_inside_roi((cx, cy), roi_polygon):
            roi_boxes.append(box)
            
    objects = tracker.update(roi_boxes)
    box_count = get_stable_count(tracker)
    return boxes, objects, box_count

@app.route('/detect', methods=['POST'])
def detect():
    if 'frame' in request.files:
        file_bytes = request.files['frame'].read()
    else:
        file_bytes = request.data
        
    if not file_bytes:
        return jsonify({"error": "No image bytes provided"}), 400
    
    nparr = np.frombuffer(file_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return jsonify({"error": "Invalid image format"}), 400
    
    boxes, objects, box_count = process_frame(frame)
    
    # FIXED: convert to serializable format
    return jsonify({
        "boxes": [list(map(int, box)) for box in boxes],
        "box_count": box_count
    }), 200

def generate_frames():
    video_source = os.getenv("VIDEO_SOURCE", "0")
    if str(video_source).isdigit():
        video_source = int(video_source)
        
    cap = cv2.VideoCapture(video_source)
    cap.set(cv2.CAP_PROP_AUTOFOCUS, 0)      # disable autofocus
    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)  # disable auto exposure
    cap.set(cv2.CAP_PROP_FPS, 30)           # lock to 30fps
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)  # lock resolution
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    if not cap.isOpened():
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + b'\r\n')
        return

    frame_index = 0
    last_boxes = []
    last_objects = {}
    last_count = 0
    
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        frame_index += 1
        
        # Run detection every other frame only
        if frame_index % 2 == 0:
            last_boxes, last_objects, last_count = process_frame(frame)
        
        annotated_frame = draw_overlay(frame, last_objects, last_count, roi_polygon)
        jpeg_bytes = encode_frame_to_jpeg(annotated_frame)
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
               
    cap.release()

@app.route('/stream', methods=['GET'])
def stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# NEW: video upload endpoint
@app.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video_file = request.files['video']
    video_path = f"/tmp/{video_file.filename}"
    video_file.save(video_path)
    
    def generate():
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return
        while True:
            success, frame = cap.read()
            if not success:
                break
            boxes, objects, box_count = process_frame(frame)
            annotated_frame = draw_overlay(frame, objects, box_count, roi_polygon)
            jpeg_bytes = encode_frame_to_jpeg(annotated_frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
        cap.release()
        os.remove(video_path)
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)