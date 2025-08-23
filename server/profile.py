# server/profile.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import requests

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")  # https://xxxx.supabase.co
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TABLE = "profiles"

class Profile(BaseModel):
    name: str
    email: str
    phone: str = None
    education: str = None
    experience: str = None

@router.post("/profile")
async def save_profile(profile: Profile):
    try:
        url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        response = requests.post(url, json=[profile.dict()], headers=headers)
        if response.status_code >= 400:
            return JSONResponse(
                status_code=response.status_code,
                content={"ok": False, "error": response.text}
            )
        return {"ok": True, "data": response.json()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
