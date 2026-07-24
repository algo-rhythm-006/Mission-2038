import cv2
import mediapipe as mp
import numpy as np
from collections import deque
try:
    from google import genai
except ImportError:
    genai = None

import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
API_KEY = os.getenv("GEMINI_API_KEY")
FRAME_RATE = 30 # Assumed for timestamp calculation

# 1. Connect to Gemini (The Brain)
client = None
if API_KEY and genai:
    try:
        client = genai.Client(api_key=API_KEY)
        print("[OK] Gemini AI Connected (Shooting Coach)")
    except Exception as e:
        print(f"[X] Gemini Error: {e}")

# Initialize MediaPipe Pose Detector
from pose_helper import SafePoseDetector

pose_detector = SafePoseDetector()
mp_pose = pose_detector.mp_pose
pose = pose_detector

def calculate_angle(a, b, c):
    a = np.array(a) 
    b = np.array(b) 
    c = np.array(c) 
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0: angle = 360-angle
    return angle

def analyze_shooting(video_path, show_visuals=False):
    print(f"--- STARTING SHOOTING AI COACH FOR {video_path} ---")
    
    cap = cv2.VideoCapture(video_path) 
    if not cap.isOpened():
        return {"error": "Could not open video file."}

    # --- DATA STORAGE ---
    right_leg_history = deque(maxlen=60)
    left_leg_history = deque(maxlen=60)
    session_log = [] # Stores detailed data for the final report

    prev_right_ankle_y = 0
    prev_left_ankle_y = 0
    frame_count = 0
    cooldown_counter = 0 

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frame_count += 1
        
        # Resize
        frame = cv2.resize(frame, (1024, 600)) 
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Get Coordinates (Right & Left)
            r_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            r_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            r_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            
            l_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            l_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            l_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            
            # Calculate Angles & Velocity
            r_angle = calculate_angle(r_hip, r_knee, r_ankle)
            l_angle = calculate_angle(l_hip, l_knee, l_ankle)
            
            right_leg_history.append(r_angle)
            left_leg_history.append(l_angle)
            
            r_vel = abs(r_ankle[1] - prev_right_ankle_y) * 1000
            l_vel = abs(l_ankle[1] - prev_left_ankle_y) * 1000
            
            prev_right_ankle_y = r_ankle[1]
            prev_left_ankle_y = l_ankle[1]

            # --- SHOT DETECTION LOGIC ---
            if cooldown_counter == 0:
                kick_leg = None
                history = None
                
                # Detect Kick
                if r_vel > 15:
                    kick_leg = "RIGHT"
                    history = right_leg_history
                elif l_vel > 15:
                    kick_leg = "LEFT"
                    history = left_leg_history
                
                if kick_leg:
                    best_backswing = min(history)
                    
                    # Filter (Must have some bend)
                    if best_backswing < 120:
                        cooldown_counter = 45 # 1.5s cooldown
                        
                        # Grading
                        rating = "AMATEUR"
                        color = (0, 0, 255)
                        if best_backswing < 55:
                            rating = "WORLD CLASS"
                            color = (0, 255, 0)
                        elif best_backswing < 80:
                            rating = "PRO"
                            color = (0, 255, 255)

                        # Log the Data
                        timestamp = round(frame_count / FRAME_RATE, 1)
                        shot_data = {
                            "id": len(session_log) + 1,
                            "time": timestamp,
                            "leg": kick_leg,
                            "flexion": int(best_backswing),
                            "rating": rating
                        }
                        session_log.append(shot_data)

            if cooldown_counter > 0:
                cooldown_counter -= 1
                
            if show_visuals:
                if hasattr(mp, 'solutions') and hasattr(mp.solutions, 'drawing_utils'):
                    mp.solutions.drawing_utils.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        if show_visuals:
            yield {"type": "frame", "image": image}

    cap.release()

    # --- GEMINI AI REPORT ---
    if not session_log:
        yield {
            "type": "result",
            "data": {
                "session_log": [],
                "stats": {},
                "report": "No shots detected. Try adjusting camera angle or velocity threshold."
            }
        }
        return

    total_flexion = 0
    pro_shots = 0
    
    for shot in session_log:
        total_flexion += shot['flexion']
        if shot['rating'] in ["PRO", "WORLD CLASS"]:
            pro_shots += 1

    avg_flexion = int(total_flexion / len(session_log))
    consistency = int((pro_shots / len(session_log)) * 100)
    
    stats = {
        "total_shots": len(session_log),
        "avg_flexion": avg_flexion,
        "consistency_percent": consistency
    }

    prompt = f"""
    You are an elite Premier League Striker/Shooting Coach.
    Analyze this training session data:
    
    - Total Shots: {len(session_log)}
    - Average Knee Flexion (Backswing): {avg_flexion}°
    - Consistency: {consistency}% of shots had Pro/World Class flexion
    - Chronological list of shots: {session_log}
    
    Pro Benchmarks: <70° is Elite/Pro flexion (good backswing). >85° is stiff mechanics.
    
    Task:
    1. Give a "Scout Grade" (A, B, C).
    2. Suggest 1 specific technical adjustment based on their flexion data.
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
        if avg_flexion < 60:
            report_text = "ELITE FORM. Your mechanics are perfect. Focus on target accuracy next."
        elif avg_flexion < 85:
            report_text = "GOOD FORM. You have power, but try to relax your knee more on the backswing."
        else:
            report_text = "STIFF MECHANICS. You are kicking with a straight leg. Bend your knee deeper for more power!"

    yield {
        "type": "result",
        "data": {
            "session_log": session_log,
            "stats": stats,
            "report": report_text
        }
    }