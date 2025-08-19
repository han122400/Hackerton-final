from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from starlette.requests import Request
from fastapi.middleware.cors import CORSMiddleware

# API 라우터들 import
from server.interview import router as interview_router
from server.camera_analyzer import router as camera_router
from server.profile import router as profile_router

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
    return templates.TemplateResponse("job-list.html", {"request": request})

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

# 헬스체크
@app.get("/health")
def health():
    return {"ok": True}
