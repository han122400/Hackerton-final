# ---------- builder ----------
FROM python:3.10-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ffmpeg 및 오디오 처리에 필요한 라이브러리 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      curl \
      ca-certificates \
      build-essential \
      libsndfile1 \
      libsox-fmt-all \
      sox \
      git \
    && rm -rf /var/lib/apt/lists/*

# 의존성: 먼저 파일 복사
COPY requirements.txt .

# 1) CPU 전용 torch를 미리 고정 설치 (거대한 CUDA 휠 방지)
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.3.1

# 2) whisper는 torch를 이미 깔았으니 --no-deps로 설치
RUN pip install --no-cache-dir --no-deps openai-whisper==20231117

# 3) 나머지 파이썬 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-contrib-python opencv-python || true && \
    pip install --no-cache-dir --force-reinstall opencv-python-headless==4.11.0.86

# 4) Whisper 모델 미리 다운로드 (빌드 시점에)
RUN python -c "import whisper; whisper.load_model('small')"

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

# 런타임에 필요한 시스템 라이브러리 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      libsndfile1 \
      libsox-fmt-all \
      sox \
    && rm -rf /var/lib/apt/lists/*

# 런타임에 필요한 최소 파일/바이너리만 복사
# (site-packages와 실행 파일 전체를 builder에서 가져옴)
COPY --from=builder /usr/local /usr/local
COPY --from=builder /app /app

# Whisper 모델 캐시를 위한 디렉토리 생성 및 권한 설정
RUN mkdir -p /home/appuser/.cache/whisper && \
    useradd -m appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /home/appuser/.cache

USER appuser

# Whisper 캐시 디렉토리 환경변수 설정
ENV XDG_CACHE_HOME=/home/appuser/.cache

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
