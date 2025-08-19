# user-input.py
# 자기소개서 + 포트폴리오 - 필수x
# 수정x
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PostgreSQL 연결 설정
DB_HOST = "localhost"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASS = "1234"

conn = psycopg2.connect(
    host=DB_HOST,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASS
)

# portfolio 폴더 생성
if not os.path.exists("portfolio"):
    os.makedirs("portfolio")


@app.post("/submit")
async def submit_user_input(
    cover_letter: str = Form(None),           # optional로 변경
    portfolio: UploadFile | None = File(None),
    jwt_token: str = Form(None)               # JWT 확인
):
    # 1️⃣ JWT 확인
    if jwt_token:
        print("받은 JWT:", jwt_token)
    else:
        print("JWT가 전달되지 않았습니다.")

    # 2️⃣ 입력이 없으면 DB 저장/파일 저장 없이 바로 응답
    if not cover_letter and not portfolio:
        return {"success": True, "message": "입력 없이 JWT만 전달됨."}

    # 3️⃣ 자기소개서 DB 저장
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_in.user_inputs (cover_letter) VALUES (%s) RETURNING id",
                (cover_letter,),
            )
            user_id = cur.fetchone()[0]
            conn.commit()
    except Exception as e:
        return {"success": False, "error": str(e)}

    # 4️⃣ 포트폴리오 저장
    file_path = None
    if portfolio:
        file_ext = os.path.splitext(portfolio.filename)[1]
        file_path = f"portfolio/{user_id}{file_ext}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(portfolio.file, f)

    return {"success": True, "user_id": user_id, "portfolio_path": file_path}