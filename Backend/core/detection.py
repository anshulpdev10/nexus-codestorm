"""
BoxTrack — YOLO Box Counter
Supports both YOLOv5 (.pt trained with yolov5) and YOLOv8 (ultralytics) models.
Auto-detects model format on load.
Duplicate/overlapping detections are suppressed via NMS (IoU threshold).
"""

import os
import cv2
import numpy as np
from core.tracker import CentroidTracker

CONF_THRESHOLD = 0.35
NMS_IOU        = 0.40   # boxes with IoU > this are considered duplicates and merged

# Overlay colours (BGR)
_BOX_COLOR  = (56, 189, 248)
_LABEL_BG   = (15, 23, 42)
_TEXT_COLOR = (255, 255, 255)


def _is_yolov5_checkpoint(model_path: str) -> bool:
    try:
        with open(model_path, "rb") as f:
            raw = f.read(4096)
        return b"models.yolo" in raw or b"models.common" in raw
    except Exception:
        return False


def _nms_filter(boxes, confs, labels, iou_threshold=NMS_IOU):
    """
    Post-inference NMS safety net.
    Removes duplicate detections where IoU > iou_threshold,
    keeping the highest-confidence box in each overlapping group.
    Works on top of YOLO's built-in NMS for extra safety.
    """
    if not boxes:
        return boxes, confs, labels

    # Sort by confidence descending
    order = sorted(range(len(confs)), key=lambda i: confs[i], reverse=True)
    kept = []

    while order:
        best = order.pop(0)
        kept.append(best)
        remaining = []
        for idx in order:
            if _iou(boxes[best], boxes[idx]) < iou_threshold:
                remaining.append(idx)
        order = remaining

    return (
        [boxes[i]  for i in kept],
        [confs[i]  for i in kept],
        [labels[i] for i in kept],
    )


def _iou(a, b):
    """Intersection over Union for two (x1,y1,x2,y2) boxes."""
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    return inter / (area_a + area_b - inter)


class BoxCounter:
    def __init__(self, model_path: str):
        self._yolo_version = None

        if not os.path.exists(model_path):
            print(f"[BoxCounter] WARNING: {model_path} not found — falling back to yolov8n.pt")
            model_path = os.path.join(os.path.dirname(model_path), "yolov8n.pt")

        if _is_yolov5_checkpoint(model_path):
            self._load_v5(model_path)
        else:
            self._load_v8(model_path)

        self._boxes  = []
        self._confs  = []
        self._labels = []
        self._confidence_threshold = CONF_THRESHOLD  # Store current threshold
        self._tracker = CentroidTracker()


    def set_confidence(self, confidence: float):
        """Update the confidence threshold dynamically"""
        self._confidence_threshold = max(0.0, min(1.0, confidence))  # Clamp between 0 and 1
        print(f"[BoxCounter] Confidence threshold updated to: {self._confidence_threshold:.2f}")
        
        # Update model confidence if it's loaded
        if self.model and self._yolo_version == 5:
            self.model.conf = self._confidence_threshold
        # For YOLOv8, confidence is passed per inference call

    def _load_v5(self, model_path: str):
        import torch
        import pathlib
        import platform

        print(f"[BoxCounter] Detected YOLOv5 format: {model_path}")
        _orig = pathlib.PosixPath
        if platform.system() == "Windows":
            pathlib.PosixPath = pathlib.WindowsPath
        try:
            self.model = torch.hub.load(
                "ultralytics/yolov5", "custom",
                path=model_path, trust_repo=True, force_reload=False, verbose=False
            )
            self.model.conf = CONF_THRESHOLD
            self.model.iou  = NMS_IOU        # set NMS IoU on the model itself
            self._yolo_version = 5
            self._custom = True
            print(f"[BoxCounter] YOLOv5 loaded. Classes: {self.model.names}")
        finally:
            pathlib.PosixPath = _orig

    def _load_v8(self, model_path: str):
        from ultralytics import YOLO
        print(f"[BoxCounter] Detected YOLOv8 format: {model_path}")
        self.model = YOLO(model_path)
        try:
            self.model.fuse()
        except Exception as e:
            print(f"[BoxCounter] fuse() skipped: {e}")
        self._yolo_version = 8
        self._custom = not model_path.endswith("yolov8n.pt")
        print(f"[BoxCounter] YOLOv8 loaded (custom={self._custom}). Classes: {self.model.names}")

    def process_frame(self, frame: np.ndarray) -> tuple:
        if self._yolo_version == 5:
            return self._process_v5(frame)
        return self._process_v8(frame)

    def _process_v5(self, frame: np.ndarray) -> tuple:
        results = self.model(frame)
        preds = results.xyxy[0]  # [x1, y1, x2, y2, conf, cls]

        boxes, confs, labels = [], [], []
        for *xyxy, conf, cls in preds.tolist():
            if conf < self._confidence_threshold:
                continue
            x1, y1, x2, y2 = map(int, xyxy)
            boxes.append((x1, y1, x2, y2))
            confs.append(float(conf))
            labels.append(self.model.names[int(cls)])

        # Extra NMS pass to catch any remaining overlaps
        boxes, confs, labels = _nms_filter(boxes, confs, labels)

        self._boxes  = boxes
        self._confs  = confs
        self._labels = labels
        self._tracker.update(boxes)
        # Return: (tracker_id, confidences, current_frame_count)
        return self._tracker.next_object_id, confs, len(boxes)

    def _process_v8(self, frame: np.ndarray) -> tuple:
        # Pass iou explicitly to YOLOv8 inference with dynamic confidence
        results = self.model(frame, verbose=False, conf=self._confidence_threshold, iou=NMS_IOU)[0]
        boxes, confs, labels = [], [], []

        if results.boxes is not None:
            for box in results.boxes:
                conf   = float(box.conf[0])
                cls_id = int(box.cls[0])
                label  = self.model.names.get(cls_id, str(cls_id))
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                boxes.append((x1, y1, x2, y2))
                confs.append(conf)
                labels.append(label)

        # Extra NMS pass to catch any remaining overlaps
        boxes, confs, labels = _nms_filter(boxes, confs, labels)

        self._boxes  = boxes
        self._confs  = confs
        self._labels = labels
        self._tracker.update(boxes)
        # Return: (tracker_id, confidences, current_frame_count)
        return self._tracker.next_object_id, confs, len(boxes)

    def draw_overlay(self, frame: np.ndarray, count: int) -> np.ndarray:
        for (x1, y1, x2, y2), conf, label in zip(self._boxes, self._confs, self._labels):
            color = (74, 222, 128) if conf >= 0.75 else (250, 204, 21) if conf >= 0.5 else (248, 113, 113)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            text = f"{label} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 6, y1), _LABEL_BG, -1)
            cv2.putText(frame, text, (x1 + 3, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, _TEXT_COLOR, 1, cv2.LINE_AA)

        return frame
