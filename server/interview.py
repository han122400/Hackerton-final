import os
import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
TYPECAST_API_KEY = os.getenv("TYPECAST_API_KEY")
TYPECAST_TTS_URL = "https://api.typecast.ai/v1/text-to-speech"

router = APIRouter()

# 테스트 엔드포인트 (서버 동작 확인용)
@router.get("/health")
def health_check():
    return {"status": "healthy", "openrouter_key_loaded": bool(OPENROUTER_API_KEY), "typecast_key_loaded": bool(TYPECAST_API_KEY)}

class Prompt(BaseModel):
    prompt: str

class SpeakIn(BaseModel):
    text: str

@router.post("/generate-text")
def generate_text(data: Prompt):
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="EMPTY_PROMPT")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "anthropic/claude-3-haiku",
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body, timeout=60)
        r.raise_for_status()
        answer = r.json()["choices"][0]["message"]["content"]
        return {"answer": answer}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"OPENROUTER_ERROR: {str(e)}")

@router.post("/tts")
def tts(data: SpeakIn):
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="EMPTY_TEXT")

    headers = {
        "X-API-KEY": TYPECAST_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/wav",
    }
    payload = {
        "voice_id": "tc_67c90d6244cf859417f2fff5",  # 이전 voice_id 유지 (한국어 음성 가정; 필요 시 변경)
        "text": text,
        "model": "ssfm-v21",
        "language": "ko",  # 한국어 지원 ("kor" 대신 "ko" 표준 사용)
        "prompt": {"emotion_preset": "normal", "emotion_intensity": 1.2},
        "output": {"volume": 100, "audio_pitch": 0, "audio_tempo": 0.9, "audio_format": "wav"},
        "seed": 42
    }
    try:
        r = requests.post(TYPECAST_TTS_URL, json=payload, headers=headers, timeout=120)
        r.raise_for_status()
        audio_bytes = r.content
        if len(audio_bytes) < 100:
            raise ValueError("Empty audio response")
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={"Accept-Ranges": "bytes", "Cache-Control": "no-store"}
        )
    except (requests.RequestException, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"TYPECAST_ERROR: {str(e)}")

