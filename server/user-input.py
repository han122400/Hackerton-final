from fastapi import APIRouter, Form, File, UploadFile
from fastapi.responses import JSONResponse
from supabase import create_client, Client
import os
from datetime import datetime
import json

router = APIRouter()

SUPABASE_URL: str = os.getenv("SUPABASE_URL")                # ex: https://xxxx.supabase.co
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")   # 서버 사이드 키
TABLE = "interviews"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.post("/user-input")
async def save_user_input(
    userName: str = Form(...),
    jobTitle: str = Form(...),
    notes: str = Form(""),
    resume: UploadFile = File(None)
):
    try:
        # (1) 파일 내용을 텍스트로 변환하는 부분 (예시 - 필요시 Whisper, PyPDF 등 붙이기)
        analysis_result = {}
        if resume:
            # 예시: 업로드된 파일 내용 읽기
            content = await resume.read()

            # 👉 여기서 AI 분석 로직 호출 (예: 이력서 요약, 키워드 추출 등)
            # 지금은 단순히 글자 수만 분석했다고 가정
            analysis_result = {
                "resume_length": len(content),
                "summary": f"{len(content)} bytes uploaded"
            }

        # (2) DB에 저장할 record 구성
        record = {
            "user_name": userName,
            "position": jobTitle,
            "notes": notes,
            "start_time": datetime.utcnow().isoformat(),
            "analysis": analysis_result
        }

        # (3) Supabase insert
        response = supabase.table(TABLE).insert(record).execute()

        if response.data:
            return JSONResponse(content={"ok": True, "id": response.data[0]["id"]})
        else:
            return JSONResponse(content={"ok": False, "detail": response.error}, status_code=500)

    except Exception as e:
        print("❌ Supabase 저장 오류:", e)
        return JSONResponse(content={"ok": False, "detail": str(e)}, status_code=500)
