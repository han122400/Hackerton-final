from fastapi import APIRouter, UploadFile, File
from pydub import AudioSegment
import io
import whisper
import numpy as np
import librosa

router = APIRouter()
model = whisper.load_model("small")

def analyze_audio(audio_bytes: bytes):
    # WebM -> WAV 변환
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format="webm")
    wav_io = io.BytesIO()
    audio.export(wav_io, format="wav")
    wav_io.seek(0)

    # librosa로 신호 분석
    y, sr = librosa.load(wav_io, sr=16000)
    energy = float(np.mean(y**2))
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_vals = pitches[magnitudes > 0]
    avg_pitch = float(np.mean(pitch_vals)) if len(pitch_vals) > 0 else 0.0

    # Whisper는 파일 경로 또는 np.ndarray로 처리
    # np.ndarray 사용 시 shape=(n,) 이어야 함
    result = model.transcribe(np.array(y), fp16=False)  # CPU 환경이면 fp16=False
    text = result.get("text", "")

    # 간단 감정 추정
    emotion = "Neutral"
    if energy > 0.01:
        emotion = "Active"
    elif energy < 0.001:
        emotion = "Calm"

    return {"text": text.strip(), "signal": {"energy": energy, "avg_pitch": avg_pitch}, "emotion": emotion}

@router.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    try:
        result = analyze_audio(audio_bytes)
        return result
    except Exception as e:
        return {"text": "", "signal": {}, "emotion": "Error", "error": str(e)}
