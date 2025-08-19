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

# API 라우터 등록
app.include_router(interview_router, prefix="/api")
app.include_router(camera_router, prefix="/api")
app.include_router(profile_router, prefix="/api")

# 헬스체크
@app.get("/health")
def health():
    return {"ok": True}
