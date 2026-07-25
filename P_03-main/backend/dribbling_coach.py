import cv2
import mediapipe as mp
import numpy as np
from ultralytics import YOLO
try:
    from google import genai
except ImportError:
    genai = None

import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
CONTROL_THRESHOLD_PX = 80          

client = None
if API_KEY and genai:
    try:
        client = genai.Client(api_key=API_KEY)
        print("[OK] Gemini AI Connected (Dribbling)")
    except Exception as e:
        print(f"[X] Gemini Error: {e}")

print("Loading Models...")
yolo_model = YOLO('yolov8n.pt') 

from pose_helper import SafePoseDetector, draw_mediapipe_skeleton

pose_detector = SafePoseDetector()
mp_pose = pose_detector.mp_pose
pose = pose_detector

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
        
        if pose_results.pose_landmarks:
            landmarks = pose_results.pose_landmarks.landmark
            if show_visuals:
                draw_mediapipe_skeleton(frame, landmarks, w, h)
                
            if ball_pos:
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

    if total_frames > 0:
        control_rating = (control_frames * 100) / max(1, total_frames)
    else:
        control_rating = 0.0

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
                model='gemini-2.0-flash',
                contents=prompt
            )
            report_text = response.text
        except Exception as e:
            print(f"[Warning] Gemini API call exception ({e}). Using Pro Dribbling Coach Verdict generator.")
            grade = "A (WORLD CLASS)" if control_rating > 70 else "B (PRO LEVEL)" if control_rating > 40 else "C (DEVELOPING WINGER)"
            report_text = f"⚡ ELITE DRIBBLING COACH VERDICT (TOUCHES LOGGED: {touches})\n\n" \
                          f"• Scout Grade: {grade}\n" \
                          f"• Ball Control Rating: {int(control_rating)}/100.\n" \
                          f"• Technical Action Plan: {'Ball stays tight to feet during high-speed direction changes.' if control_rating > 60 else 'Keep your center of gravity low and shorten stride length when executing sharp cuts.'}"
    else:
        grade = "A (WORLD CLASS)" if control_rating > 70 else "B (PRO LEVEL)" if control_rating > 40 else "C (DEVELOPING WINGER)"
        report_text = f"⚡ ELITE DRIBBLING COACH VERDICT (TOUCHES LOGGED: {touches})\n\n" \
                      f"• Scout Grade: {grade}\n" \
                      f"• Ball Control Rating: {int(control_rating)}/100.\n" \
                      f"• Technical Action Plan: Work on rapid inside/outside foot touches to keep ball within 50cm of stance."

    yield {
        "type": "result",
        "data": {
            "stats": stats,
            "report": report_text
        }
    }