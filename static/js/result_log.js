document.addEventListener('DOMContentLoaded', function () {
  const nameInput = document.getElementById('nameInput')
  const emailInput = document.getElementById('emailInput')
  const searchButton = document.getElementById('searchButton')
  const resetButton = document.getElementById('resetButton')
  const resultList = document.getElementById('resultList')
  const resultCount = document.getElementById('resultCount')
  const noResults = document.getElementById('noResults')

  // 검색 버튼 클릭 이벤트
  searchButton.addEventListener('click', searchResults)

  // 초기화 버튼 클릭 이벤트
  resetButton.addEventListener('click', resetSearch)

  // 엔터 키 검색
  nameInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchResults()
  })

  emailInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchResults()
  })

  // 검색 실행 함수
  async function searchResults() {
    const name = nameInput.value.trim()
    const email = emailInput.value.trim()

    if (!name && !email) {
      alert('이름 또는 이메일 중 하나는 입력해주세요.')
      return
    }

    try {
      // 로딩 상태 표시
      searchButton.disabled = true
      searchButton.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> 검색 중...'

      // API 호출
      const params = new URLSearchParams()
      if (email) params.append('email', email)
      if (name) params.append('name', name)

      const response = await fetch(`/api/result_load?${params}`)
      const data = await response.json()

      if (data.status === 'success') {
        displayResults(data.data)
      } else {
        throw new Error(data.message || '검색 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('검색 오류:', error)
      alert('검색 중 오류가 발생했습니다: ' + error.message)
      showNoResults()
    } finally {
      // 로딩 상태 해제
      searchButton.disabled = false
      searchButton.innerHTML = '<i class="bi bi-search"></i> 기록 검색'
    }
  }

  // 검색 결과 표시 함수
  function displayResults(results) {
    resultList.innerHTML = ''
    noResults.classList.add('d-none')

    if (results.length === 0) {
      showNoResults()
      return
    }

    resultCount.textContent = results.length

    results.forEach((result) => {
      const card = createResultCard(result)
      resultList.appendChild(card)
    })
  }

  // 결과 카드 생성 함수
  function createResultCard(result) {
    const cardDiv = document.createElement('div')
    cardDiv.className = 'col'

    const resultData = result.result
    const score = resultData.overallScore || 0
    const scoreClass = getScoreClass(score)

    // 날짜와 시간 모두 표시
    const dateTime = new Date(resultData.timestamp || result.created_at)
    const date = dateTime.toLocaleDateString('ko-KR')
    const time = dateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    // interviewData에서 정보 추출
    const interviewData = resultData.interviewData || {}
    const name = interviewData.name || result.email.split('@')[0] // 이메일에서 이름 추출
    const company = interviewData.company || '회사 정보 없음'
    const role = interviewData.role || '직무 정보 없음'

    // detailFeedback에서 세부 점수 추출
    const detailFeedback = resultData.detailFeedback || {}
    const direction = detailFeedback.direction || 0
    const eye = detailFeedback.eye || 0
    const smile = detailFeedback.smile || 0

    // 면접 시간 (초를 분으로 변환)
    const duration = resultData.duration || 0
    const durationMinutes = Math.floor(duration / 60)
    const durationSeconds = duration % 60

    cardDiv.innerHTML = `
            <div class="result-card" onclick="viewDetail('${result.id}')">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="flex-grow-1 min-w-0">
                            <h4 class="card-title line-clamp-1 mb-0 fw-bold">${company}</h4>
                        </div>
                        <div class="score-circle ${scoreClass}">
                            ${score}점
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <span class="badge badge-info-soft me-2">${role}</span>
                        <span class="badge text-primary border-primary me-2">${date} ${time}</span>
                        <span class="badge text-primary border-primary">${durationMinutes}분 ${durationSeconds}초</span>
                    </div>

                    <div class="row g-2 text-center mb-3">
                        <div class="col-4">
                            <div class="small text-muted">시선 처리</div>
                            <div class="fw-semibold">${eye}점</div>
                        </div>
                        <div class="col-4">
                            <div class="small text-muted">자세</div>
                            <div class="fw-semibold">${direction}점</div>
                        </div>
                        <div class="col-4">
                            <div class="small text-muted">표정</div>
                            <div class="fw-semibold">${smile}점</div>
                        </div>
                    </div>

                    <!-- 자세 피드백 전체 출력 -->
                    ${
                      resultData.postureFeedback
                        ? `
                    <div class="mb-3">
                        <div class="small text-muted mb-2"><strong>자세 피드백</strong></div>
                        <div class="small text-dark">
                            <div class="mb-1"><strong>방향:</strong> ${
                              resultData.postureFeedback.direction || '없음'
                            }</div>
                            <div class="mb-1"><strong>시선:</strong> ${
                              resultData.postureFeedback.eye || '없음'
                            }</div>
                            <div class="mb-1"><strong>표정:</strong> ${
                              resultData.postureFeedback.smile || '없음'
                            }</div>
                        </div>
                    </div>
                    `
                        : ''
                    }

                    <!-- 주요 피드백 전체 출력 -->
                    ${
                      resultData.feedback
                        ? `
                    <div class="border-top pt-3">
                        <div class="small text-muted mb-2"><strong>주요 피드백</strong></div>
                        <div class="small text-dark">
                            ${
                              resultData.feedback.strengths
                                ? `<div class="mb-2"><strong>강점:</strong> ${resultData.feedback.strengths}</div>`
                                : ''
                            }
                            ${
                              resultData.feedback.improvements
                                ? `<div class="mb-2"><strong>개선점:</strong> ${resultData.feedback.improvements}</div>`
                                : ''
                            }
                            ${
                              resultData.feedback.recommendation
                                ? `<div class="mb-2"><strong>추천사항:</strong> ${resultData.feedback.recommendation}</div>`
                                : ''
                            }
                        </div>
                    </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `

    return cardDiv
  }

  // 점수별 클래스 반환
  function getScoreClass(score) {
    if (score >= 90) return 'score-excellent'
    if (score >= 70) return 'score-good'
    if (score >= 50) return 'score-average'
    return 'score-poor'
  }

  // 결과 없음 표시
  function showNoResults() {
    resultList.innerHTML = ''
    noResults.classList.remove('d-none')
    resultCount.textContent = '0'
  }

  // 검색 초기화
  function resetSearch() {
    nameInput.value = ''
    emailInput.value = ''
    showNoResults()
  }

  // 상세 보기 (추후 구현)
  window.viewDetail = function (resultId) {
    // 상세 페이지로 이동하거나 모달 표시
    console.log('결과 ID:', resultId)
    // location.href = `/result-detail/${resultId}`;
  }
})
