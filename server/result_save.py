from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv

# .env 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")  # https://xxxx.supabase.co
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Service Role Key

router = APIRouter()

# 요청 데이터 모델
class SaveRequest(BaseModel):
    email: str
    result: dict

@router.post("/result_save")
async def save_result(data: SaveRequest):
    try:
        url = f"{SUPABASE_URL}/rest/v1/results_log"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"  # insert 후 데이터 반환 생략
        }
        payload = {
            "email": data.email,
            "result": data.result
        }
        res = requests.post(url, headers=headers, json=payload)

        if res.status_code in [200, 201]:
            return {"status": "success"}
        else:
            return {"status": "error", "message": res.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}
