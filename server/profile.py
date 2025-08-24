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
    email: str = None
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
        }

        # 기존 데이터 조회
        query_url = f"{url}?name=eq.{profile.name}"
        res = requests.get(query_url, headers=headers)
        existing = res.json()

        if existing:  # update
            patch_url = f"{url}?name=eq.{profile.name}"
            response = requests.patch(
                patch_url,
                json=profile.dict(),
                headers={**headers, "Prefer": "return=representation"}  # ✅ 여기 추가
            )
        else:  # insert
            response = requests.post(
                url,
                json=[profile.dict()],
                headers={**headers, "Prefer": "return=representation"}
            )

        # 응답 처리
        if response.status_code >= 400:
            return JSONResponse(
                status_code=response.status_code,
                content={"ok": False, "error": response.text}
            )

        # 응답이 204라면 JSON 없음
        if response.status_code == 204 or not response.text.strip():
            return {"ok": True, "data": None}

        return {"ok": True, "data": response.json()}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
