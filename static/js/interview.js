// 면접 페이지 JavaScript

let interviewData = null;
let currentQuestionIndex = 0;
let interviewQuestions = [];
let interviewAnswers = [];
let interviewTimer = null;
let interviewStartTime = null;
let isRecording = false;

// 면접 질문 생성
function generateInterviewQuestions() {
  interviewQuestions = [];

  // 일반 질문 3개
  const generalQuestions = INTERVIEW_QUESTIONS.general
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  // 기술 질문 2개 (직무에 따라)
  const jobData = localStorage.getItem("selectedJob");
  const category = jobData ? JSON.parse(jobData).category : "프론트엔드";
  const technicalQuestions = (
    INTERVIEW_QUESTIONS.technical[category] ||
    INTERVIEW_QUESTIONS.technical["프론트엔드"]
  )
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);

  interviewQuestions = [...generalQuestions, ...technicalQuestions];
  document.getElementById("totalQuestions").textContent =
    interviewQuestions.length;
}

// 현재 질문 표시
function showCurrentQuestion() {
  if (currentQuestionIndex >= interviewQuestions.length) {
    completeInterview();
    return;
  }

  document.getElementById("currentQuestion").textContent =
    currentQuestionIndex + 1;
  document.getElementById("questionText").textContent =
    interviewQuestions[currentQuestionIndex];
  document.getElementById("answerText").value = "";

  updateProgressBar();
}

// 진행률 바 업데이트
function updateProgressBar() {
  const progress =
    ((currentQuestionIndex + 1) / interviewQuestions.length) * 100;
  document.getElementById("progressFill").style.width = `${progress}%`;
}

// 다음 질문
function nextQuestion() {
  // 답변 저장
  const answer = document.getElementById("answerText").value;
  interviewAnswers.push({
    question: interviewQuestions[currentQuestionIndex],
    answer: answer,
    timestamp: new Date(),
  });

  currentQuestionIndex++;
  showCurrentQuestion();
}

// 음성 녹음 토글
function toggleRecording() {
  const recordButton = document.getElementById("recordButton");
  const recordingIndicator = document.getElementById("recordingIndicator");

  if (isRecording) {
    // 녹음 중지
    isRecording = false;
    recordButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
            </svg>
            음성 답변
        `;
    recordButton.style.background = "#dc2626";
    recordingIndicator.style.display = "none";
  } else {
    // 녹음 시작
    isRecording = true;
    recordButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <square x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            녹음 중지
        `;
    recordButton.style.background = "#16a34a";
    recordingIndicator.style.display = "flex";
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

  document.getElementById("timer").textContent = `${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// 면접 완료
function completeInterview() {
  if (interviewTimer) {
    clearInterval(interviewTimer);
  }

  // 결과 데이터 생성
  generateInterviewResult();

  window.location.href = "/result";
}

// 면접 결과 생성
function generateInterviewResult() {
  const totalTime = Math.floor((new Date() - interviewStartTime) / 1000);

  // 간단한 평가 로직
  const scores = EVALUATION_CRITERIA.map((criteria) => {
    const baseScore = 70 + Math.random() * 20; // 70-90점 랜덤
    return {
      name: criteria.name,
      score: Math.round(baseScore),
      weight: criteria.weight,
    };
  });

  const overallScore = Math.round(
    scores.reduce((sum, item) => sum + item.score * item.weight, 0)
  );

  const result = {
    overallScore,
    scores,
    duration: totalTime,
    answers: interviewAnswers,
    feedback: generateFeedback(scores),
    recommendations: generateRecommendations(),
  };

  interviewData.result = result;
  localStorage.setItem("interviewResult", JSON.stringify(result));
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
    improvement: improvements,
  };
}

// 추천사항 생성
function generateRecommendations() {
  return FEEDBACK_TEMPLATES.suggestions
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
}

// 면접 초기화
function initializeInterview() {
  if (!interviewData) return;

  document.getElementById("interviewCompany").textContent =
    interviewData.company || "회사명";
  document.getElementById("interviewPosition").textContent =
    interviewData.position || "직무명";

  generateInterviewQuestions();
  showCurrentQuestion();
  startInterviewTimer();
}

// 페이지 초기화
document.addEventListener("DOMContentLoaded", function () {
  const data = localStorage.getItem("interviewData");
  if (data) {
    interviewData = JSON.parse(data);
    initializeInterview();
  } else {
    alert("면접 정보를 찾을 수 없습니다.");
    window.location.href = "/";
  }

  // CSS 애니메이션 추가
  const style = document.createElement("style");
  style.textContent = `
        .recording-pulse {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            }
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
            }
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
        }
    `;
  document.head.appendChild(style);
})(
  // 저장한 JSON으로 UI/질문을 초기화.
  function () {
    function loadSelectedJob() {
      try {
        return JSON.parse(localStorage.getItem("selectedJob") || "null");
      } catch {
        return null;
      }
    }

    function buildQuestions(p) {
      const base = p?.description || "";
      const title = p?.job?.title || "지원 직무";
      const company = p?.job?.company || "회사";
      return [
        `${company}의 ${title}에 지원한 동기를 말씀해주세요.`,
        `공고에서 요구하는 역량 중 본인 강점 1~2개를 사례와 함께 설명해주세요.`,
        `요구 기술 중 가장 자신 있는 기술을 선택해 최근 경험을 말해보세요.`,
        `해당 포지션 핵심 업무에 대한 이해와 입사 후 3개월 계획은?`,
        `공고 요약: ${base.slice(
          0,
          120
        )}... 를 바탕으로 가장 적합한 프로젝트 경험을 설명하세요.`,
      ];
    }

    window.addEventListener("DOMContentLoaded", () => {
      const p = loadSelectedJob();
      if (!p) return;
      const cEl = document.getElementById("interviewCompany");
      const tEl = document.getElementById("interviewPosition");
      if (cEl) cEl.innerText = p.job?.company || "회사명";
      if (tEl) tEl.innerText = p.job?.title || "직무명";

      const qs = buildQuestions(p);
      window.__questions = qs;
      const qEl = document.getElementById("questionText");
      const totalEl = document.getElementById("totalQuestions");
      if (qEl) qEl.innerText = qs[0];
      if (totalEl) totalEl.innerText = qs.length;
    });
  }
)();
