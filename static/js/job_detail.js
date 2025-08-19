// 채용공고 상세 페이지 JavaScript

let selectedJob = null

// 뒤로가기
function goBack() {
  window.location.href = '/job-list'
}

// 마크다운 파서
function parseMarkdown(markdown) {
  return markdown
    .replace(
      /^# (.*$)/gim,
      '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>'
    )
    .replace(
      /^## (.*$)/gim,
      '<h4 class="text-base font-semibold mt-3 mb-2">$1</h4>'
    )
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(
      /(<li.*<\/li>)/gims,
      '<ul class="list-disc space-y-1 mb-3">$1</ul>'
    )
    .replace(/\n\n/gim, '</p><p class="mb-3">')
    .replace(/\n/gim, '<br>')
}

// 공고 상세 렌더링
function renderJobDetail() {
  if (!selectedJob) return

  document.getElementById('jobTitle').textContent = selectedJob.title
  document.getElementById('companyName').textContent = selectedJob.company
  document.getElementById('companyLogo').textContent =
    selectedJob.company.charAt(0)
  document.getElementById('jobLocation').textContent = selectedJob.location
  document.getElementById('jobExperience').textContent = selectedJob.experience
  document.getElementById('jobDeadline').textContent = selectedJob.deadline

  // 태그 렌더링
  const jobTags = document.getElementById('jobTags')
  jobTags.innerHTML = selectedJob.tags
    .map(
      (tag) =>
        `<span class="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">${tag}</span>`
    )
    .join('')

  // 상세 설명 렌더링
  const jobDescription = document.getElementById('jobDescriptionContent')
  const parsedDescription = parseMarkdown(selectedJob.description)
  jobDescription.innerHTML = `<p class="mb-3">${parsedDescription}</p>`
}

// 공고로 면접 시작
function startInterviewWithJob() {
  localStorage.setItem('selectedJob', JSON.stringify(selectedJob))
  window.location.href = '/cover-letter'
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
  const jobData = localStorage.getItem('selectedJob')
  if (jobData) {
    selectedJob = JSON.parse(jobData)
    renderJobDetail()
  } else {
    alert('공고 정보를 찾을 수 없습니다.')
    window.location.href = '/job-list'
  }
})
