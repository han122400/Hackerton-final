# 1) Python 3.10 slim 베이스
FROM python:3.10-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg 설치
RUN apt-get update && apt-get install -y ffmpeg

# 2) 필요한 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

# 3) 작업 디렉토리
WORKDIR /app

# 4) 의존성 설치(opencv오류때매 따로설치)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y opencv-contrib-python opencv-python \
    && pip install --no-cache-dir --force-reinstall opencv-python-headless==4.11.0.86


# 5) 소스 복사
COPY app.py ./app.py
COPY api ./api
COPY server ./server
COPY templates ./templates
COPY static ./static

# 6) 비루트 유저
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# 7) 포트 및 실행
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
