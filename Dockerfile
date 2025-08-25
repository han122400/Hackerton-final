# ---------- builder ----------
FROM python:3.10-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ffmpeg 포함, 한 레이어에서 설치 + 캐시 정리
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg curl ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

# 의존성: 먼저 파일 복사
COPY requirements.txt .

# 1) CPU 전용 torch를 미리 고정 설치 (거대한 CUDA 휠 방지)
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.3.1

# 2) whisper는 torch를 이미 깔았으니 --no-deps로 설치
#    (requirements.txt에서 openai-whisper가 있다면 중복 방지 위해 제거 권장,
#     대신 아래 RUN에서 설치하거나, requirements에 두되 torch는 위에서 선행 설치)
RUN pip install --no-cache-dir --no-deps openai-whisper==20231117

# 3) 나머지 파이썬 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-contrib-python opencv-python || true && \
    pip install --no-cache-dir --force-reinstall opencv-python-headless==4.11.0.86

# 소스 복사 (정말 필요한 것만)
COPY app.py ./app.py
COPY api ./api
COPY server ./server
COPY templates ./templates
COPY static ./static

# ---------- runtime ----------
FROM python:3.10-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# 런타임에 필요한 최소 파일/바이너리만 복사
# (site-packages와 실행 파일 전체를 builder에서 가져옴)
COPY --from=builder /usr/local /usr/local
COPY --from=builder /app /app

# 비루트 유저
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
