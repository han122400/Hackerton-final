# GCP Cloud Run 배포 가이드

## STT 수정된 이미지로 배포

### 1. Docker 이미지가 푸시 완료되면 다음 명령어로 배포:

```bash
# Cloud Run에 배포 (환경변수 포함)
gcloud run deploy hackerton-stt-app \
  --image=parkhanbin1224/hackerton-stt-fixed:latest \
  --platform=managed \
  --region=asia-northeast3 \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=2 \
  --timeout=900 \
  --port=8000 \
  --set-env-vars="OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY,TYPECAST_API_KEY=YOUR_TYPECAST_KEY,SUPABASE_URL=YOUR_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_KEY"
```

### 2. 주요 설정 설명:

- **메모리**: 4Gi (Whisper 모델과 STT 처리를 위해 충분한 메모리)
- **CPU**: 2 (STT 처리는 CPU 집약적)
- **타임아웃**: 900초 (15분, STT 처리 시간 고려)
- **포트**: 8000 (애플리케이션 포트)

### 3. 환경변수 설정:

실제 배포 시 다음 값들을 설정해주세요:

- `OPENROUTER_API_KEY`: OpenRouter API 키
- `TYPECAST_API_KEY`: Typecast TTS API 키
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키

### 4. STT 개선사항:

이번 배포에서 수정된 내용:

- ✅ Whisper 모델을 빌드 시점에 미리 다운로드
- ✅ 필요한 오디오 처리 라이브러리들 추가 설치
- ✅ 적절한 파일 권한과 캐시 디렉토리 설정
- ✅ 상세한 로깅으로 문제 추적 가능
- ✅ 클라이언트에서 더 나은 에러 처리

### 5. 배포 후 확인:

```bash
# 서비스 URL 확인
gcloud run services describe hackerton-stt-app --region=asia-northeast3

# 로그 확인
gcloud logs read --service=hackerton-stt-app --region=asia-northeast3
```

### 6. 트러블슈팅:

만약 STT가 여전히 작동하지 않는다면:

1. Cloud Run 로그에서 Whisper 모델 로딩 확인
2. 메모리 사용량 모니터링
3. 타임아웃 설정 확인
4. 오디오 파일 크기 및 형식 확인
