# profile.py
# 수정 x
# 유저 정보(이름+이메일+연락처+학력+경력) - DB저장(user_info.py) + 이력서 분석 - 이전 코드(resume.py) 보기
# 저장 성공 시 사용자 이름 로컬스토리지 저장
from fastapi import APIRouter, Form
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime, timedelta

router = APIRouter()

# PostgreSQL 연결 정보 (환경변수로 관리 권장)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "1234")

# JWT 설정
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-key-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 1일

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        cursor_factory=RealDictCursor
    )

@router.post("/save_profile")
def save_profile(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    birth: str = Form(...),
    address: str = Form(...),
    job_title: str = Form(...)
):
    try:
        # 1️⃣ DB에 사용자 정보 저장
        conn = get_db_connection()
        cur = conn.cursor()
        insert_query = """
            INSERT INTO user_in.user_info (name, mail, phone, birth, address, job_title)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cur.execute(insert_query, (name, email, phone, birth, address, job_title))
        conn.commit()
        cur.close()
        conn.close()

        # 2️⃣ JWT 발급 (사용자 이름 기반)
        payload = {
            "name": name,
            "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return {"status": "success", "message": "사용자 정보가 저장되었습니다.", "token": token}

    except Exception as e:
        print(str(e))
        return {"status": "error", "message": str(e)}