import cv2
import mediapipe as mp
import numpy as np
import time
from ultralytics import YOLO
try:
    from google import genai
except ImportError:
    genai = None

import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if API_KEY and genai:
    try:
        client = genai.Client(api_key=API_KEY)
        print("[OK] Gemini AI Connected (Goalkeeper)")
    except Exception as e:
        print(f"[X] Gemini Error: {e}")

from pose_helper import SafePoseDetector

pose_detector = SafePoseDetector()
mp_pose = pose_detector.mp_pose
pose = pose_detector

yolo_model = YOLO('yolov8n.pt') 

def get_body_bbox(landmarks, w, h):
    x_coords = [lm.x * w for lm in landmarks]
    y_coords = [lm.y * h for lm in landmarks]
    
    # Adding margin
    margin = 50
    x_min, x_max = int(min(x_coords) - margin), int(max(x_coords) + margin)
    y_min, y_max = int(min(y_coords) - margin), int(max(y_coords) + margin)
    
    return (x_min, y_min, x_max, y_max)

def point_in_bbox(point, bbox):
    x, y = point
    x_min, y_min, x_max, y_max = bbox
    return x_min <= x <= x_max and y_min <= y <= y_max

def analyze_goalkeeper(video_path, show_visuals=False):
    print(f"--- STARTING GOALKEEPER AI COACH FOR {video_path} ---")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        yield {"type": "result", "data": {"error": "Could not open video file."}}
        return
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None or np.isnan(fps):
        fps = 30.0 # fallback

    saves = 0
    misses = 0
    reaction_times = []
    
    ball_in_frame_frames = 0
    shot_detected_frame = 0 
    ball_was_moving = False
    prev_ball_pos = None

    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        frame_count += 1
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
                    cv2.circle(frame, ball_pos, 10, (0, 165, 255), -1) 
                break

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pose_results = pose.process(img_rgb)
        
        keeper_bbox = None
        if pose_results.pose_landmarks:
            keeper_bbox = get_body_bbox(pose_results.pose_landmarks.landmark, w, h)
            if show_visuals:
                cv2.rectangle(frame, (keeper_bbox[0], keeper_bbox[1]), (keeper_bbox[2], keeper_bbox[3]), (255, 0, 0), 2)
                if hasattr(mp, 'solutions') and hasattr(mp.solutions, 'drawing_utils'):
                    mp.solutions.drawing_utils.draw_landmarks(frame, pose_results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        if ball_pos:
            ball_in_frame_frames += 1
            
            if prev_ball_pos:
                ball_velocity = np.linalg.norm(np.array(ball_pos) - np.array(prev_ball_pos))
                
                if ball_velocity > 15 and not ball_was_moving:
                    ball_was_moving = True
                    shot_detected_frame = frame_count 
                    
            if ball_was_moving and keeper_bbox:
                if point_in_bbox(ball_pos, keeper_bbox):
                    saves += 1
                    frames_to_react = frame_count - shot_detected_frame
                    reaction_time = round(frames_to_react / fps, 2)
                    if reaction_time > 0: # Filter out immediate hits
                        reaction_times.append(reaction_time)
                        
                    if show_visuals:
                        cv2.putText(frame, "SAVE!", (ball_pos[0]-20, ball_pos[1]-20), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                        
                    ball_was_moving = False 
                    
                elif ball_pos[0] < 50 or ball_pos[0] > w - 50:
                    misses += 1
                    ball_was_moving = False
                    
            prev_ball_pos = ball_pos
        else:
            prev_ball_pos = None

        if show_visuals:
            yield {"type": "frame", "image": frame}

    cap.release()

    avg_rt = round(float(np.mean(reaction_times)), 2) if reaction_times else 0.0
    best_rt = round(float(np.min(reaction_times)), 2) if reaction_times else 0.0
    worst_rt = round(float(np.max(reaction_times)), 2) if reaction_times else 0.0

    stats = {
        "total_saves": saves,
        "avg_reaction_time": avg_rt,
        "best_reaction_time": best_rt,
        "worst_reaction_time": worst_rt
    }

    prompt = f"""
    You are an elite Premier League Goalkeeping Coach.
    Analyze this player's session data:

    - Total Saves: {saves}
    - Total Misses (ball passed without contact): {misses}
    - Average Reaction Time: {avg_rt} seconds
    - Best Reaction Time: {best_rt} seconds
    - Array of all reaction times: {reaction_times}

    Pro Benchmarks: Elite keepers react to close shots in ~0.25 - 0.35 seconds. >0.5s is slow.

    Task:
    1. Give a "Scout Grade" (A, B, C).
    2. Give 1 specific technical tip to improve reaction speed.
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
        if avg_rt < 0.35:
            report_text = "Verdict: ELITE REFLEXES. Ready for the next level."
        elif avg_rt < 0.5:
            report_text = "Verdict: GOOD. Stay lighter on your toes to shave off milliseconds."
        else:
            report_text = "Verdict: NEEDS WORK. Focus on anticipation and set-position."

    yield {
        "type": "result",
        "data": {
            "session_data": reaction_times,
            "stats": stats,
            "report": report_text
        }
    }
