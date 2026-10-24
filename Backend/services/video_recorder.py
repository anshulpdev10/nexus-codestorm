import cv2
import os
from datetime import datetime

RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# Codec priority: MJPEG in AVI is universally browser-playable
# mp4v in mp4 is a fallback (may need download on some browsers)
CODEC_OPTIONS = [
    ("avc1", ".mp4"),   # H.264 in MP4 — best browser support
    ("mp4v", ".mp4"),   # MPEG-4 Part 2 — fallback
    ("MJPG", ".avi"),   # Motion JPEG AVI — last resort
]


class VideoRecorder:
    def __init__(self, session_id: str, fps: int = 10, resolution: tuple = (640, 480)):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.writer = None
        self.output_path = None
        self.active = False
        self.frame_count = 0

        for fourcc_str, ext in CODEC_OPTIONS:
            filename = f"session_{session_id}_{timestamp}{ext}"
            path = os.path.abspath(os.path.join(RECORDINGS_DIR, filename))
            fourcc = cv2.VideoWriter_fourcc(*fourcc_str)
            writer = cv2.VideoWriter(path, fourcc, fps, resolution)
            if writer.isOpened():
                self.writer = writer
                self.output_path = path
                self.active = True
                print(f"[Recorder] Using codec {fourcc_str} → {filename}")
                break
            writer.release()

        if not self.active:
            print("[Recorder] WARNING: Could not open any VideoWriter codec. Recording disabled.")

    def write(self, frame):
        if self.active and self.writer:
            self.writer.write(frame)
            self.frame_count += 1

    def stop(self) -> str | None:
        if self.writer:
            self.writer.release()
        self.active = False

        if self.frame_count == 0 and self.output_path:
            try:
                os.remove(self.output_path)
            except Exception:
                pass
            return None

        return self.output_path
