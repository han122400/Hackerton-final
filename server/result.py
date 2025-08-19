# result.py
# 인터뷰 분석 결과 반환.
# 수정x
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()

# CORS 허용 (모바일에서 fetch 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PerformanceItem(BaseModel):
    skill: str
    score: int

class FeedbackItem(BaseModel):
    category: str
    color: str
    bgColor: str
    icon: str  # 아이콘 이름
    items: List[str]

class ResultResponse(BaseModel):
    performance: List[PerformanceItem]
    feedback: List[FeedbackItem]
    answeredQuestions: int
    totalTime: int
    overallScore: int

@app.get("/result", response_model=ResultResponse)
def get_result():
    performance = [
        {"skill": "의사소통", "score": 85},
        {"skill": "전문성", "score": 78},
        {"skill": "문제해결", "score": 82},
        {"skill": "리더십", "score": 75},
        {"skill": "자신감", "score": 88},
        {"skill": "열정", "score": 90},
    ]

    feedback = [
        {
            "category": "강점",
            "icon": "TrendingUp",
            "color": "#16A34A",
            "bgColor": "#ECFDF5",
            "items": [
                "명확하고 자신감 있는 의사소통 스타일",
                "과거 경험을 잘 활용한 구체적인 답변",
                "직무에 대한 진정성 있는 열정 표현",
            ],
        },
        {
            "category": "개선점",
            "icon": "Target",
            "color": "#EA580C",
            "bgColor": "#FFF7ED",
            "items": [
                "기술적 세부사항을 더 구체적으로 설명할 필요",
                "STAR 기법을 활용한 답변 구조화 권장",
                "음성 채움어 사용 빈도 줄이기",
            ],
        },
        {
            "category": "제안사항",
            "icon": "MessageSquare",
            "color": "#2563EB",
            "bgColor": "#EFF6FF",
            "items": [
                "기술 개념을 쉽게 설명하는 연습하기",
                "2-3개의 상세한 프로젝트 사례 미리 준비",
                "지원 회사의 최근 동향 사전 조사",
            ],
        },
    ]

    answered_questions = 4
    total_time = 480
    overall_score = round(sum(item["score"] for item in performance)/len(performance))

    return {
        "performance": performance,
        "feedback": feedback,
        "answeredQuestions": answered_questions,
        "totalTime": total_time,
        "overallScore": overall_score
    }