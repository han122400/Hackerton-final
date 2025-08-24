const video = document.getElementById('video')
const canvas = document.getElementById('canvas')
const log = document.getElementById('log')

const dirEl = document.getElementById('dir')
const gazeEl = document.getElementById('gaze')
const smileEl = document.getElementById('smile')
const scoreEl = document.getElementById('score')

// 요소 누락 빠른 진단 (필요한 DOM이 없으면 콘솔 에러)
for (const [name, el] of Object.entries({
  video,
  canvas,
  log,
  dirEl,
  gazeEl,
  smileEl,
  scoreEl,
})) {
  if (!el) console.error('❌ missing element:', name)
}

// 점수 추적을 위한 변수들
let analysisData = {
  direction: [],
  gaze: [],
  smile: [],
  totalFrames: 0,
}

const ctx = canvas.getContext('2d')
canvas.width = 480
canvas.height = 360

// ws / wss 자동 선택 (로컬 http는 ws://, 배포 https는 wss://)
const WS_URL =
  (location.protocol === 'https:' ? 'wss://' : 'ws://') +
  location.host +
  '/api/ws'
const socket = new WebSocket(WS_URL)

socket.onopen = () => appendLog('🔌 WebSocket 연결됨')
socket.onclose = () => appendLog('❌ WebSocket 종료')
socket.onerror = (e) => appendLog('⚠️ WebSocket 오류: ' + (e?.message || e))

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)
    if (!data.ok) {
      appendLog('⚠️ 분석 실패: ' + (data.err || 'unknown'))
      return
    }

    // 서버(MediaPipe 분석)에서 돌려준 결과
    const r = data.result || {}
    dirEl.textContent = r.direction ?? '-' // 예: '정면' / '왼쪽 측면' / '오른쪽 측면'
    gazeEl.textContent = r.gaze ?? '-' // 예: '센터' / '좌' / '우' / '상' / '하'

    // 미소 점수를 100점 만점으로 계산
    let smileScore = 0
    if (typeof r.smile === 'number') {
      smileScore = Math.round(r.smile * 100) // 0~1을 0~100으로 변환
      smileEl.textContent = smileScore + '점'
    } else {
      smileEl.textContent = '-'
    }

    // 데이터 수집 (점수 계산을 위해)
    analysisData.totalFrames++

    // 방향 점수 (정면: 100, 측면: 50)
    let directionScore = 50
    if (r.direction === '정면') directionScore = 100
    analysisData.direction.push(directionScore)

    // 시선 점수 (센터: 100, 기타: 60)
    let gazeScore = 60
    if (r.gaze === '센터') gazeScore = 100
    analysisData.gaze.push(gazeScore)

    // 미소 점수 (0~1을 0~100으로 변환)
    const currentSmileScore =
      typeof r.smile === 'number' ? Math.round(r.smile * 100) : 0
    analysisData.smile.push(currentSmileScore)

    // ─────────────────────────────────────────────────────
    // [여기가 기존 전체 점수 계산 로직] — 100점 만점의 간단 가중치 예시
    //
    // 가중치 규칙:
    // - 시선이 '센터'면 50점, 아니면 25점
    // - 얼굴 방향이 '정면'이면 30점, 아니면 15점
    // - 미소 스코어(0~1)를 0~20점으로 환산해 더함 (반올림)
    //
    // 필요 시 여기 숫자를 조정해서 튜닝하면 됨.
    // ─────────────────────────────────────────────────────
    // 100점 만점 계산 로직 (시선 40, 방향 30, 미소 30)
    let score = 0
    // 시선: 센터면 40점, 아니면 20점
    score += r.gaze === '센터' ? 40 : 20
    // 얼굴 방향: 정면이면 30점, 아니면 15점
    score += r.direction === '정면' ? 30 : 15
    // 미소: 0~1 값을 받아서 0~30점으로 환산
    score += Math.round((typeof r.smile === 'number' ? r.smile : 0) * 30)
    // 최종 점수 출력
    scoreEl.textContent = score

    // 디버그/로그 표시
    appendLog(
      `📍 방향:${r.direction} / 👀 시선:${r.gaze} / 🙂 미소:${r.smile} / 🧭 yaw:${r.yaw}`
    )
  } catch (e) {
    appendLog('📩 ' + event.data)
  }
}

navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then((stream) => {
    video.srcObject = stream
    appendLog('📷 카메라 시작')
    setInterval(captureAndSend, 1000) // 1초마다 캡처(트래픽 절약)
  })
  .catch((err) => {
    appendLog('❌ 카메라 실패: ' + err.message)
    alert('카메라 접근 실패: ' + err.message)
  })

function captureAndSend() {
  if (socket.readyState !== 1) return
  // 비디오 프레임을 캔버스로 그려서 JPEG로 인코딩 → WebSocket으로 전송
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      blob.arrayBuffer().then((buf) => socket.send(buf))
    },
    'image/jpeg',
    0.8 // JPEG 품질(0.0~1.0). 트래픽을 더 줄이고 싶으면 0.7~0.6로 낮출 수 있음
  )
}

function appendLog(msg) {
  const now = new Date().toLocaleTimeString('ko-KR', { hour12: false })
  const div = document.createElement('div')
  div.className = 'log-line'
  div.textContent = `[${now}] ${msg}`
  log.appendChild(div)
  log.scrollTop = log.scrollHeight
}

// 최종 점수 계산 함수
function calculateFinalScores() {
  if (analysisData.totalFrames === 0) {
    return {
      direction: 0,
      gaze: 0,
      smile: 0,
      overall: 0,
    }
  }

  // 각 항목별 평균 점수 계산
  const directionAvg =
    analysisData.direction.length > 0
      ? analysisData.direction.reduce((a, b) => a + b, 0) /
        analysisData.direction.length
      : 0

  const gazeAvg =
    analysisData.gaze.length > 0
      ? analysisData.gaze.reduce((a, b) => a + b, 0) / analysisData.gaze.length
      : 0

  const smileAvg =
    analysisData.smile.length > 0
      ? analysisData.smile.reduce((a, b) => a + b, 0) /
        analysisData.smile.length
      : 0

  // 전체 점수 계산 (방향 30%, 시선 40%, 미소 30%)
  const overall = Math.round(
    directionAvg * 0.3 + gazeAvg * 0.4 + smileAvg * 0.3
  )

  console.log('영상분석 최종 점수:', {
    direction: Math.round(directionAvg),
    gaze: Math.round(gazeAvg),
    smile: Math.round(smileAvg),
    overall: overall,
    totalFrames: analysisData.totalFrames,
  })

  return {
    direction: Math.round(directionAvg),
    gaze: Math.round(gazeAvg),
    smile: Math.round(smileAvg),
    overall: overall,
  }
}

// 글로벌 함수로 내보내기 (interview.js에서 사용)
window.getCameraAnalysisScores = calculateFinalScores
