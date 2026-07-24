from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import tempfile
import cv2
import base64
import json
import numpy as np
import mediapipe as mp
from google import genai
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Import the existing coaching scripts
from ai_Coach import analyze_shooting
from dribbling_coach import analyze_dribbling
from goalkeeper_coach import analyze_goalkeeper

app = FastAPI(title="Mission 2K38 AI Coach Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
try:
    if API_KEY:
        client = genai.Client(api_key=API_KEY)
        print("[✓] Gemini AI Connected inside main.py")
    else:
        print("[!] GEMINI_API_KEY is not defined in .env. Falling back to local rules.")
        client = None
except Exception as e:
    print(f"[X] Gemini connection error: {e}")
    client = None

# MediaPipe Setup for Pose Endpoint
mp_pose = mp.solutions.pose
pose_processor = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils

class CoachRequest(BaseModel):
    stats: dict
    drill_type: str
    history: list = []

class PredictRequest(BaseModel):
    name: str
    age: int
    position: str
    skills: dict # speed, passing, dribbling, finishing, defending, vision, stamina

def save_upload_file_tmp(upload_file: UploadFile) -> str:
    try:
        suffix = os.path.splitext(upload_file.filename)[1]
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, 'wb') as f:
            shutil.copyfileobj(upload_file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
    finally:
        upload_file.file.close()
    return temp_path

def sse_generator(coach_generator, temp_path):
    try:
        for item in coach_generator:
            if item["type"] == "frame":
                # Encode frame to JPEG
                ret, buffer = cv2.imencode('.jpg', item["image"], [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                if ret:
                    b64 = base64.b64encode(buffer).decode('utf-8')
                    payload = json.dumps({"type": "frame", "data": b64})
                    yield f"data: {payload}\n\n"
            elif item["type"] == "result":
                payload = json.dumps({"type": "result", "data": item["data"]})
                yield f"data: {payload}\n\n"
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

@app.get("/")
def root():
    return {"message": "Welcome to Mission 2K38 AI Coach API"}

# Unified analyze endpoint
@app.post("/analyze")
async def analyze_drill(
    file: UploadFile = File(...), 
    drill_type: str = Form("shooting"), 
    show_visuals: bool = Form(True)
):
    temp_path = save_upload_file_tmp(file)
    if drill_type == "shooting":
        gen = analyze_shooting(temp_path, show_visuals=show_visuals)
    elif drill_type == "dribbling":
        gen = analyze_dribbling(temp_path, show_visuals=show_visuals)
    elif drill_type == "goalkeeper":
        gen = analyze_goalkeeper(temp_path, show_visuals=show_visuals)
    else:
        # Fallback to shooting
        gen = analyze_shooting(temp_path, show_visuals=show_visuals)
    
    return StreamingResponse(sse_generator(gen, temp_path), media_type="text/event-stream")

# Original drill-specific endpoints kept for backward compatibility
@app.post("/analyze/shooting")
async def process_shooting(file: UploadFile = File(...), show_visuals: bool = Form(False)):
    temp_path = save_upload_file_tmp(file)
    gen = analyze_shooting(temp_path, show_visuals=show_visuals)
    return StreamingResponse(sse_generator(gen, temp_path), media_type="text/event-stream")

@app.post("/analyze/dribbling")
async def process_dribbling(file: UploadFile = File(...), show_visuals: bool = Form(False)):
    temp_path = save_upload_file_tmp(file)
    gen = analyze_dribbling(temp_path, show_visuals=show_visuals)
    return StreamingResponse(sse_generator(gen, temp_path), media_type="text/event-stream")

@app.post("/analyze/goalkeeper")
async def process_goalkeeper(file: UploadFile = File(...), show_visuals: bool = Form(False)):
    temp_path = save_upload_file_tmp(file)
    gen = analyze_goalkeeper(temp_path, show_visuals=show_visuals)
    return StreamingResponse(sse_generator(gen, temp_path), media_type="text/event-stream")

# POST /coach
@app.post("/coach")
async def generate_coaching(req: CoachRequest):
    prompt = f"""
    You are an elite Premier League Academy Coach.
    Analyze this training session data for a drill type: {req.drill_type}.
    - Stats: {req.stats}
    - Recent performance history: {req.history}
    
    Give 2 specific training tips, recommended drills, and feedback on physical balance/form.
    Keep it short, professional, motivating, and actionable.
    """
    
    if client:
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return {"coaching": response.text}
        except Exception as e:
            return {"coaching": f"AI error occurred: {e}. Focus on technical repetitions and balance."}
    else:
        # Mock feedback
        return {"coaching": "Good training consistency. Focus on your stance stability, keep your body weight centered, and practice 15 extra repetitions on your non-dominant foot daily."}

# POST /predict
@app.post("/predict")
async def predict_potential(req: PredictRequest):
    prompt = f"""
    You are a professional football Scout Analyst.
    Predict the career potential and rating trajectory of this young player:
    - Name: {req.name}
    - Age: {req.age}
    - Position: {req.position}
    - Current Skills: {req.skills}
    
    Predict:
    1. Rating projection in 3 years.
    2. Primary strengths and areas of growth.
    3. Suggested development league/club tier.
    """
    
    if client:
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return {"prediction": response.text}
        except Exception as e:
            return {"prediction": f"Growth prediction error: {e}. Continue baseline drills."}
    else:
        # Mock prediction
        return {"prediction": "TRAJECTORY: HIGH GROWTH POTENTIAL.\n1. Projected Rating: Current overall will likely rise to 82+ in 3 years with pro coaching.\n2. Key Strengths: Speed and stamina. Area of growth: tactical positioning.\n3. Recommendation: Competitive state-level academy playing in national sub-junior tier."}

# POST /pose
@app.post("/pose")
async def detect_pose(file: UploadFile = File(...)):
    try:
        # Read uploaded image bytes
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")
            
        h, w, c = img.shape
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = pose_processor.process(img_rgb)
        
        landmarks_data = []
        
        if results.pose_landmarks:
            # Draw skeleton
            mp_drawing.draw_landmarks(img, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # Extract landmark coords
            for idx, lm in enumerate(results.pose_landmarks.landmark):
                landmarks_data.append({
                    "id": idx,
                    "name": mp_pose.PoseLandmark(idx).name,
                    "x": round(lm.x, 4),
                    "y": round(lm.y, 4),
                    "z": round(lm.z, 4),
                    "visibility": round(lm.visibility, 4)
                })
        
        # Encode overlay image to base64
        ret, buffer = cv2.imencode('.jpg', img)
        b64_str = ""
        if ret:
            b64_str = base64.b64encode(buffer).decode('utf-8')
            
        return {
            "pose_found": len(landmarks_data) > 0,
            "image": f"data:image/jpeg;base64,{b64_str}" if b64_str else None,
            "landmarks": landmarks_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
