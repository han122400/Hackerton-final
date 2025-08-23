import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

router = APIRouter()

# 테스트 엔드포인트 (서버 동작 확인용)
@router.get("/health")
def health_check():
    return {"status": "healthy", "openrouter_key_loaded": bool(OPENROUTER_API_KEY)}

class Prompt(BaseModel):
    prompt: str
    system_prompt: str = ""

@router.post("/generate-text")
def generate_text(data: Prompt):
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="EMPTY_PROMPT")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # 메시지 구성 (system_prompt가 있으면 system 메시지로 추가)
    messages = []
    if data.system_prompt and data.system_prompt.strip():
        messages.append({"role": "system", "content": data.system_prompt.strip()})
    messages.append({"role": "user", "content": prompt})
    
    body = {
        "model": "anthropic/claude-3-haiku",
        "messages": messages,
    }
    try:
        r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body, timeout=60)
        r.raise_for_status()
        answer = r.json()["choices"][0]["message"]["content"]
        return {"answer": answer}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"OPENROUTER_ERROR: {str(e)}")


