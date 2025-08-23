from fastapi import FastAPI, UploadFile, File
import whisper
import shutil
import os
import uuid
import librosa
import numpy as np

app = FastAPI()
model = whisper.load_model("medium")

# ------------------------
# 오디오 분석 함수
# ------------------------
def analyze_audio(file_path):
    y, sr = librosa.load(file_path)
    energy = float(np.mean(y ** 2))
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_values = pitches[magnitudes > np.median(magnitudes)]
    avg_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0.0
    duration = librosa.get_duration(y=y, sr=sr)
    return {
        "energy": round(energy, 5),
        "avg_pitch": round(avg_pitch, 2),
        "duration_sec": round(duration, 2)
    }

# ------------------------
# 간단 감정 분석
# ------------------------
def detect_emotion(energy, avg_pitch, duration):
    if energy > 0.02 and avg_pitch > 200:
        return "긴장/흥분"
    elif energy < 0.005 and avg_pitch < 150:
        return "차분/피곤"
    elif duration < 3 and energy > 0.01:
        return "급함"
    else:
        return "중립"

# ------------------------
# FastAPI 엔드포인트
# ------------------------
@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    ext = os.path.splitext(audio.filename)[-1]
    temp_filename = f"{uuid.uuid4()}{ext}"

    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    try:
        # Whisper 텍스트 변환
        result = model.transcribe(temp_filename, language="ko")
        transcription = result["text"]

        # 신호 분석
        signal_analysis = analyze_audio(temp_filename)

        # 감정 분석
        emotion = detect_emotion(
            signal_analysis["energy"],
            signal_analysis["avg_pitch"],
            signal_analysis["duration_sec"]
        )

        print({
            "text": transcription,
            "signal": signal_analysis,
            "emotion": emotion
        })

        return {
            "text": transcription,
            "signal": signal_analysis,
            "emotion": emotion
        }

    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
