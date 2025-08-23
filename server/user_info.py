# server/user_info.py
#DB 저장만 담당. Supabase Python SDK로 profiles에 insert.
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client

_SUPABASE_URL = os.getenv("SUPABASE_URL")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not _SUPABASE_URL or not _SUPABASE_KEY:
    raise RuntimeError("Supabase 환경변수(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)가 없습니다.")

supabase: Client = create_client(_SUPABASE_URL, _SUPABASE_KEY)

TABLE_NAME = "profiles"   # <-- 테이블명 다르면 여기만 수정

def save_user_info(
    name: str,
    email: str,
    phone: Optional[str] = None,
    education: Optional[str] = None,
    experience: Optional[str] = None,
) -> Dict[str, Any]:
    payload = {
        "name": name,
        "email": email,
        "phone": phone,
        "education": education,
        "experience": experience,
    }
    res = supabase.table(TABLE_NAME).insert(payload).execute()
    if not res.data:
        raise RuntimeError("DB 저장 실패 (응답 데이터 없음)")
    # 삽입된 첫 행 반환
    return res.data[0]
