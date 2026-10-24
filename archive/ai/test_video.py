import os
import sys
import cv2
import numpy as np
from dotenv import load_dotenv
import json
import warnings
warnings.filterwarnings("ignore")
load_dotenv()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.detector import detect_boxes
from src.tracker import CentroidTracker
from src.counter import get_stable_count, is_inside_roi
from src.utils import draw_overlay, get_centroid
from src.utils import preprocess_frame

# Config
confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", 0.35))
max_disappeared = int(os.getenv("MAX_DISAPPEARED", 20))
max_distance = int(os.getenv("MAX_DISTANCE", 80))

try:
    roi_points = json.loads(os.getenv("ROI_POINTS", "[[0,0],[640,0],[640,480],[0,480]]"))
    roi_polygon = np.array(roi_points, dtype=np.int32)
except:
    roi_polygon = np.array([[0,0],[640,0],[640,480],[0,480]], dtype=np.int32)

# Point this at your video
video_path = os.getenv("VIDEO_SOURCE", "data/videos/your_video.mp4")
if str(video_path).isdigit():
    video_path = int(video_path)

tracker = CentroidTracker(max_disappeared=max_disappeared, max_distance=max_distance)
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print(f"ERROR: Could not open video source: {video_path}")
    sys.exit(1)

print("Running... watch terminal for counts")

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("Video ended.")
        break

    frame_count += 1

    # Run detection
    boxes = detect_boxes(frame, confidence_threshold)

    # Filter by ROI
    roi_boxes = []
    for box in boxes:
        x1, y1, x2, y2 = box
        cx, cy = get_centroid(x1, y1, x2, y2)
        if is_inside_roi((cx, cy), roi_polygon):
            roi_boxes.append(box)

    # Update tracker
    objects = tracker.update(roi_boxes)
    box_count = get_stable_count(tracker)

    # Draw everything on frame
    annotated = draw_overlay(frame, objects, box_count, roi_polygon)

    # Print to terminal every 30 frames
    if frame_count % 30 == 0:
        print(f"Frame {frame_count} | Detections: {len(boxes)} | In ROI: {len(roi_boxes)} | Stable count: {box_count}")

    pass

cap.release()
cv2.destroyAllWindows()
print(f"Done. Final box count: {box_count}")