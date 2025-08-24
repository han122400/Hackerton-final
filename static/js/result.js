let interviewResult = null

// 텍스트에서 강점/개선점/제안 추출하는 함수
function extractFeedbackFromText(text) {
  const result = {
    strengths: [],
    improvements: [],
    suggestions: [],
  }

  try {
    // 강점 추출
    const strengthMatch = text.match(/강점[:\s]*([^개선점제안]*)/i)
    if (strengthMatch) {
      result.strengths = [strengthMatch[1].trim()]
    }

    // 개선점 추출
    const improvementMatch = text.match(/개선[점:]?[:\s]*([^강점제안]*)/i)
    if (improvementMatch) {
      result.improvements = [improvementMatch[1].trim()]
    }

    // 제안 추출
    const suggestionMatch = text.match(/제안[:\s]*([^강점개선]*)/i)
    if (suggestionMatch) {
      result.suggestions = [suggestionMatch[1].trim()]
    }

    console.log('텍스트에서 추출된 피드백:', result)
  } catch (e) {
    console.error('텍스트 추출 오류:', e)
  }

  return result
}

function setTextByIds(ids, value) {
  const val = value ?? '-'
  ids.forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val
  })
}

function setScoreBar(score) {
  const bar = document.getElementById('scoreBar')
  if (bar) {
    const val = Math.max(0, Math.min(score ?? 0, 100))
    bar.style.width = val + '%'
    bar.setAttribute('aria-valuenow', val)
  }
}

function setVerticalBar(idFill, score) {
  const fillEl = document.getElementById(idFill)
  if (fillEl) {
    const max = 100
    const pct = Math.max(0, Math.min(score ?? 0, max))

    fillEl.style.height = pct + '%'

    // 매우 낮은 점수일 때는 텍스트 크기를 줄이거나 숨김
    if (pct <= 5) {
      fillEl.textContent = ''
      fillEl.style.fontSize = '0'
    } else if (pct <= 15) {
      fillEl.textContent = pct
      fillEl.style.fontSize = '0.6rem'
    } else {
      fillEl.textContent = pct
      fillEl.style.fontSize = '0.8rem'
    }
  }
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div')
  el.className =
    'fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50 ' +
    (type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white')
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2000)
}

function downloadResult() {
  const data = interviewResult || {
    time: new Date().toISOString(),
    note: 'no-data',
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview-result-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  showToast('결과가 저장되었습니다.', 'success')
}

function restartInterview() {
  location.href = '/user-input'
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // localStorage에서 면접 결과 가져오기
    const storedResult = localStorage.getItem('interviewResult')
    if (storedResult) {
      const parsedResult = JSON.parse(storedResult)
      console.log('저장된 면접 결과:', parsedResult)

      // OpenRouter 피드백 파싱
      let openRouterFeedback = null
      if (parsedResult.feedback) {
        console.log('원본 피드백 데이터:', parsedResult.feedback)
        console.log('피드백 타입:', typeof parsedResult.feedback)

        try {
          // 피드백이 JSON 문자열인 경우 파싱
          if (typeof parsedResult.feedback === 'string') {
            openRouterFeedback = JSON.parse(parsedResult.feedback)
          } else {
            openRouterFeedback = parsedResult.feedback
          }
          console.log('파싱된 OpenRouter 피드백:', openRouterFeedback)
        } catch (e) {
          console.log('JSON 파싱 실패, 텍스트에서 피드백 추출 시도')
          console.log('파싱 오류:', e)
          // 텍스트에서 강점/개선점/제안 추출
          const feedbackText = parsedResult.feedback
          openRouterFeedback = extractFeedbackFromText(feedbackText)
        }
      }

      // 기본 구조로 데이터 설정
      console.log('최종 openRouterFeedback:', openRouterFeedback)

      const feedbackData = {
        strengths: [],
        improvements: [],
        suggestions: [],
      }

      if (openRouterFeedback) {
        // 다양한 키 형태 지원
        const getArrayFromValue = (value) => {
          if (!value) return []
          if (Array.isArray(value)) return value
          if (typeof value === 'string') return [value]
          return []
        }

        feedbackData.strengths = getArrayFromValue(
          openRouterFeedback.strengths || openRouterFeedback.강점
        )
        feedbackData.improvements = getArrayFromValue(
          openRouterFeedback.improvements || openRouterFeedback.개선점
        )
        feedbackData.suggestions = getArrayFromValue(
          openRouterFeedback.suggestions || openRouterFeedback.제안
        )
      }

      // 빈 배열이면 기본값 설정
      if (feedbackData.strengths.length === 0)
        feedbackData.strengths = [
          '구체적인 예시를 들어 설명해주셔서 이해하기 쉬웠습니다.',
        ]
      if (feedbackData.improvements.length === 0)
        feedbackData.improvements = ['답변의 구조를 더 명확하게 정리해보세요.']
      if (feedbackData.suggestions.length === 0)
        feedbackData.suggestions = ['STAR 기법을 활용해 답변을 구조화해보세요.']

      console.log('최종 feedbackData:', feedbackData)

      // 실제 저장된 점수 사용, 없으면 기본값
      const savedOverallScore = parsedResult.overallScore || 85
      const savedDetailFeedback = parsedResult.detailFeedback || {
        direction: 80,
        eye: 75,
        smile: 90,
      }
      const savedPostureFeedback = parsedResult.postureFeedback || {
        direction: '자세가 안정적이었습니다',
        eye: '시선 처리가 좋았습니다',
        smile: '적절한 표정을 유지했습니다',
      }

      interviewResult = {
        overallScore: savedOverallScore,
        detailFeedback: savedDetailFeedback,
        feedback: feedbackData,
        postureFeedback: savedPostureFeedback,
      }
    } else {
      // localStorage에 데이터가 없으면 API 호출
      const resp = await fetch('/api/result')
      const data = await resp.json()
      if (!data.ok) throw new Error('API 오류')
      interviewResult = data
    }
  } catch (e) {
    console.error('결과 로드 오류:', e)
    showToast('면접 결과를 불러올 수 없습니다.', 'error')
    interviewResult = {
      overallScore: '-',
      detailFeedback: { direction: 0, eye: 0, smile: 0 },
      feedback: { strengths: [], improvements: [], suggestions: [] },
      postureFeedback: { direction: '-', eye: '-', smile: '-' },
    }
  }

  // 총점
  setTextByIds(['scoreValue'], interviewResult.overallScore)

  // 총점 그래프 (가로)
  setScoreBar(interviewResult.overallScore)

  // 그래프
  const df = interviewResult.detailFeedback || {}
  setVerticalBar('directionFill', df.direction)
  setVerticalBar('eyeFill', df.eye)
  setVerticalBar('smileFill', df.smile)

  // 자세 피드백 텍스트 (방향/시선/미소)
  const pf = interviewResult.postureFeedback || {}
  let pfHtml = ''
  ;[
    { label: '방향', key: 'direction' },
    { label: '시선', key: 'eye' },
    { label: '미소', key: 'smile' },
  ].forEach(({ label, key }) => {
    pfHtml += `<div class="feedback-section"><strong>${label}</strong>: ${
      pf[key] || '-'
    }</div>`
  })
  document.getElementById('detailFeedbackText').innerHTML = pfHtml

  // 상세 피드백 (강점 / 개선점 / 제안)
  const fb = interviewResult.feedback || {}
  const strengths = (fb.strengths || []).map((t) => `<li>${t}</li>`).join('')
  const improvements = (fb.improvements || [])
    .map((t) => `<li>${t}</li>`)
    .join('')
  const suggestions = (fb.suggestions || [])
    .map((t) => `<li>${t}</li>`)
    .join('')

  document.getElementById('feedbackContent').innerHTML = `
    <div class="feedback-section"><strong>강점</strong><ul>${
      strengths || '<li>-</li>'
    }</ul></div>
    <div class="feedback-section"><strong>개선점</strong><ul>${
      improvements || '<li>-</li>'
    }</ul></div>
    <div class="feedback-section"><strong>제안</strong><ul>${
      suggestions || '<li>-</li>'
    }</ul></div>
  `
})
