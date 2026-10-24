import cv2

def get_centroid(x1, y1, x2, y2):
    cx = int((x1 + x2) / 2.0)
    cy = int((y1 + y2) / 2.0)
    return (cx, cy)

def draw_overlay(frame, objects, box_count, roi_polygon):
    cv2.polylines(frame, [roi_polygon], True, (0, 255, 255), 2)
    
    for object_id, centroid in objects.items():
        text = f"ID {object_id}"
        cv2.putText(frame, text, (centroid[0] - 10, centroid[1] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        cv2.circle(frame, (centroid[0], centroid[1]), 4, (0, 255, 0), -1)
        
    info = f"Count: {box_count}"
    cv2.putText(frame, info, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    
    return frame

def encode_frame_to_jpeg(frame):
    ret, buffer = cv2.imencode('.jpg', frame)
    if ret:
        return buffer.tobytes()
    return b''
def preprocess_frame(frame):
    # Reduce shadow impact using CLAHE
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return enhanced