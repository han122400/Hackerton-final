from fastapi import APIRouter, Query
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv
from typing import Optional
from urllib.parse import urlencode

# .env 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")  # https://xxxx.supabase.co
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Service Role Key

# URL 정리 (마지막 슬래시 제거)
if SUPABASE_URL and SUPABASE_URL.endswith('/'):
    SUPABASE_URL = SUPABASE_URL.rstrip('/')

router = APIRouter()

@router.get("/result_load")
async def load_results(email: Optional[str] = Query(None), name: Optional[str] = Query(None)):
    try:
        # 환경변수 확인
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"status": "error", "message": "Supabase 환경변수가 설정되지 않았습니다."}
        
        # Supabase REST API URL
        url = f"{SUPABASE_URL}/rest/v1/results_log"
        
        # 헤더 설정 (Supabase 공식 문서 기준)
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # 쿼리 파라미터 구성 (딕셔너리 형태)
        params = {
            "select": "id,email,created_at,result",
            "order": "created_at.desc"
        }
        
        # 필터 조건 추가
        # 이메일 검색 (정확히 일치)
        if email:
            params["email"] = f"eq.{email}"
        
        # 이름 검색 (JSON 필드 검색) - 이메일 검색이 있으면 무시
        if name and not email:
            params["result->interviewData->name"] = f"eq.{name}"
        
        print(f"요청 파라미터: {params}")
        
        # requests.get을 사용해 자동으로 URL 인코딩
        res = requests.get(url, headers=headers, params=params)
        
        print(f"응답 상태 코드: {res.status_code}")
        print(f"응답 헤더: {res.headers}")
        print(f"응답 텍스트: {res.text[:500]}...")  # 처음 500자만 출력
        
        if res.status_code == 200:
            try:
                data = res.json()
                return {"status": "success", "data": data}
            except Exception as json_error:
                return {"status": "error", "message": f"JSON 파싱 오류: {str(json_error)}, 응답: {res.text[:200]}"}
        elif res.status_code == 401:
            return {"status": "error", "message": "Supabase 인증 오류. API 키를 확인해주세요."}
        elif res.status_code == 404:
            return {"status": "error", "message": "테이블을 찾을 수 없습니다. 테이블명을 확인해주세요."}
        else:
            return {"status": "error", "message": f"API 호출 실패 (상태코드: {res.status_code}): {res.text}"}
            
    except requests.exceptions.RequestException as req_error:
        print(f"요청 오류: {str(req_error)}")
        return {"status": "error", "message": f"네트워크 오류: {str(req_error)}"}
    except Exception as e:
        print(f"예외 발생: {str(e)}")
        return {"status": "error", "message": f"서버 오류: {str(e)}"}