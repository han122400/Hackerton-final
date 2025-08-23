# server/user_info.py
#DB 저장만 담당. Supabase Python SDK로 profiles에 insert.
import os
from typing import Optional, Dict, Any
from datetime import datetime
from supabase import create_client, Client

_SUPABASE: Optional[Client] = None

def _get_env(key: str) -> str:
    v = os.getenv(key)
    if not v:
        raise RuntimeError(f"Missing environment variable: {key}")
    return v

def get_supabase() -> Client:
    """
    서버 내에서만 Supabase 클라이언트를 생성/캐시.
    절대 프론트로 키를 노출하지 않습니다.
    """
    global _SUPABASE
    if _SUPABASE is None:
        url = _get_env("SUPABASE_URL")
        service_key = _get_env("SUPABASE_SERVICE_ROLE_KEY")  # 서버에서만 사용
        _SUPABASE = create_client(url, service_key)
    return _SUPABASE

TABLE_NAME = os.getenv("SUPABASE_USER_TABLE", "user_info")  # 원하는 테이블명 사용

def upsert_user_info(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    이메일 기준으로 upsert (없으면 insert, 있으면 update)
    - 테이블 스키마 예시:
      id: uuid (default uuid_generate_v4())  ※ 없어도 됨
      name: text
      email: text (unique)
      phone: text
      education: text
      experience: text
      created_at: timestamp with time zone (default now())
      updated_at: timestamp with time zone
    """
    sb = get_supabase()

    # updated_at 갱신
    payload = dict(payload)
    payload["updated_at"] = datetime.utcnow().isoformat()

    # upsert (email을 unique로 두면 conflict 대상)
    # 만약 unique 인덱스가 email이 아니라 id라면 on_conflict를 그에 맞게 변경
    res = sb.table(TABLE_NAME).upsert(payload, on_conflict="email").execute()

    # Supabase 파이썬 SDK v2: res.data에 row들이 담김
    data = res.data or []
    item = data[0] if data else {}

    return {
        "ok": True,
        "item": item,
    }
