// 전역 변수
let currentScreen = 'main';
let selectedJob = null;
let profileData = null;
let coverLetterData = null;
let interviewData = null;
let currentQuestionIndex = 0;
let interviewQuestions = [];
let interviewAnswers = [];
let interviewTimer = null;
let interviewStartTime = null;
let isRecording = false;

// 필터 상태
let filters = {
  search: '',
  category: 'all',
  city: 'all',
  district: 'all',
  sort: 'latest'
};

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// 앱 초기화
function initializeApp() {
  // 지역 선택 드롭다운 초기화
  initializeLocationSelect();
  
  // 이벤트 리스너 등록
  setupEventListeners();
  
  // 채용공고 목록 렌더링
  renderJobList();
  
  // 초기 화면 표시
  showScreen('main');
}

// 지역 선택 드롭다운 초기화
function initializeLocationSelect() {
  const citySelect = document.getElementById('cityFilter');
  if (citySelect) {
    // 시/도 옵션 추가
    Object.keys(LOCATION_DATA).forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
    
    // 시/도 변경 이벤트
    citySelect.addEventListener('change', function() {
      const districtSelect = document.getElementById('districtFilter');
      const selectedCity = this.value;
      
      // 구/군 초기화
      districtSelect.innerHTML = '<option value="all">구/군 선택</option>';
      
      if (selectedCity && selectedCity !== 'all') {
        // 구/군 옵션 추가
        LOCATION_DATA[selectedCity].forEach(district => {
          const option = document.createElement('option');
          option.value = district;
          option.textContent = district;
          districtSelect.appendChild(option);
        });
        districtSelect.style.display = 'block';
      } else {
        districtSelect.style.display = 'none';
      }
      
      // 필터 업데이트
      filters.city = selectedCity;
      filters.district = 'all';
      applyFilters();
    });
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 검색 입력
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filters.search = this.value;
      applyFilters();
    });
  }
  
  // 카테고리 필터
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function() {
      filters.category = this.value;
      applyFilters();
    });
  }
  
  // 정렬 필터
  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) {
    sortFilter.addEventListener('change', function() {
      filters.sort = this.value;
      applyFilters();
    });
  }
  
  // 구/군 필터
  const districtFilter = document.getElementById('districtFilter');
  if (districtFilter) {
    districtFilter.addEventListener('change', function() {
      filters.district = this.value;
      applyFilters();
    });
  }
  
  // 프로필 폼 제출
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
  }
  
  // 자기소개서 폼 제출
  const coverLetterForm = document.getElementById('coverLetterForm');
  if (coverLetterForm) {
    coverLetterForm.addEventListener('submit', handleCoverLetterSubmit);
  }
  
  // 입력 폼 제출
  const inputForm = document.getElementById('inputForm');
  if (inputForm) {
    inputForm.addEventListener('submit', handleInputSubmit);
  }
  
  // 자기소개서 글자 수 카운트
  const coverLetterTextarea = document.getElementById('coverLetter');
  if (coverLetterTextarea) {
    coverLetterTextarea.addEventListener('input', function() {
      const charCount = document.getElementById('charCount');
      if (charCount) {
        charCount.textContent = this.value.length;
      }
    });
  }
}

// 화면 전환
function showScreen(screenName) {
  // 모든 화면 숨기기
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  
  // 선택된 화면 보이기
  const targetScreen = document.getElementById(screenName + 'Screen');
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
  }
  
  // 네비게이션 업데이트
  updateNavigation(screenName);
  currentScreen = screenName;
  
  // 화면별 초기화 작업
  initializeScreen(screenName);
}

// 네비게이션 업데이트
function updateNavigation(screenName) {
  const backButton = document.getElementById('backButton');
  const navTitle = document.getElementById('navTitle');
  
  const titles = {
    'main': '면접 연습',
    'jobList': '채용공고',
    'jobDetail': '공고 상세',
    'profile': '개인정보 입력',
    'coverLetter': '자기소개서 작성',
    'userInput': '면접 정보 입력',
    'interview': '모의면접',
    'result': '면접 결과'
  };
  
  navTitle.textContent = titles[screenName] || '면접 연습';
  
  if (screenName === 'main') {
    backButton.style.display = 'none';
  } else {
    backButton.style.display = 'block';
  }
}

// 화면별 초기화
function initializeScreen(screenName) {
  switch (screenName) {
    case 'jobList':
      renderJobList();
      break;
    case 'jobDetail':
      renderJobDetail();
      break;
    case 'coverLetter':
      initializeCoverLetter();
      break;
    case 'interview':
      initializeInterview();
      break;
    case 'result':
      renderResult();
      break;
  }
}

// 메인 화면 액션
function startInterview() {
  showScreen('userInput');
}

function navigateToJobList() {
  showScreen('jobList');
}

function navigateToProfile() {
  showScreen('profile');
}

// 뒤로가기 처리
function goBack() {
  const backRoutes = {
    'userInput': 'main',
    'interview': selectedJob ? 'coverLetter' : 'userInput',
    'result': 'interview',
    'jobList': 'main',
    'jobDetail': 'jobList',
    'coverLetter': 'jobDetail',
    'profile': 'main'
  };
  
  const previousScreen = backRoutes[currentScreen] || 'main';
  showScreen(previousScreen);
}

// 뒤로가기 버튼 이벤트
document.getElementById('backButton').addEventListener('click', goBack);

// 채용공고 목록 렌더링
function renderJobList() {
  const jobList = document.getElementById('jobList');
  if (!jobList) return;
  
  // 필터링된 공고 가져오기
  const filteredJobs = getFilteredJobs();
  
  // 공고 개수 업데이트
  const jobCount = document.getElementById('jobCount');
  if (jobCount) {
    jobCount.textContent = filteredJobs.length;
  }
  
  // 공고 카드 생성
  jobList.innerHTML = '';
  filteredJobs.forEach(job => {
    const jobCard = createJobCard(job);
    jobList.appendChild(jobCard);
  });
  
  // 활성 필터 표시
  updateActiveFilters();
}

// 채용공고 카드 생성
function createJobCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card';
  card.addEventListener('click', () => selectJob(job));
  
  card.innerHTML = `
    <h3>${job.title}</h3>
    <p class="job-card-info">${job.company} · ${job.location} · ${job.experience}</p>
    <div class="job-tags">
      ${job.tags.map(tag => `<span class="job-tag">${tag}</span>`).join('')}
    </div>
    <div class="job-card-footer">
      <span class="job-deadline">${job.deadline}</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  `;
  
  return card;
}

// 채용공고 선택
function selectJob(job) {
  selectedJob = job;
  showScreen('jobDetail');
}

// 채용공고 상세 렌더링
function renderJobDetail() {
  if (!selectedJob) return;
  
  document.getElementById('jobTitle').textContent = selectedJob.title;
  document.getElementById('companyName').textContent = selectedJob.company;
  document.getElementById('companyInitial').textContent = selectedJob.company.charAt(0);
  document.getElementById('jobLocation').textContent = selectedJob.location;
  document.getElementById('jobExperience').textContent = selectedJob.experience;
  document.getElementById('jobDeadline').textContent = selectedJob.deadline;
  
  // 태그 렌더링
  const jobTags = document.getElementById('jobTags');
  jobTags.innerHTML = selectedJob.tags.map(tag => 
    `<span class="job-tag">${tag}</span>`
  ).join('');
  
  // 상세 설명 렌더링 (마크다운을 HTML로 변환)
  const jobDescription = document.getElementById('jobDescriptionContent');
  jobDescription.innerHTML = parseMarkdown(selectedJob.description);
}

// 간단한 마크다운 파서
function parseMarkdown(markdown) {
  return markdown
    .replace(/^# (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h4>$1</h4>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
    .replace(/\n/gim, '<br>');
}

// 채용공고로 면접 시작
function startInterviewWithJob() {
  showScreen('coverLetter');
}

// 자기소개서 초기화
function initializeCoverLetter() {
  if (!selectedJob) return;
  
  document.getElementById('selectedJobTitle').textContent = selectedJob.title;
  
  // 기존 데이터가 있으면 채우기
  if (coverLetterData) {
    document.getElementById('coverLetter').value = coverLetterData.coverLetter || '';
    updateCharCount();
  }
}

// 글자 수 업데이트
function updateCharCount() {
  const textarea = document.getElementById('coverLetter');
  const charCount = document.getElementById('charCount');
  if (textarea && charCount) {
    charCount.textContent = textarea.value.length;
  }
}

// 자기소개서 임시저장
function saveCoverLetter() {
  const formData = new FormData(document.getElementById('coverLetterForm'));
  coverLetterData = Object.fromEntries(formData);
  showToast('자기소개서가 임시저장되었습니다.', 'success');
}

// 프로필 폼 제출
function handleProfileSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  profileData = Object.fromEntries(formData);
  showToast('개인정보가 저장되었습니다.', 'success');
  goBack();
}

// 자기소개서 폼 제출
function handleCoverLetterSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  coverLetterData = Object.fromEntries(formData);
  
  // 면접 데이터 설정
  setInterviewData({
    position: selectedJob.title,
    company: selectedJob.company,
    jobDescription: selectedJob.description,
    resume: profileData?.resume || null,
    coverLetter: coverLetterData.coverLetter,
    portfolio: coverLetterData.portfolio || null
  });
  
  showScreen('interview');
}

// 입력 폼 제출
function handleInputSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  setInterviewData(data);
  showScreen('interview');
}

// 면접 데이터 설정
function setInterviewData(data) {
  interviewData = {
    ...data,
    startTime: new Date(),
    answers: [],
    duration: 0
  };
}

// 면접 초기화
function initializeInterview() {
  if (!interviewData) return;
  
  document.getElementById('interviewCompany').textContent = interviewData.company || '회사명';
  document.getElementById('interviewPosition').textContent = interviewData.position || '직무명';
  
  // 질문 생성
  generateInterviewQuestions();
  
  // 첫 번째 질문 표시
  currentQuestionIndex = 0;
  showCurrentQuestion();
  
  // 타이머 시작
  startInterviewTimer();
}

// 면접 질문 생성
function generateInterviewQuestions() {
  interviewQuestions = [];
  
  // 일반 질문 3개
  const generalQuestions = INTERVIEW_QUESTIONS.general
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  
  // 기술 질문 2개 (직무에 따라)
  const category = selectedJob?.category || '프론트엔드';
  const technicalQuestions = INTERVIEW_QUESTIONS.technical[category] || []
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  
  interviewQuestions = [...generalQuestions, ...technicalQuestions];
  document.getElementById('totalQuestions').textContent = interviewQuestions.length;
}

// 현재 질문 표시
function showCurrentQuestion() {
  if (currentQuestionIndex >= interviewQuestions.length) {
    completeInterview();
    return;
  }
  
  document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
  document.getElementById('questionText').textContent = interviewQuestions[currentQuestionIndex];
  document.getElementById('answerText').value = '';
  
  updateProgressBar();
}

// 진행률 바 업데이트
function updateProgressBar() {
  const progress = ((currentQuestionIndex + 1) / interviewQuestions.length) * 100;
  document.getElementById('progressFill').style.width = `${progress}%`;
}

// 다음 질문
function nextQuestion() {
  // 답변 저장
  const answer = document.getElementById('answerText').value;
  interviewAnswers.push({
    question: interviewQuestions[currentQuestionIndex],
    answer: answer,
    timestamp: new Date()
  });
  
  currentQuestionIndex++;
  showCurrentQuestion();
}

// 음성 녹음 토글
function toggleRecording() {
  const recordButton = document.getElementById('recordButton');
  const recordingIndicator = document.getElementById('recordingIndicator');
  
  if (isRecording) {
    // 녹음 중지
    isRecording = false;
    recordButton.textContent = '음성 답변';
    recordButton.style.background = '#d4183d';
    recordingIndicator.style.display = 'none';
  } else {
    // 녹음 시작
    isRecording = true;
    recordButton.textContent = '녹음 중지';
    recordButton.style.background = '#16a34a';
    recordingIndicator.style.display = 'flex';
  }
}

// 면접 타이머 시작
function startInterviewTimer() {
  interviewStartTime = new Date();
  interviewTimer = setInterval(updateTimer, 1000);
}

// 타이머 업데이트
function updateTimer() {
  const elapsed = Math.floor((new Date() - interviewStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  document.getElementById('timer').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 면접 완료
function completeInterview() {
  if (interviewTimer) {
    clearInterval(interviewTimer);
  }
  
  // 결과 데이터 생성
  generateInterviewResult();
  
  showScreen('result');
}

// 면접 결과 생성
function generateInterviewResult() {
  const totalTime = Math.floor((new Date() - interviewStartTime) / 1000);
  
  // 간단한 평가 로직
  const scores = EVALUATION_CRITERIA.map(criteria => {
    const baseScore = 70 + Math.random() * 20; // 70-90점 랜덤
    return {
      name: criteria.name,
      score: Math.round(baseScore),
      weight: criteria.weight
    };
  });
  
  const overallScore = Math.round(
    scores.reduce((sum, item) => sum + item.score * item.weight, 0)
  );
  
  interviewData.result = {
    overallScore,
    scores,
    duration: totalTime,
    answers: interviewAnswers,
    feedback: generateFeedback(scores),
    recommendations: generateRecommendations()
  };
}

// 피드백 생성
function generateFeedback(scores) {
  const positives = FEEDBACK_TEMPLATES.positive
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  
  const improvements = FEEDBACK_TEMPLATES.improvement
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  
  return {
    positive: positives,
    improvement: improvements
  };
}

// 추천사항 생성
function generateRecommendations() {
  return FEEDBACK_TEMPLATES.suggestions
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
}

// 결과 렌더링
function renderResult() {
  if (!interviewData?.result) return;
  
  const result = interviewData.result;
  
  // 전체 점수
  document.getElementById('overallScore').textContent = result.overallScore;
  
  // 세부 평가
  const evaluationItems = document.querySelector('.evaluation-items');
  evaluationItems.innerHTML = result.scores.map(score => `
    <div class="eval-item">
      <span class="eval-label">${score.name}</span>
      <div class="eval-bar">
        <div class="eval-fill" style="width: ${score.score}%"></div>
      </div>
      <span class="eval-score">${score.score}점</span>
    </div>
  `).join('');
  
  // 피드백
  const feedbackContent = document.getElementById('feedbackContent');
  feedbackContent.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <strong>잘한 점:</strong>
      <ul style="margin-top: 0.5rem; padding-left: 1.2rem;">
        ${result.feedback.positive.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    <div>
      <strong>개선점:</strong>
      <ul style="margin-top: 0.5rem; padding-left: 1.2rem;">
        ${result.feedback.improvement.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `;
  
  // 추천사항
  const recommendations = document.querySelector('.recommendations');
  recommendations.innerHTML = result.recommendations.map((rec, index) => `
    <div class="recommendation-item">
      <span class="rec-title">추천 ${index + 1}</span>
      <span class="rec-desc">${rec}</span>
    </div>
  `).join('');
}

// 결과 저장
function saveResult() {
  const resultData = JSON.stringify(interviewData.result);
  const blob = new Blob([resultData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-result-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  showToast('결과가 저장되었습니다.', 'success');
}

// 다시 연습하기
function restartInterview() {
  // 데이터 초기화
  currentQuestionIndex = 0;
  interviewQuestions = [];
  interviewAnswers = [];
  interviewData = null;
  
  if (interviewTimer) {
    clearInterval(interviewTimer);
    interviewTimer = null;
  }
  
  showScreen('main');
}

// 필터 관련 함수들
function toggleFilter() {
  const filterSection = document.getElementById('filterSection');
  filterSection.classList.toggle('hidden');
}

function getFilteredJobs() {
  let filtered = DUMMY_JOBS.filter(job => {
    // 검색 필터
    const searchMatch = !filters.search || 
      job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      job.company.toLowerCase().includes(filters.search.toLowerCase());
    
    // 카테고리 필터
    const categoryMatch = filters.category === 'all' || job.category === filters.category;
    
    // 지역 필터
    const locationMatch = filters.city === 'all' || 
      (job.city === filters.city && 
       (filters.district === 'all' || job.district === filters.district));
    
    return searchMatch && categoryMatch && locationMatch;
  });
  
  // 정렬
  filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'company':
        return a.company.localeCompare(b.company);
      case 'deadline':
        return a.deadline.localeCompare(b.deadline);
      case 'latest':
      default:
        return b.id - a.id;
    }
  });
  
  return filtered;
}

function applyFilters() {
  renderJobList();
}

function updateActiveFilters() {
  const activeFiltersContainer = document.getElementById('activeFilters');
  if (!activeFiltersContainer) return;
  
  const activeFilters = [];
  
  if (filters.category !== 'all') {
    activeFilters.push(`직무: ${filters.category}`);
  }
  
  if (filters.city !== 'all') {
    const locationText = filters.district !== 'all' ? 
      `${filters.city} ${filters.district}` : filters.city;
    activeFilters.push(`지역: ${locationText}`);
  }
  
  if (filters.search) {
    activeFilters.push(`검색: ${filters.search}`);
  }
  
  activeFiltersContainer.innerHTML = activeFilters
    .map(filter => `<span class="filter-tag">${filter}</span>`)
    .join('');
}

function clearAllFilters() {
  filters = {
    search: '',
    category: 'all',
    city: 'all',
    district: 'all',
    sort: 'latest'
  };
  
  // 폼 요소들 초기화
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  
  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) categoryFilter.value = 'all';
  
  const cityFilter = document.getElementById('cityFilter');
  if (cityFilter) cityFilter.value = 'all';
  
  const districtFilter = document.getElementById('districtFilter');
  if (districtFilter) {
    districtFilter.value = 'all';
    districtFilter.style.display = 'none';
  }
  
  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) sortFilter.value = 'latest';
  
  applyFilters();
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 유틸리티 함수들
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 서비스 워커 등록 (PWA 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}