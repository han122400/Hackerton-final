# server/voice.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydub import AudioSegment
import io, os
import numpy as np
import librosa
import whisper
from functools import lru_cache

router = APIRouter()
model = whisper.load_model("small")


@lru_cache(maxsize=1)
def get_model():
    # CPU 환경 권장: "small" (medium은 매우 느리고 메모리 큼)
    # GPU면 whisper.load_model("medium", device="cuda")
    return whisper.load_model("small")

def _to_wav_16k_mono(audio_bytes: bytes, fmt: str = "webm") -> bytes:
    # webm/opus → wav 16k mono
    try:
        src = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"입력 오디오 디코딩 실패({fmt}): {e}")

    src = src.set_frame_rate(16000).set_channels(1)
    out = io.BytesIO()
    # 파라미터로 강제 지정도 가능: parameters=["-ac", "1", "-ar", "16000"]
    src.export(out, format="wav")
    out.seek(0)
    return out.read()

def analyze_audio(audio_bytes: bytes, input_fmt: str):
    # 1) webm/ogg/wav 등 포맷 분기
    fmt = input_fmt or "webm"
    fmt = fmt.split("/")[-1].lower() if "/" in fmt else fmt.lower()
    if fmt in ("webm", "ogg", "opus"):
        wav_bytes = _to_wav_16k_mono(audio_bytes, fmt="webm")
    elif fmt in ("wav", "x-wav"):
        wav_bytes = audio_bytes  # 그대로
    else:
        # 기타 포맷도 ffmpeg가 처리 가능하나, 명시적으로 webm 기본 처리
        wav_bytes = _to_wav_16k_mono(audio_bytes, fmt="webm")

    # 2) librosa 로드(16k mono 보장)
    y, sr = librosa.load(io.BytesIO(wav_bytes), sr=16000, mono=True)
    if y.size == 0:
        raise HTTPException(status_code=400, detail="빈 오디오입니다.")

    # 3) 간단 신호 특징
    energy = float(np.mean(y ** 2))
    pitches, mags = librosa.piptrack(y=y, sr=sr)
    pitch_vals = pitches[mags > 0]
    avg_pitch = float(np.mean(pitch_vals)) if pitch_vals.size > 0 else 0.0

    # 4) Whisper 추론
    model = get_model()
    # ndarray로 직접 전달 가능. CPU는 fp16=False 필수.
    result = model.transcribe(y, fp16=False, language="ko")  # language 생략 가능(자동)
    text = (result.get("text") or "").strip()

    # 5) 매우 러프한 감정 힌트
    emotion = "Neutral"
    if energy > 0.01:
        emotion = "Active"
    elif energy < 0.001:
        emotion = "Calm"

    return {
        "text": text,
        "signal": {"energy": energy, "avg_pitch": avg_pitch},
        "emotion": emotion,
        "sr": sr,
        "dur_sec": round(y.size / sr, 3),
    }

@router.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    try:
        return analyze_audio(audio_bytes, audio.content_type or "webm")
    except HTTPException as he:
        raise he
    except Exception as e:
        # 디버깅을 돕는 명확한 에러 메시지
        return {"text": "", "signal": {}, "emotion": "Error", "error": str(e)}
