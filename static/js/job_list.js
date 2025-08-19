// 채용공고 목록 페이지 JavaScript

// 필터 상태
let filters = {
  search: '',
  category: 'all',
  city: 'all',
  district: 'all',
  sort: 'latest',
}

// 뒤로가기
function goBack() {
  window.location.href = '/'
}

// 필터 토글
function toggleFilter() {
  const filterSection = document.getElementById('filterSection')
  filterSection.classList.toggle('hidden')
}

// 지역 선택 드롭다운 초기화
function initializeLocationSelect() {
  const citySelect = document.getElementById('cityFilter')
  Object.keys(LOCATION_DATA).forEach((city) => {
    const option = document.createElement('option')
    option.value = city
    option.textContent = city
    citySelect.appendChild(option)
  })

  citySelect.addEventListener('change', function () {
    const districtSelect = document.getElementById('districtFilter')
    const selectedCity = this.value

    districtSelect.innerHTML = '<option value="all">구/군 선택</option>'

    if (selectedCity && selectedCity !== 'all') {
      LOCATION_DATA[selectedCity].forEach((district) => {
        const option = document.createElement('option')
        option.value = district
        option.textContent = district
        districtSelect.appendChild(option)
      })
      districtSelect.style.display = 'block'
    } else {
      districtSelect.style.display = 'none'
    }

    filters.city = selectedCity
    filters.district = 'all'
    applyFilters()
  })

  document
    .getElementById('districtFilter')
    .addEventListener('change', function () {
      filters.district = this.value
      applyFilters()
    })

  document
    .getElementById('categoryFilter')
    .addEventListener('change', function () {
      filters.category = this.value
      applyFilters()
    })

  document.getElementById('sortFilter').addEventListener('change', function () {
    filters.sort = this.value
    applyFilters()
  })
}

// 필터링된 공고 가져오기
function getFilteredJobs() {
  let filtered = DUMMY_JOBS.filter((job) => {
    const searchMatch =
      !filters.search ||
      job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      job.company.toLowerCase().includes(filters.search.toLowerCase())

    const categoryMatch =
      filters.category === 'all' || job.category === filters.category

    const locationMatch =
      filters.city === 'all' ||
      (job.city === filters.city &&
        (filters.district === 'all' || job.district === filters.district))

    return searchMatch && categoryMatch && locationMatch
  })

  filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'company':
        return a.company.localeCompare(b.company)
      case 'deadline':
        return a.deadline.localeCompare(b.deadline)
      case 'latest':
      default:
        return b.id - a.id
    }
  })

  return filtered
}

// 공고 카드 생성
function createJobCard(job) {
  const card = document.createElement('div')
  card.className =
    'bg-card border border-border rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow'
  card.addEventListener('click', () => selectJob(job))

  card.innerHTML = `
        <h3 class="font-semibold mb-2">${job.title}</h3>
        <p class="text-sm text-muted-foreground mb-3">${job.company} · ${
    job.location
  } · ${job.experience}</p>
        <div class="flex flex-wrap gap-2 mb-3">
            ${job.tags
              .map(
                (tag) =>
                  `<span class="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">${tag}</span>`
              )
              .join('')}
        </div>
        <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">${job.deadline}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        </div>
    `

  return card
}

// 공고 선택
function selectJob(job) {
  localStorage.setItem('selectedJob', JSON.stringify(job))
  window.location.href = '/job-detail'
}

// 공고 목록 렌더링
function renderJobList() {
  const jobList = document.getElementById('jobList')
  const filteredJobs = getFilteredJobs()

  document.getElementById('jobCount').textContent = filteredJobs.length

  jobList.innerHTML = ''
  filteredJobs.forEach((job) => {
    const jobCard = createJobCard(job)
    jobList.appendChild(jobCard)
  })

  updateActiveFilters()
}

// 활성 필터 업데이트
function updateActiveFilters() {
  const activeFiltersContainer = document.getElementById('activeFilters')
  const activeFilters = []

  if (filters.category !== 'all') {
    activeFilters.push(`직무: ${filters.category}`)
  }

  if (filters.city !== 'all') {
    const locationText =
      filters.district !== 'all'
        ? `${filters.city} ${filters.district}`
        : filters.city
    activeFilters.push(`지역: ${locationText}`)
  }

  if (filters.search) {
    activeFilters.push(`검색: ${filters.search}`)
  }

  activeFiltersContainer.innerHTML = activeFilters
    .map(
      (filter) =>
        `<span class="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">${filter}</span>`
    )
    .join('')
}

// 필터 적용
function applyFilters() {
  filters.search = document.getElementById('searchInput').value
  renderJobList()
}

// 모든 필터 초기화
function clearAllFilters() {
  filters = {
    search: '',
    category: 'all',
    city: 'all',
    district: 'all',
    sort: 'latest',
  }

  document.getElementById('searchInput').value = ''
  document.getElementById('categoryFilter').value = 'all'
  document.getElementById('cityFilter').value = 'all'
  document.getElementById('districtFilter').value = 'all'
  document.getElementById('districtFilter').style.display = 'none'
  document.getElementById('sortFilter').value = 'latest'

  renderJobList()
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
  initializeLocationSelect()
  renderJobList()
})
