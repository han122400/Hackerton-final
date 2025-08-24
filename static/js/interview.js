// interview.js – OpenRouter 기반 AI 면접 시스템

let interviewData = null
let currentQuestionIndex = 0
let interviewQuestions = []
let interviewAnswers = []
let interviewTimer = null
let interviewStartTime = null
let isInterviewStarted = false

// 녹음 상태
let mediaRecorder = null
let isRecording = false
let recordedChunks = []

/* ========= 첫 번째 질문 생성 (면접 시작) ========= */
async function generateFirstQuestion() {
  try {
    const questionText = document.getElementById('questionText')
    if (questionText) questionText.textContent = '첫 번째 질문을 생성하는 중...'

    // interviewData에서 정보 가져오기
    const jobData = JSON.parse(localStorage.getItem('selectedJob') || '{}')
    const userData = {
      name: interviewData?.name || '지원자',
      company: jobData.job?.company || interviewData?.company || '회사',
      position: jobData.job?.title || interviewData?.position || '직무',
      experience: interviewData?.experience || '경력 정보 없음',
      skills: interviewData?.skills || [],
      education: interviewData?.education || '학력 정보 없음',
    }

    const prompt = `다음은 지원자의 정보입니다:
${JSON.stringify(userData, null, 2)}

위 정보를 바탕으로 첫 번째 질문을 생성해주세요.`

    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        system_prompt: `역할: 전문 채용 면접관 (한국어, 존댓말)

진행 규칙:
1) 전체 질문 수는 정확히 5개입니다.
2) 한 번에 한 질문만 제시합니다.
3) 지원자의 답변을 받은 뒤에만 다음 질문을 생성합니다.
4) 받은 JSON 정보를 바탕으로 개인화된 질문을 만들어주세요.
5) 질문 순서는 반드시 다음과 같이 진행됩니다:
   - JSON 정보 수신 후 → index:1 (자기소개)
   - 첫 번째 답변 후 → index:2 (지원 동기)
   - 두 번째 답변 후 → index:3 (직무 역량/경험)
   - 세 번째 답변 후 → index:4 (문제해결/갈등상황)
   - 네 번째 답변 후 → index:5 (장래/성장 포부)
   - 다섯 번째 답변 후 → index:6 (종합 피드백)
6) 답변이 짧거나 모호하면 "조금 더 구체적으로 말씀해 주실 수 있을까요?"라는 문구를 덧붙입니다.
7) 모든 출력은 한국어 존댓말, 간결하고 또렷하게. 내부 사고과정/노트는 절대 노출하지 않습니다.

출력 포맷 (반드시 준수):
- JSON 수신 후: {"type":"question","index":1,"end":false,"question":"개인화된 질문"}
- 이후 질문들: {"type":"question","index":숫자,"end":false,"question":"질문내용"}

첫 번째 질문은 자기소개 관련 질문이어야 합니다. 받은 개인정보를 바탕으로 질문을 개인화하세요.`,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('첫 번째 질문 OpenRouter 응답:', data) // 디버깅용

      let generatedQuestion = data.answer || ''

      // JSON에서 question 부분만 파싱해서 추출
      try {
        const parsedData = JSON.parse(generatedQuestion)
        if (parsedData.question) {
          generatedQuestion = parsedData.question
        }
      } catch (e) {
        console.log('JSON 파싱 실패, 전체 텍스트 사용')
      }

      interviewQuestions[0] = generatedQuestion
      currentQuestionIndex = 0
      showCurrentQuestion()
      isInterviewStarted = true
    } else {
      throw new Error('첫 번째 질문 생성 실패')
    }
  } catch (error) {
    console.error('첫 번째 질문 생성 오류:', error)

    // 오류 시 기본 메시지 표시
    const questionText = document.getElementById('questionText')
    if (questionText)
      questionText.textContent = '질문 생성에 실패했습니다. 다시 시도해주세요.'
  }
}

/* ========= 현재 질문 표시 ========= */
function showCurrentQuestion() {
  const idxEl = document.getElementById('currentQuestion')
  const qTextEl = document.getElementById('questionText')

  if (idxEl) idxEl.textContent = currentQuestionIndex + 1
  if (qTextEl) {
    qTextEl.textContent =
      interviewQuestions[currentQuestionIndex] || '질문을 불러오는 중...'
  }

  updateQuestionStatus()
}

/* ========= 질문 상태바 렌더/업데이트 ========= */
function renderQuestionStatus() {
  const wrap = document.getElementById('qStatusBar')
  if (!wrap) return

  // 세그먼트 개수는 5개로 고정 (요청사항)
  wrap.querySelectorAll('.seg').forEach((seg) => {
    seg.classList.remove('done', 'current')
  })

  updateQuestionStatus()
}

function updateQuestionStatus() {
  const wrap = document.getElementById('qStatusBar')
  if (!wrap) return

  const total = 5 // 고정
  const now = Math.min(currentQuestionIndex, total - 1)
  const segs = wrap.querySelectorAll('.seg')

  segs.forEach((seg, i) => {
    seg.classList.remove('done', 'current')
    if (i < now) seg.classList.add('done')
    if (i === now) seg.classList.add('current')
  })
}

/* ========= 다음 질문 ========= */
async function nextQuestion() {
  if (isRecording) toggleRecording() // 녹음 중이면 중지

  // 버튼 비활성화 및 로딩 상태
  const nextBtn = document.getElementById('nextQuestionBtn')
  const originalText = nextBtn?.textContent || '다음 질문'
  if (nextBtn) {
    nextBtn.disabled = true
    nextBtn.textContent = '생성 중...'
  }

  try {
    // 현재 답변 저장 (재시도가 아닌 경우에만)
    const currentAnswer =
      document.getElementById('realtimeTranscript')?.textContent || ''

    // 이미 답변이 저장된 경우가 아니라면 저장
    if (interviewAnswers.length <= currentQuestionIndex) {
      interviewAnswers.push({
        question: interviewQuestions[currentQuestionIndex],
        answer: currentAnswer,
        timestamp: new Date(),
      })

      currentQuestionIndex++
    }

    // 5번째 질문 완료 시 최종 피드백 생성
    if (currentQuestionIndex >= 5) {
      await generateFinalFeedback()
      return
    }

    // 다음 질문 생성
    const questionText = document.getElementById('questionText')
    if (questionText) questionText.textContent = '다음 질문을 생성하는 중...'

    // 면접 컨텍스트 구성
    const jobData = JSON.parse(localStorage.getItem('selectedJob') || '{}')
    const userData = {
      name: interviewData?.name || '지원자',
      company: jobData.job?.company || interviewData?.company || '회사',
      position: jobData.job?.title || interviewData?.position || '직무',
    }

    // 이전 질문과 답변들을 컨텍스트로 포함
    let conversationHistory = ''
    interviewAnswers.forEach((qa, index) => {
      conversationHistory += `질문 ${index + 1}: ${qa.question}\n답변: ${
        qa.answer
      }\n\n`
    })

    const questionTypes = [
      '지원 동기',
      '직무 역량/경험',
      '문제해결/갈등상황',
      '장래/성장 포부',
    ]
    const currentType = questionTypes[currentQuestionIndex - 1] || '추가 질문'

    const prompt = `지금까지의 면접 내용:
${conversationHistory}

지원자 정보: ${JSON.stringify(userData, null, 2)}

위 답변을 바탕으로 ${
      currentQuestionIndex + 1
    }번째 질문(${currentType})을 생성해주세요.`

    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        system_prompt: `역할: 전문 채용 면접관 (한국어, 존댓말)

진행 규칙:
1) 전체 질문 수는 정확히 5개입니다.
2) 한 번에 한 질문만 제시합니다.
3) 지원자의 답변을 받은 뒤에만 다음 질문을 생성합니다.
4) 받은 JSON 정보를 바탕으로 개인화된 질문을 만들어주세요.
5) 질문 순서는 반드시 다음과 같이 진행됩니다:
   - JSON 정보 수신 후 → index:1 (자기소개)
   - 첫 번째 답변 후 → index:2 (지원 동기)
   - 두 번째 답변 후 → index:3 (직무 역량/경험)
   - 세 번째 답변 후 → index:4 (문제해결/갈등상황)
   - 네 번째 답변 후 → index:5 (장래/성장 포부)
   - 다섯 번째 답변 후 → index:6 (종합 피드백)
6) 답변이 짧거나 모호하면 "조금 더 구체적으로 말씀해 주실 수 있을까요?"라는 문구를 덧붙입니다.
7) 모든 출력은 한국어 존댓말, 간결하고 또렷하게. 내부 사고과정/노트는 절대 노출하지 않습니다.

출력 포맷 (반드시 준수):
{"type":"question","index":${
          currentQuestionIndex + 1
        },"end":false,"question":"질문내용"}

이전 답변을 바탕으로 개인화된 질문을 만들어주세요.`,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('다음 질문 OpenRouter 응답:', data) // 디버깅용

      let generatedQuestion = data.answer || ''

      // JSON에서 question 부분만 파싱해서 추출
      try {
        const parsedData = JSON.parse(generatedQuestion)
        if (parsedData.question) {
          generatedQuestion = parsedData.question
        }
      } catch (e) {
        console.log('JSON 파싱 실패, 전체 텍스트 사용')
      }

      interviewQuestions[currentQuestionIndex] = generatedQuestion
      showCurrentQuestion()

      // STT 영역 초기화
      const transcriptBox = document.getElementById('realtimeTranscript')
      if (transcriptBox) transcriptBox.textContent = ''
    } else {
      throw new Error('질문 생성 실패')
    }
  } catch (error) {
    console.error('질문 생성 오류:', error)

    // 오류 시 질문 생성 실패 메시지 표시
    const questionText = document.getElementById('questionText')
    if (questionText) {
      questionText.textContent =
        "질문 생성에 실패했습니다. '다음 질문' 버튼을 다시 눌러주세요."
    }

    // 인덱스를 다시 되돌림 (재시도 가능하도록)
    currentQuestionIndex--
    updateQuestionStatus()
  } finally {
    // 버튼 상태 복구
    if (nextBtn) {
      nextBtn.disabled = false
      nextBtn.textContent = originalText
    }
  }
}

/* ========= 최종 피드백 생성 ========= */
async function generateFinalFeedback() {
  try {
    const questionText = document.getElementById('questionText')
    if (questionText) questionText.textContent = '최종 피드백을 생성하는 중...'

    // 전체 면접 내용 구성
    let fullConversation = ''
    interviewAnswers.forEach((qa, index) => {
      fullConversation += `질문 ${index + 1}: ${qa.question}\n답변: ${
        qa.answer
      }\n\n`
    })

    const jobData = JSON.parse(localStorage.getItem('selectedJob') || '{}')
    const userData = {
      name: interviewData?.name || '지원자',
      company: jobData.job?.company || interviewData?.company || '회사',
      position: jobData.job?.title || interviewData?.position || '직무',
    }

    const prompt = `전체 면접 내용:
${fullConversation}

지원자 정보: ${JSON.stringify(userData, null, 2)}

위 면접 내용을 바탕으로 종합적인 피드백을 생성해주세요.`

    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        system_prompt: `역할: 전문 채용 면접관 (한국어, 존댓말)

진행 규칙:
1) 전체 질문 수는 정확히 5개입니다.
2) 한 번에 한 질문만 제시합니다.
3) 지원자의 답변을 받은 뒤에만 다음 질문을 생성합니다.
4) 받은 JSON 정보를 바탕으로 개인화된 질문을 만들어주세요.
5) 질문 순서는 반드시 다음과 같이 진행됩니다:
   - JSON 정보 수신 후 → index:1 (자기소개)
   - 첫 번째 답변 후 → index:2 (지원 동기)
   - 두 번째 답변 후 → index:3 (직무 역량/경험)
   - 세 번째 답변 후 → index:4 (문제해결/갈등상황)
   - 네 번째 답변 후 → index:5 (장래/성장 포부)
   - 다섯 번째 답변 후 → index:6 (종합 피드백)
6) 답변이 짧거나 모호하면 "조금 더 구체적으로 말씀해 주실 수 있을까요?"라는 문구를 덧붙입니다.
7) 종합 피드백(index:6)은 반드시 JSON 형식으로 구조화:
   {"type":"feedback","index":6,"end":true,"strengths":"지원자의 주요 강점 (1-2줄)","improvements":"보완이 필요한 부분 (1-2줄)","suggestions":"구체적인 개선 방안이나 조언 (1-2줄)"}
8) 모든 출력은 한국어 존댓말, 간결하고 또렷하게. 내부 사고과정/노트는 절대 노출하지 않습니다.

출력 포맷 (반드시 준수):
{"type":"feedback","index":6,"end":true,"strengths":"강점내용","improvements":"개선점내용","suggestions":"제안내용"}

모든 답변을 종합적으로 분석하여 피드백을 생성해주세요.`,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('최종 피드백 OpenRouter 응답:', data) // 디버깅용

      let feedbackText = data.answer || ''

      // 피드백을 콘솔에 출력
      console.log('=== 최종 면접 피드백 ===')
      console.log(feedbackText)
      console.log('========================')

      // JSON에서 피드백 구조화된 부분 파싱 시도
      let feedbackData = feedbackText
      try {
        const parsedFeedback = JSON.parse(feedbackText)
        if (parsedFeedback.type === 'feedback') {
          feedbackData = parsedFeedback
        }
      } catch (e) {
        console.log('피드백 JSON 파싱 실패, 텍스트 그대로 사용')
      }

      // OpenRouter 응답을 그대로 피드백으로 사용
      // 영상 분석 점수 가져오기
      let cameraScores = { direction: 80, gaze: 75, smile: 90, overall: 82 } // 기본값
      if (typeof window.getCameraAnalysisScores === 'function') {
        cameraScores = window.getCameraAnalysisScores()
        console.log('카메라 분석 점수:', cameraScores)
      }

      const finalResult = {
        interviewData: interviewData,
        answers: interviewAnswers,
        feedback: feedbackData, // 파싱된 데이터 또는 원본 텍스트
        overallScore: cameraScores.overall,
        detailFeedback: {
          direction: cameraScores.direction,
          eye: cameraScores.gaze,
          smile: cameraScores.smile,
        },
        postureFeedback: generatePostureFeedback(cameraScores),
        duration: Math.floor((new Date() - interviewStartTime) / 1000),
        timestamp: new Date(),
      }

      localStorage.setItem('interviewResult', JSON.stringify(finalResult))

      // 타이머 정지
      if (interviewTimer) clearInterval(interviewTimer)

      // result 페이지로 이동
      window.location.href = '/result'
    } else {
      throw new Error('피드백 생성 실패')
    }
  } catch (error) {
    console.error('피드백 생성 오류:', error)

    // 오류 시 기본 피드백으로 처리
    // 영상 분석 점수 가져오기 (오류 상황에서도)
    let cameraScores = { direction: 70, gaze: 65, smile: 75, overall: 70 } // 기본값
    if (typeof window.getCameraAnalysisScores === 'function') {
      cameraScores = window.getCameraAnalysisScores()
    }

    const basicResult = {
      interviewData: interviewData,
      answers: interviewAnswers,
      feedback: {
        type: 'feedback',
        index: 6,
        end: true,
        strengths: '면접에 참여해주셔서 감사합니다.',
        improvements: '보다 많은 경험과 학습이 필요합니다.',
        suggestions: '지속적인 성장을 위해 노력해주세요.',
      },
      overallScore: cameraScores.overall,
      detailFeedback: {
        direction: cameraScores.direction,
        eye: cameraScores.gaze,
        smile: cameraScores.smile,
      },
      postureFeedback: generatePostureFeedback(cameraScores),
      duration: Math.floor((new Date() - interviewStartTime) / 1000),
      timestamp: new Date(),
    }

    localStorage.setItem('interviewResult', JSON.stringify(basicResult))

    if (interviewTimer) clearInterval(interviewTimer)
    window.location.href = '/result'
  }
}

/* ========= 마이크 권한 요청 ========= */
async function requestMicStream() {
  const isSecure =
    location.protocol === 'https:' || location.hostname === 'localhost'
  if (!isSecure) {
    console.warn(
      'getUserMedia는 HTTPS/localhost에서만 권한 팝업이 정상 동작합니다.'
    )
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return stream
  } catch (err) {
    console.error('마이크 권한 거부 또는 오류:', err)
    alert(
      "마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 '허용'으로 변경하세요."
    )
    return null
  }
}

/* ========= 녹음 토글 (버튼 클릭) ========= */
async function toggleRecording() {
  const btn = document.getElementById('recordButton')
  const recDot = document.getElementById('recDot')

  // ---- 정지 ----
  if (isRecording) {
    try {
      mediaRecorder && mediaRecorder.stop()
    } catch {}
    isRecording = false
    if (btn) {
      btn.classList.remove('btn-success')
      btn.classList.add('btn-danger')
      btn.textContent = '음성 답변'
    }
    recDot && recDot.classList.remove('active')
    return
  }

  // ---- 시작 ----
  const micStream = await requestMicStream()
  if (!micStream) return

  recordedChunks = []
  mediaRecorder = new MediaRecorder(micStream, { mimeType: 'audio/webm' })

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    micStream.getTracks().forEach((t) => t.stop())
    const blob = new Blob(recordedChunks, { type: 'audio/webm' })
    const fd = new FormData()
    fd.append('audio', blob, 'answer.webm')

    const sttBox = document.getElementById('realtimeTranscript')
    if (sttBox) sttBox.textContent = '분석 중…'

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (sttBox) sttBox.textContent = data.text || '분석 결과가 없습니다.'
    } catch (e) {
      console.error(e)
      if (sttBox) sttBox.textContent = '분석 실패'
    }
  }

  mediaRecorder.start()
  isRecording = true
  if (btn) {
    btn.classList.remove('btn-danger')
    btn.classList.add('btn-success')
    btn.textContent = '녹음 중지'
  }
  recDot && recDot.classList.add('active')
}

/* ========= 타이머 ========= */
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

/* ========= 초기화 ========= */
async function initializeInterview() {
  if (!interviewData) return

  // 화면에 회사명, 직무명 표시
  document.getElementById('interviewCompany').textContent =
    interviewData.company || '회사명'
  document.getElementById('interviewPosition').textContent =
    interviewData.position || '직무명'

  // 총 질문 수 설정 (5개 고정)
  const totalEl = document.getElementById('totalQuestions')
  if (totalEl) totalEl.textContent = 5

  // 상태바 초기화
  renderQuestionStatus()

  // 타이머 시작
  startInterviewTimer()

  // 첫 번째 질문 생성
  await generateFirstQuestion()
}

/* ========= 페이지 로드시 ========= */
document.addEventListener('DOMContentLoaded', function () {
  // 면접 데이터 로드
  const data = localStorage.getItem('interviewData')
  if (data) {
    interviewData = JSON.parse(data)
    initializeInterview()
  } else {
    alert('면접 정보를 찾을 수 없습니다.')
    window.location.href = '/'
  }

  // 녹음 버튼 연결
  document
    .getElementById('recordButton')
    ?.addEventListener('click', toggleRecording)
})

/* ========= 자세 피드백 생성 함수 ========= */
function generatePostureFeedback(scores) {
  const feedback = {}

  // 방향 피드백
  if (scores.direction >= 90) {
    feedback.direction =
      '카메라를 정면으로 바라보는 자세가 매우 안정적이었습니다.'
  } else if (scores.direction >= 70) {
    feedback.direction =
      '대체로 좋은 자세를 유지했습니다. 조금 더 정면을 향해 앉으시면 더욱 좋겠습니다.'
  } else if (scores.direction >= 50) {
    feedback.direction =
      '면접 중 자세가 약간 기울어지는 경향이 있었습니다. 정면을 바라보도록 의식해보세요.'
  } else {
    feedback.direction =
      '카메라를 정면으로 바라보는 연습이 필요합니다. 면접 전 자세를 미리 확인해보세요.'
  }

  // 시선 피드백 (eye = gaze)
  if (scores.gaze >= 90) {
    feedback.eye =
      '시선 처리가 완벽했습니다. 카메라를 안정적으로 응시하여 신뢰감을 주었습니다.'
  } else if (scores.gaze >= 70) {
    feedback.eye =
      '시선 처리가 양호했습니다. 가끔 시선이 흔들렸지만 전반적으로 좋았습니다.'
  } else if (scores.gaze >= 50) {
    feedback.eye =
      '시선이 자주 흔들리는 경향이 있었습니다. 카메라 렌즈를 집중해서 바라보는 연습을 해보세요.'
  } else {
    feedback.eye =
      '시선 처리에 많은 개선이 필요합니다. 면접관의 눈을 보듯 카메라를 직시하는 연습을 하세요.'
  }

  // 미소 피드백
  if (scores.smile >= 80) {
    feedback.smile =
      '자연스럽고 적절한 표정을 잘 유지했습니다. 긍정적인 인상을 주었습니다.'
  } else if (scores.smile >= 60) {
    feedback.smile =
      '표정이 대체로 자연스러웠습니다. 조금 더 밝은 표정을 지으면 더욱 좋겠습니다.'
  } else if (scores.smile >= 40) {
    feedback.smile =
      '표정이 다소 경직된 편이었습니다. 면접 전 거울을 보며 자연스러운 미소를 연습해보세요.'
  } else {
    feedback.smile =
      '표정 관리에 신경을 써주세요. 자연스러운 미소와 밝은 표정으로 좋은 인상을 만들어보세요.'
  }

  return feedback
}
