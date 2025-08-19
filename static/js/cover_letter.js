// 자기소개서 작성 페이지 JavaScript

let selectedJob = null

// 뒤로가기
function goBack() {
  window.location.href = '/job-detail'
}

// 글자 수 업데이트
function updateCharCount() {
  const textarea = document.getElementById('coverLetter')
  const charCount = document.getElementById('charCount')
  charCount.textContent = textarea.value.length

  // 1000자 제한
  if (textarea.value.length > 1000) {
    textarea.value = textarea.value.substring(0, 1000)
    charCount.textContent = 1000
  }
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 ${
    type === 'success'
      ? 'bg-green-600 text-white'
      : type === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-gray-600 text-white'
  }`
  toast.textContent = message

  document.body.appendChild(toast)

  // 애니메이션
  toast.style.animation = 'slideUp 0.3s ease'

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// 자기소개서 임시저장
function saveCoverLetter() {
  const coverLetter = document.getElementById('coverLetter').value
  const portfolio = document.getElementById('portfolio').files[0]

  const coverLetterData = {
    coverLetter: coverLetter,
    portfolio: portfolio ? portfolio.name : null,
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem('coverLetterData', JSON.stringify(coverLetterData))
  showToast('자기소개서가 임시저장되었습니다.', 'success')
}

// 폼 제출 처리
function handleFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const coverLetterData = {
    coverLetter: formData.get('coverLetter'),
    portfolio: formData.get('portfolio') || null,
  }

  // 면접 데이터 설정
  const interviewData = {
    position: selectedJob.title,
    company: selectedJob.company,
    jobDescription: selectedJob.description,
    resume: null, // 프로필에서 가져올 수 있음
    coverLetter: coverLetterData.coverLetter,
    portfolio: coverLetterData.portfolio,
    startTime: new Date(),
    answers: [],
    duration: 0,
  }

  localStorage.setItem('interviewData', JSON.stringify(interviewData))
  localStorage.setItem('coverLetterData', JSON.stringify(coverLetterData))

  window.location.href = '/interview'
}

// 자기소개서 초기화
function initializeCoverLetter() {
  if (!selectedJob) return

  document.getElementById('selectedJobTitle').textContent = selectedJob.title

  // 기존 데이터가 있으면 채우기
  const savedData = localStorage.getItem('coverLetterData')
  if (savedData) {
    const data = JSON.parse(savedData)
    document.getElementById('coverLetter').value = data.coverLetter || ''
    updateCharCount()
  }
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
  const jobData = localStorage.getItem('selectedJob')
  if (jobData) {
    selectedJob = JSON.parse(jobData)
    initializeCoverLetter()
  } else {
    alert('공고 정보를 찾을 수 없습니다.')
    window.location.href = '/job-list'
  }

  document
    .getElementById('coverLetterForm')
    .addEventListener('submit', handleFormSubmit)

  // CSS 애니메이션 추가
  const style = document.createElement('style')
  style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `
  document.head.appendChild(style)
})
