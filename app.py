import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from starlette.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles




# API 라우터들 import
from server.interview import router as interview_router
from server.camera_analyzer import router as camera_router
from server.profile import router as profile_router
from api.routers.work24 import router as work24_router, get_jobs  # get_jobs 함수 추가

app = FastAPI()

# CORS 허용 (프론트엔드와 통신 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 연결
app.mount("/static", StaticFiles(directory="static"), name="static")

# 템플릿 연결
templates = Jinja2Templates(directory="templates")

# 기본 페이지
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# 다른 페이지들
@app.get("/user-input", response_class=HTMLResponse)
async def user_input(request: Request):
    return templates.TemplateResponse("user-input.html", {"request": request})

@app.get("/job-list", response_class=HTMLResponse)
async def job_list(request: Request):
    # 오픈API에서 데이터 가져오기
    jobs_response = await get_jobs()
    if not jobs_response.get("ok"):
        # API 호출 실패 시 로그 출력 및 더미 데이터 사용
        print(f"Error fetching jobs: {jobs_response.get('error')}")
        jobs = []  # 더미 데이터를 사용하려면 여기에 추가 가능
    else:
        jobs = jobs_response.get("items", [])
    return templates.TemplateResponse("job-list.html", {"request": request, "jobs": jobs})

@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})

@app.get("/interview", response_class=HTMLResponse)
async def interview_page(request: Request):
    return templates.TemplateResponse("interview.html", {"request": request})

@app.get("/result", response_class=HTMLResponse)
async def result_page(request: Request):
    return templates.TemplateResponse("result.html", {"request": request})

@app.get("/cover-letter", response_class=HTMLResponse)
async def cover_letter_page(request: Request):
    return templates.TemplateResponse("cover-letter.html", {"request": request})

@app.get("/job-detail", response_class=HTMLResponse)
async def job_detail_page(request: Request):
    return templates.TemplateResponse("job-detail.html", {"request": request})

# API 라우터 등록
app.include_router(interview_router, prefix="/api")
app.include_router(camera_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(work24_router, prefix="/api", tags=["work24"])


# 헬스체크
@app.get("/health")
def health():
    return {"ok": True}
