// 개인정보 입력 페이지 JavaScript

// 뒤로가기
function goBack() {
  window.location.href = '/'
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

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// 폼 제출 처리
function handleFormSubmit(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const profileData = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    education: formData.get('education'),
    experience: formData.get('experience'),
    resume: formData.get('resume') ? formData.get('resume').name : null,
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem('profileData', JSON.stringify(profileData))
  showToast('개인정보가 저장되었습니다.', 'success')

  setTimeout(() => {
    goBack()
  }, 1500)
}

// 프로필 데이터 로드
function loadProfileData() {
  const savedData = localStorage.getItem('profileData')
  if (savedData) {
    const data = JSON.parse(savedData)
    document.getElementById('name').value = data.name || ''
    document.getElementById('email').value = data.email || ''
    document.getElementById('phone').value = data.phone || ''
    document.getElementById('education').value = data.education || ''
    document.getElementById('experience').value = data.experience || ''
  }
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
  loadProfileData()
  document
    .getElementById('profileForm')
    .addEventListener('submit', handleFormSubmit)
})
