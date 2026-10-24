import cv2

def is_inside_roi(centroid, roi_polygon):
    result = cv2.pointPolygonTest(roi_polygon, (float(centroid[0]), float(centroid[1])), False)
    return result >= 0

def get_stable_count(tracker):
    # Return the total count of unique boxes detected during the entire session/video
    return tracker.next_object_id
