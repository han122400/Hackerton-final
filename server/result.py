from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/result")
def get_result():
    return JSONResponse({
        "ok": True,
        "overallScore": 83,
        "detailFeedback": {  # 그래프용 점수
            "direction": 80,
            "eye": 70,
            "smile": 90
        },
        "feedback": {  # 상세 피드백
            "strength": [
                "구체적인 예시를 들어 설명해주셔서 이해하기 쉬웠습니다.",
                "경험을 바탕으로 한 답변이 설득력 있었습니다."
            ],
            "improvement": [
                "본인의 역할과 기여도를 더 구체적으로 설명해주세요.",
                "답변의 구조를 더 명확하게 정리해보세요."
            ],
            "suggestion": [
                "STAR 기법을 활용해 답변을 구조화해보세요.",
                "면접 연습을 통해 자신감을 키워보세요."
            ]
        },
        "postureFeedback": {  # 자세 피드백 텍스트
            "direction": "방향이 안정적입니다.",
            "eye": "시선이 자연스럽습니다.",
            "smile": "미소가 좋습니다."
        }
    })
