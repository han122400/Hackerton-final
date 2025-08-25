# server/voice.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydub import AudioSegment
import io, os
import numpy as np
import librosa
import whisper
from functools import lru_cache
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@lru_cache(maxsize=1)
def get_model():
    try:
        # CPU 환경 권장: "small" (medium은 매우 느리고 메모리 큼)
        # GPU면 whisper.load_model("medium", device="cuda")
        logger.info("Whisper 모델 로딩 중...")
        model = whisper.load_model("small")
        logger.info("Whisper 모델 로딩 완료")
        return model
    except Exception as e:
        logger.error(f"Whisper 모델 로딩 실패: {e}")
        raise HTTPException(status_code=500, detail=f"Whisper 모델 로딩 실패: {e}")

def _to_wav_16k_mono(audio_bytes: bytes, fmt: str = "webm") -> bytes:
    # webm/opus → wav 16k mono
    try:
        logger.info(f"오디오 변환 시작: {fmt} -> wav")
        src = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
        logger.info(f"원본 오디오: 길이={len(src)}ms, 채널={src.channels}, 샘플레이트={src.frame_rate}")
    except Exception as e:
        logger.error(f"입력 오디오 디코딩 실패({fmt}): {e}")
        raise HTTPException(status_code=400, detail=f"입력 오디오 디코딩 실패({fmt}): {e}")

    src = src.set_frame_rate(16000).set_channels(1)
    out = io.BytesIO()
    # 파라미터로 강제 지정도 가능: parameters=["-ac", "1", "-ar", "16000"]
    src.export(out, format="wav")
    out.seek(0)
    logger.info("오디오 변환 완료")
    return out.read()

def analyze_audio(audio_bytes: bytes, input_fmt: str):
    try:
        logger.info(f"오디오 분석 시작: 크기={len(audio_bytes)} bytes, 포맷={input_fmt}")
        
        # 1) webm/ogg/wav 등 포맷 분기
        fmt = input_fmt or "webm"
        fmt = fmt.split("/")[-1].lower() if "/" in fmt else fmt.lower()
        if fmt in ("webm", "ogg", "opus"):
            wav_bytes = _to_wav_16k_mono(audio_bytes, fmt="webm")
        elif fmt in ("wav", "x-wav"):
            wav_bytes = audio_bytes  # 그대로
        else:
            # 기타 포맷도 ffmpeg가 처리 가능하나, 명시적으로 webm 기본 처리
            wav_bytes = _to_wav_16k_mono(audio_bytes, fmt="webm")

        # 2) librosa 로드(16k mono 보장)
        y, sr = librosa.load(io.BytesIO(wav_bytes), sr=16000, mono=True)
        logger.info(f"librosa 로드 완료: 길이={y.size} samples, sr={sr}")
        
        if y.size == 0:
            logger.error("빈 오디오 데이터")
            raise HTTPException(status_code=400, detail="빈 오디오입니다.")

        # 3) 간단 신호 특징
        energy = float(np.mean(y ** 2))
        pitches, mags = librosa.piptrack(y=y, sr=sr)
        pitch_vals = pitches[mags > 0]
        avg_pitch = float(np.mean(pitch_vals)) if pitch_vals.size > 0 else 0.0
        logger.info(f"신호 분석 완료: energy={energy}, avg_pitch={avg_pitch}")

        # 4) Whisper 추론
        model = get_model()
        logger.info("Whisper 추론 시작...")
        # ndarray로 직접 전달 가능. CPU는 fp16=False 필수.
        result = model.transcribe(y, fp16=False, language="ko")  # language 생략 가능(자동)
        text = (result.get("text") or "").strip()
        logger.info(f"Whisper 추론 완료: '{text}'")

        # 5) 매우 러프한 감정 힌트
        emotion = "Neutral"
        if energy > 0.01:
            emotion = "Active"
        elif energy < 0.001:
            emotion = "Calm"

        return {
            "text": text,
            "signal": {"energy": energy, "avg_pitch": avg_pitch},
            "emotion": emotion,
            "sr": sr,
            "dur_sec": round(y.size / sr, 3),
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"오디오 분석 중 오류: {e}")
        raise HTTPException(status_code=500, detail=f"오디오 분석 실패: {e}")

@router.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    try:
        logger.info(f"STT 요청 수신: filename={audio.filename}, content_type={audio.content_type}")
        audio_bytes = await audio.read()
        logger.info(f"오디오 파일 읽기 완료: {len(audio_bytes)} bytes")
        
        result = analyze_audio(audio_bytes, audio.content_type or "webm")
        logger.info(f"STT 분석 성공: '{result['text']}'")
        return result
    except HTTPException as he:
        logger.error(f"HTTPException: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"예상치 못한 오류: {e}")
        # 디버깅을 돕는 명확한 에러 메시지
        return {"text": "", "signal": {}, "emotion": "Error", "error": str(e)}
