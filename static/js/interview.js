// interview.js – 완전 통합 버전 (분석 상태 표시 포함)

let interviewData = null
let currentQuestionIndex = 0
let interviewQuestions = []
let interviewAnswers = []
let interviewTimer = null
let interviewStartTime = null

// 녹음 상태
let isRecording = false
let mediaRecorder = null
let recordedChunks = []
let currentStream = null

// ===== 질문 생성 =====
function generateInterviewQuestions() {
  interviewQuestions = []

  const generalQuestions = INTERVIEW_QUESTIONS.general
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)

  const jobData = localStorage.getItem('selectedJob')
  const category = jobData ? JSON.parse(jobData).category : '프론트엔드'
  const technicalQuestions = (
    INTERVIEW_QUESTIONS.technical[category] ||
    INTERVIEW_QUESTIONS.technical['프론트엔드']
  )
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)

  interviewQuestions = [...generalQuestions, ...technicalQuestions]

  const totalEl = document.getElementById('totalQuestions')
  if (totalEl) totalEl.textContent = interviewQuestions.length
}

// ===== OpenRouter에서 질문 받아오기 =====
async function fetchInterviewQuestion(prompt) {
  try {
    const res = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    return data.answer || prompt
  } catch (e) {
    return '질문을 불러오지 못했습니다.'
  }
}

// ===== 현재 질문 표시 (OpenRouter API 연동) =====
async function showCurrentQuestion() {
  if (currentQuestionIndex >= interviewQuestions.length) {
    completeInterview()
    return
  }

  const idxEl = document.getElementById('currentQuestion')
  const qTextEl = document.getElementById('questionText')
  const answerEl = document.getElementById('answerText')

  if (idxEl) idxEl.textContent = currentQuestionIndex + 1

  // OpenRouter에서 질문 받아와 표시
  const prompt = interviewQuestions[currentQuestionIndex]
  if (qTextEl) qTextEl.textContent = '질문을 생성 중...'
  const questionText = await fetchInterviewQuestion(prompt)
  if (qTextEl) qTextEl.textContent = questionText

  if (answerEl) answerEl.value = ''

  updateProgressBar()
}

// ===== 진행률 바 =====
function updateProgressBar() {
  const fill = document.getElementById('progressFill')
  if (!fill || interviewQuestions.length === 0) return
  const progress =
    ((currentQuestionIndex + 1) / interviewQuestions.length) * 100
  fill.style.width = `${progress}%`
}

// ===== 다음 질문 =====
function nextQuestion() {
  if (isRecording) toggleRecording() // 녹음 중이면 중지

  const answer = (document.getElementById('answerText')?.value ?? '').trim()
  interviewAnswers.push({
    question: interviewQuestions[currentQuestionIndex],
    answer: answer,
    timestamp: new Date(),
  })

  currentQuestionIndex++
  showCurrentQuestion()
}

// ===== 카메라/마이크 스트림 유지 (getMediaStream 원본 유지) =====
async function getMediaStream() {
  if (currentStream) return currentStream

  try {
    if (navigator.permissions) {
      try {
        const cam = await navigator.permissions.query({ name: 'camera' })
        const mic = await navigator.permissions.query({ name: 'microphone' })
        if (cam.state === 'denied' || mic.state === 'denied') {
          alert('브라우저 설정에서 카메라/마이크 차단을 해제해주세요.')
          return null
        }
      } catch (e) {
        console.warn('권한 상태 확인 불가:', e)
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    })
    currentStream = stream

    const live = document.getElementById('livePreview')
    if (live) {
      live.classList.remove('d-none')
      live.srcObject = stream
    }
    return stream
  } catch (err) {
    console.error('getUserMedia error:', err)
    alert('카메라/마이크 권한이 필요합니다.')
    return null
  }
}

function stopStreamTracks() {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop())
    currentStream = null
  }
  const live = document.getElementById('livePreview')
  if (live) {
    live.srcObject = null
    live.classList.add('d-none')
  }
}

// ===== 권한 체크 + getUserMedia 통합 =====
async function requestMicrophoneAccess() {
  const sttBox = document.getElementById('realtimeTranscript')

  // 먼저 권한 상태 확인
  if (navigator.permissions) {
    try {
      const micPerm = await navigator.permissions.query({ name: 'microphone' })
      if (micPerm.state === 'denied') {
        alert('마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.')
        return null
      }
    } catch (e) {
      console.warn('권한 상태 확인 불가:', e)
    }
  }

  // 실제 마이크 접근 시도
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return stream
  } catch (err) {
    console.error('마이크 접근 실패:', err)
    alert('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.')
    if (sttBox) sttBox.textContent = '마이크 권한이 필요합니다.'
    return null
  }
}

// 마이크 권한 요청
async function requestMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return stream
  } catch (err) {
    alert('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.')
    console.error('마이크 권한 요청 실패:', err)
    return null
  }
}

// ===== 녹음 토글 =====
async function toggleRecording() {
  const recordButton = document.getElementById('recordButton')
  const recDot = document.getElementById('recDot')
  const sttBox = document.getElementById('realtimeTranscript')

  if (isRecording) {
    mediaRecorder.stop()
    isRecording = false
    if (recordButton) {
      recordButton.textContent = '음성 답변'
      recordButton.classList.remove('btn-success')
      recordButton.classList.add('btn-danger')
    }
    if (recDot) recDot.classList.remove('active')
    if (sttBox && sttBox.dataset.tempText) {
      sttBox.textContent = sttBox.dataset.tempText
      delete sttBox.dataset.tempText
    }
  } else {
    const stream = await requestMicrophoneAccess()
    if (!stream) return

    recordedChunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'answer.webm')

      // STT 박스에 "분석 중입니다" 표시
      if (sttBox) {
        sttBox.dataset.tempText = sttBox.textContent
        sttBox.textContent = '분석하는 중입니다...'
      }

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (sttBox) sttBox.textContent = data.text || '분석 결과가 없습니다.'
        console.log('서버 응답:', data)
      } catch (err) {
        console.error('서버 전송 실패:', err)
        if (sttBox) sttBox.textContent = '분석 실패'
      }

      stream.getTracks().forEach((t) => t.stop())
    }

    mediaRecorder.start()
    isRecording = true
    if (recordButton) {
      recordButton.textContent = '녹음 중지'
      recordButton.classList.remove('btn-danger')
      recordButton.classList.add('btn-success')
    }
    if (recDot) recDot.classList.add('active')
  }
}

// ===== 타이머 =====
function startInterviewTimer() {
  interviewStartTime = new Date()
  interviewTimer = setInterval(updateTimer, 1000)
}

function updateTimer() {
  const elapsed = Math.floor((new Date() - interviewStartTime) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const el = document.getElementById('timer')
  if (el)
    el.textContent = `${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`
}

// ===== 면접 완료 =====
function completeInterview() {
  if (interviewTimer) clearInterval(interviewTimer)
  generateInterviewResult()
  window.location.href = '/result'
}

// ===== 결과 생성 =====
function generateInterviewResult() {
  const totalTime = Math.floor((new Date() - interviewStartTime) / 1000)

  const scores = EVALUATION_CRITERIA.map((criteria) => {
    const baseScore = 70 + Math.random() * 20
    return {
      name: criteria.name,
      score: Math.round(baseScore),
      weight: criteria.weight,
    }
  })

  const overallScore = Math.round(
    scores.reduce((sum, item) => sum + item.score * item.weight, 0)
  )

  const result = {
    overallScore,
    scores,
    duration: totalTime,
    answers: interviewAnswers,
    feedback: generateFeedback(scores),
    recommendations: generateRecommendations(),
  }

  if (!interviewData) interviewData = {}
  interviewData.result = result
  localStorage.setItem('interviewResult', JSON.stringify(result))
}

// ===== 피드백/추천 샘플 =====
function generateFeedback() {
  const positives = FEEDBACK_TEMPLATES.positive
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)
  const improvements = FEEDBACK_TEMPLATES.improvement
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)
  return { positive: positives, improvement: improvements }
}

function generateRecommendations() {
  return FEEDBACK_TEMPLATES.suggestions
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
}

// ===== 초기화 =====
async function initializeInterview() {
  if (!interviewData) return

  document.getElementById('interviewCompany').textContent =
    interviewData.company || '회사명'
  document.getElementById('interviewPosition').textContent =
    interviewData.position || '직무명'

  generateInterviewQuestions()
  await showCurrentQuestion()
  startInterviewTimer()
}

// ===== 페이지 로드시 =====
document.addEventListener('DOMContentLoaded', async function () {
  const data = localStorage.getItem('interviewData')
  if (data) {
    interviewData = JSON.parse(data)
    await initializeInterview()
  } else {
    alert('면접 정보를 찾을 수 없습니다.')
    window.location.href = '/'
  }

  // selectedJob 기반 질문 구성
  ;(function () {
    function loadSelectedJob() {
      try {
        return JSON.parse(localStorage.getItem('selectedJob') || 'null')
      } catch {
        return null
      }
    }
    function buildQuestions(p) {
      const base = p?.description || ''
      const title = p?.job?.title || '지원 직무'
      const company = p?.job?.company || '회사'
      return [
        `${company}의 ${title}에 지원한 동기를 말씀해주세요.`,
        `공고에서 요구하는 역량 중 본인 강점 1~2개를 사례와 함께 설명해주세요.`,
        `요구 기술 중 가장 자신 있는 기술을 선택해 최근 경험을 말해보세요.`,
        `해당 포지션 핵심 업무에 대한 이해와 입사 후 3개월 계획은?`,
        `공고 요약: ${base.slice(
          0,
          120
        )}... 를 바탕으로 가장 적합한 프로젝트 경험을 설명하세요.`,
      ]
    }

    const p = loadSelectedJob()
    if (!p) return

    const cEl = document.getElementById('interviewCompany')
    const tEl = document.getElementById('interviewPosition')
    if (cEl) cEl.innerText = p.job?.company || '회사명'
    if (tEl) tEl.innerText = p.job?.title || '직무명'

    const qs = buildQuestions(p)
    window.__questions = qs

    const qEl = document.getElementById('questionText')
    const totalEl = document.getElementById('totalQuestions')
    if (qEl) qEl.innerText = qs[0]
    if (totalEl) totalEl.innerText = qs.length
  })()

  // 녹음 버튼 연결
  document
    .getElementById('recordButton')
    ?.addEventListener('click', toggleRecording)
})
