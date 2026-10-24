import os
import cv2
import numpy as np
import torch
import warnings
warnings.filterwarnings("ignore")

# Get the absolute path to the model
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.getenv("MODEL_PATH", "box_detection.pt")

# If model_path is relative, make it absolute relative to ai directory
if not os.path.isabs(model_path):
    model_path = os.path.join(base_dir, model_path)

# Fallback to yolov8n.pt if box_detection.pt doesn't exist
if not os.path.exists(model_path):
    fallback_path = os.path.join(base_dir, "yolov8n.pt")
    if os.path.exists(fallback_path):
        print(f"[detector] WARNING: {model_path} not found, using fallback: {fallback_path}")
        model_path = fallback_path
    else:
        print(f"[detector] WARNING: No model found at {model_path} or {fallback_path}")

CONF_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.35))

if os.path.exists(model_path):
    _model = torch.hub.load('ultralytics/yolov5', 'custom', 
                            path=model_path, force_reload=False)
    _model.eval()
    print(f"[detector] Loaded: {model_path}")
else:
    print(f"[detector] ERROR: Model not found at {model_path}")
    _model = None

def detect_boxes(frame: np.ndarray, confidence_threshold: float) -> list:
    if _model is None:
        return []

    resized = cv2.resize(frame, (640, 640))
    h, w = frame.shape[:2]
    x_scale = w / 640
    y_scale = h / 640

    _model.conf = confidence_threshold
    _model.iou = 0.3
    _model.agnostic = True

    results = _model(resized)

    boxes = []
    for *xyxy, conf, cls in results.xyxy[0].tolist():
        if conf >= confidence_threshold:
            x1 = int(xyxy[0] * x_scale)
            y1 = int(xyxy[1] * y_scale)
            x2 = int(xyxy[2] * x_scale)
            y2 = int(xyxy[3] * y_scale)
            boxes.append((x1, y1, x2, y2))

    return boxes