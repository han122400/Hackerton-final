# camera_analyzer.py — FastAPI Router + WebSocket + MediaPipe
# 음성 분석(voice.py)
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response
import numpy as np
import cv2
import mediapipe as mp
import math
import os

router = APIRouter()

@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    path = os.path.join("static", "favicon.ico")
    return FileResponse(path) if os.path.exists(path) else Response(status_code=204)

# ───────────────────── MediaPipe ─────────────────────
mp_face = mp.solutions.face_mesh
# refine_landmarks=True → 홍채(iris) 랜드마크 포함
face_mesh = mp_face.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
)

# 주요 랜드마크 인덱스
LEFT_EYE_CONTOUR  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_CONTOUR = [362, 385, 387, 263, 373, 380]
LEFT_IRIS  = [468, 469, 470, 471]
RIGHT_IRIS = [473, 474, 475, 476]
MOUTH_LEFT, MOUTH_RIGHT = 61, 291
MOUTH_UP, MOUTH_DOWN = 13, 14
FACE_LEFT, FACE_RIGHT = 234, 454
LEFT_EYE_OUTER, RIGHT_EYE_OUTER = 33, 263  # 백업

# ───────────────────── 유틸 ─────────────────────
def _euclid(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)

def _center(points):
    x = sum(p.x for p in points) / len(points)
    y = sum(p.y for p in points) / len(points)
    return x, y

def _eye_bbox(landmarks, idxs):
    xs = [landmarks[i].x for i in idxs]
    ys = [landmarks[i].y for i in idxs]
    return min(xs), min(ys), max(xs), max(ys)

# ───────────────────── 분석 함수 ─────────────────────
def analyze_frame(image_bgr):
    """
    1프레임을 분석해 다음을 반환:
    - direction: '정면' / '왼쪽 측면' / '오른쪽 측면'
    - gaze: '센터' / '좌' / '우'     ← (요청대로 상/하 제거)
    - smile: 0.00 ~ 1.00             ← (기준 낮추고 변화폭 키움)
    - yaw: 얼굴 좌우 회전 정규값(진단용)
    """
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    res = face_mesh.process(rgb)

    out = {"direction": "알 수 없음", "gaze": "알 수 없음", "smile": None, "yaw": None}
    if not res.multi_face_landmarks:
        return out

    lm = res.multi_face_landmarks[0].landmark

    # 얼굴 방향
    nose = lm[1] if len(lm) > 1 else lm[0]
    xl = lm[FACE_LEFT].x if len(lm) > FACE_LEFT else lm[LEFT_EYE_OUTER].x
    xr = lm[FACE_RIGHT].x if len(lm) > FACE_RIGHT else lm[RIGHT_EYE_OUTER].x
    face_w = abs(xr - xl) + 1e-6
    yaw_norm = (nose.x - (xl + xr) / 2) / face_w
    out["yaw"] = round(float(yaw_norm), 3)

    # 정면/측면 라벨링(그대로 유지)
    if abs(yaw_norm) < 0.10:
        out["direction"] = "정면"
    elif yaw_norm > 0.10:
        out["direction"] = "오른쪽 측면"
    else:
        out["direction"] = "왼쪽 측면"

    # 시선: 홍채 중심 vs 눈 박스 상대좌표
    lx0, ly0, lx1, ly1 = _eye_bbox(lm, LEFT_EYE_CONTOUR)
    rx0, ry0, rx1, ry1 = _eye_bbox(lm, RIGHT_EYE_CONTOUR)
    lix, liy = _center([lm[i] for i in LEFT_IRIS])
    rix, riy = _center([lm[i] for i in RIGHT_IRIS])

    def _norm_xy(x, y, x0, y0, x1, y1):
        return ((x - x0) / (x1 - x0 + 1e-6), (y - y0) / (y1 - y0 + 1e-6))

    lnx, lny = _norm_xy(lix, liy, lx0, ly0, lx1, ly1)
    rnx, rny = _norm_xy(rix, riy, rx0, ry0, rx1, ry1)
    gx, gy = (lnx + rnx) / 2.0, (lny + rny) / 2.0  # 0~1

    # 좌/우/센터만
    #센터 기준 변수
    LEFT_THRESH = 0.42
    RIGHT_THRESH = 0.58
    if gx < LEFT_THRESH:
        gaze = "좌"
    elif gx > RIGHT_THRESH:
        gaze = "우"
    else:
        gaze = "센터"
    out["gaze"] = gaze

    # 미소: 입 가로/세로 비율 기반 휴리스틱
    # 입 너비/높이 비율 계산
    # 미소: 무표정≈0, 조금만 웃어도 1에 가까워짐
    # 미소: 무표정은 0에 가깝게, 살짝 웃으면 빠르게 1.0 근처로
    ml, mr, mu, md = lm[MOUTH_LEFT], lm[MOUTH_RIGHT], lm[MOUTH_UP], lm[MOUTH_DOWN]
    mouth_w = _euclid(ml, mr)
    mouth_h = _euclid(mu, md)

    width_ratio = mouth_w / (face_w + 1e-6)   # 입 너비 / 얼굴 폭
    open_ratio  = mouth_h / (face_w + 1e-6)   # 입 높이 / 얼굴 폭

    # 1) 무표정 데드존: 입너비비율이 0.35보다 작으면 0점
    if width_ratio < 0.30:
        smile = 0.0
    else:
        # 2) 기준을 높게(0.36) 잡고, 0.06만 늘어나도 상한(≈1)에 도달하도록 급경사
        raw = (width_ratio - 0.36) / 0.06

        # 3) 말할 때 과한 점수 방지: 입높이비율 0.16부터 감점, 가중치 0.50
        raw -= max(0.0, (open_ratio - 0.16) / 0.20) * 0.50

        # 4) 0~1.2 클램프 후, 감마>1(1.25)로 저강도 과대평가 억제
        raw = max(0.0, min(1.2, raw))
        smile = min(1.0, raw ** 0.2)

    out["smile"] = round(float(smile), 2)

    return out


# ───────────────────── WebSocket ─────────────────────
@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            buf = await websocket.receive_bytes()
            arr = np.frombuffer(buf, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                await websocket.send_json({"ok": False, "err": "decode_fail"})
                continue

            result = analyze_frame(frame)
            await websocket.send_json({"ok": True, "result": result})
    except WebSocketDisconnect:
        print("❌ WebSocket 연결 종료")
