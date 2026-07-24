import cv2
import mediapipe as mp
import numpy as np
from ultralytics import YOLO
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
CONTROL_THRESHOLD_PX = 80          

try:
    client = genai.Client(api_key=API_KEY)
    print("[✓] Gemini AI Connected (Dribbling)")
except Exception as e:
    print(f"[X] Gemini Error: {e}")
    client = None

print("Loading Models...")
script_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(os.path.dirname(script_dir), 'models')
yolo_model_path = os.path.join(models_dir, 'yolov8n.pt')
yolo_model = YOLO(yolo_model_path)
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

def analyze_dribbling(video_path, show_visuals=False):
    print(f"--- STARTING DRIBBLING AI COACH FOR {video_path} ---")
    
    control_frames = 0
    total_frames = 0
    touches = 0
    was_close = False 
    ball_path = []

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        yield {"type": "result", "data": {"error": "Could not open video file."}}
        return

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        total_frames += 1
        h, w, c = frame.shape
        
        yolo_results = yolo_model(frame, classes=[32], verbose=False, conf=0.3)
        ball_pos = None
        
        for r in yolo_results:
            if len(r.boxes) > 0:
                box = r.boxes[0] 
                x1, y1, x2, y2 = box.xyxy[0]
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                ball_pos = (cx, cy)
                
                if show_visuals:
                    cv2.circle(frame, ball_pos, 10, (0, 255, 255), -1)
                    ball_path.append(ball_pos)
                    if len(ball_path) > 30: ball_path.pop(0)
                    for i in range(1, len(ball_path)):
                        cv2.line(frame, ball_path[i-1], ball_path[i], (0, 255, 255), 2)
                break 

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pose_results = pose.process(img_rgb)
        
        closest_dist = 9999
        
        if pose_results.pose_landmarks and ball_pos:
            landmarks = pose_results.pose_landmarks.landmark
            
            left_ankle = (int(landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x * w),
                          int(landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y * h))
            right_ankle = (int(landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x * w),
                           int(landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y * h))
            
            if show_visuals:
                cv2.circle(frame, left_ankle, 5, (255, 0, 0), -1)
                cv2.circle(frame, right_ankle, 5, (255, 0, 0), -1)

            dist_l = np.linalg.norm(np.array(left_ankle) - np.array(ball_pos))
            dist_r = np.linalg.norm(np.array(right_ankle) - np.array(ball_pos))
            closest_dist = min(dist_l, dist_r)
            
            if closest_dist < CONTROL_THRESHOLD_PX:
                control_frames += 1
                color = (0, 255, 0)
                status = "CONTROL"
                if not was_close:
                    touches += 1
                    was_close = True
            else:
                color = (0, 0, 255)
                status = "DRIFT"
                was_close = False
                
            if show_visuals:
                cv2.line(frame, ball_pos, left_ankle if dist_l < dist_r else right_ankle, color, 2)
                cv2.putText(frame, f"{status} ({int(closest_dist)}px)", (ball_pos[0]+10, ball_pos[1]), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        if show_visuals:
            yield {"type": "frame", "image": frame}

    cap.release()

    control_rating = (control_frames * 100 / total_frames) if total_frames > 0 else 0

    stats = {
        "touches": touches,
        "control_rating": int(control_rating)
    }

    prompt = f"""
    You are an elite Premier League Football/Soccer Coach.
    Analyze this player's dribbling session data:

    - Total Touches: {touches}
    - Control Rating: {int(control_rating)}/100 (percentage of time ball was kept closely under control)

    Pro Benchmarks: >70 control rating is Elite. <40 is Poor.

    Task:
    1. Give a "Scout Grade" (A, B, C).
    2. Give 1 specific technical tip to improve ball keeping and tighter turns.
    3. Keep it short, motivating, and professional.
    """

    report_text = ""
    if client:
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            report_text = response.text
        except Exception as e:
            report_text = f"Error calling AI: {e}"
    else:
        if control_rating > 70:
            report_text = "Verdict: ELITE. Ball stays glued to feet."
        elif control_rating > 40:
            report_text = "Verdict: AVERAGE. Work on tighter turns."
        else:
            report_text = "Verdict: POOR. Ball is drifting too far."

    yield {
        "type": "result",
        "data": {
            "stats": stats,
            "report": report_text
        }
    }