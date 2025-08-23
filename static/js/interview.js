// 면접 페이지 JavaScript (카메라+마이크 녹화 연결 포함)

let interviewData = null;
let currentQuestionIndex = 0;
let interviewQuestions = [];
let interviewAnswers = [];
let interviewTimer = null;
let interviewStartTime = null;

// 녹화 관련 상태
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let currentStream = null;

// ===== 질문 생성 =====
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

  const totalEl = document.getElementById("totalQuestions");
  if (totalEl) totalEl.textContent = interviewQuestions.length;
}

// ===== 현재 질문 표시 =====
function showCurrentQuestion() {
  if (currentQuestionIndex >= interviewQuestions.length) {
    completeInterview();
    return;
  }

  const idxEl = document.getElementById("currentQuestion");
  const qTextEl = document.getElementById("questionText");
  const answerEl = document.getElementById("answerText");

  if (idxEl) idxEl.textContent = currentQuestionIndex + 1;
  if (qTextEl) qTextEl.textContent = interviewQuestions[currentQuestionIndex];
  if (answerEl) answerEl.value = "";

  updateProgressBar();
}

// ===== 진행률 바 =====
function updateProgressBar() {
  const fill = document.getElementById("progressFill");
  if (!fill || interviewQuestions.length === 0) return;
  const progress =
    ((currentQuestionIndex + 1) / interviewQuestions.length) * 100;
  fill.style.width = `${progress}%`;
}

// ===== 다음 질문 =====
function nextQuestion() {
  // 녹화 중이면 자동 정지
  if (isRecording) {
    toggleRecording(); // stop
  }

  const answer = (document.getElementById("answerText")?.value ?? "").trim();
  interviewAnswers.push({
    question: interviewQuestions[currentQuestionIndex],
    answer: answer,
    timestamp: new Date(),
  });

  currentQuestionIndex++;
  showCurrentQuestion();
}

// ===== 카메라/마이크 권한 & 스트림 획득 =====
// ===== 카메라/마이크 권한 & 스트림 획득 =====
async function getMediaStream() {
  if (currentStream) return currentStream;

  try {
    // 권한 상태 확인
    if (navigator.permissions) {
      try {
        const cam = await navigator.permissions.query({ name: "camera" });
        const mic = await navigator.permissions.query({ name: "microphone" });
        if (cam.state === "denied" || mic.state === "denied") {
          alert("브라우저 설정에서 카메라/마이크 차단을 해제해주세요.");
          return null;
        }
      } catch (e) {
        console.warn("권한 상태 확인 불가:", e);
      }
    }

    // 권한 요청 → 팝업 자동 표시
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    currentStream = stream;

    // 라이브 미리보기 연결
    const live = document.getElementById("livePreview");
    if (live) {
      live.classList.remove("d-none");
      live.srcObject = stream;
    }
    return stream;
  } catch (err) {
    console.error("getUserMedia error:", err);
    alert("카메라/마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
    return null;
  }
}

// ===== 스트림 종료(트랙 정리) =====
function stopStreamTracks() {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
  const live = document.getElementById("livePreview");
  if (live) {
    live.srcObject = null;
    live.classList.add("d-none");
  }
}

// ===== 녹음/녹화 토글 =====
async function toggleRecording() {
  const recordButton = document.getElementById("recordButton");
  const recordingIndicator = document.getElementById("recordingIndicator");

  if (isRecording) {
    // === 정지 ===
    isRecording = false;
    try {
      mediaRecorder?.stop();
    } catch (e) {
      console.warn("stop error:", e);
    }

    if (recordButton) {
      recordButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
        </svg>
        음성 답변
      `;
      recordButton.style.background = "#dc2626";
    }
    if (recordingIndicator) recordingIndicator.classList.add("d-none");
  } else {
    // === 시작 ===
    try {
      const stream = await getMediaStream();

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Blob 생성 & 재생 가능하도록 추가
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const wrap = document.createElement("div");
        wrap.className = "card border-0 bg-light p-2 mb-2";
        const v = document.createElement("video");
        v.src = url;
        v.controls = true;
        v.playsInline = true;
        v.className = "w-100 rounded";
        wrap.appendChild(v);

        const list = document.getElementById("playbackList");
        list?.prepend(wrap);

        // 스트림 정리(라이브 미리보기 숨김)
        stopStreamTracks();
      };

      mediaRecorder.start();

      isRecording = true;

      if (recordButton) {
        recordButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="6" height="6" rx="1"/>
          </svg>
          녹음 중지
        `;
        recordButton.style.background = "#16a34a";
      }
      if (recordingIndicator) recordingIndicator.classList.remove("d-none");
    } catch (err) {
      // 권한 거부 또는 getUserMedia 실패
      console.error(err);
    }
  }
}

// ===== 타이머 =====
function startInterviewTimer() {
  interviewStartTime = new Date();
  interviewTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const elapsed = Math.floor((new Date() - interviewStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const el = document.getElementById("timer");
  if (el)
    el.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
}

// ===== 면접 완료 =====
function completeInterview() {
  if (interviewTimer) clearInterval(interviewTimer);
  generateInterviewResult();
  // 결과 페이지로 이동
  window.location.href = "/result";
}

// ===== 결과 생성(샘플 로직) =====
function generateInterviewResult() {
  const totalTime = Math.floor((new Date() - interviewStartTime) / 1000);

  const scores = EVALUATION_CRITERIA.map((criteria) => {
    const baseScore = 70 + Math.random() * 20; // 70~90
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

  if (!interviewData) interviewData = {};
  interviewData.result = result;
  localStorage.setItem("interviewResult", JSON.stringify(result));
}

// ===== 피드백/추천(샘플) =====
function generateFeedback() {
  const positives = FEEDBACK_TEMPLATES.positive
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  const improvements = FEEDBACK_TEMPLATES.improvement
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  return { positive: positives, improvement: improvements };
}

function generateRecommendations() {
  return FEEDBACK_TEMPLATES.suggestions
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
}

// ===== 초기화 =====
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

// ===== 페이지 로드시 =====
document.addEventListener("DOMContentLoaded", function () {
  const data = localStorage.getItem("interviewData");
  if (data) {
    interviewData = JSON.parse(data);
    initializeInterview();
  } else {
    alert("면접 정보를 찾을 수 없습니다.");
    window.location.href = "/";
  }

  // 추가: selectedJob 기반 기본 질문 구성(있을 때)
  (function () {
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

    const p = loadSelectedJob();
    if (!p) return;

    const cEl = document.getElementById("interviewCompany");
    const tEl = document.getElementById("interviewPosition");
    if (cEl) cEl.innerText = p.job?.company || "회사명";
    if (tEl) tEl.innerText = p.job?.title || "직무명";

    const qs = buildQuestions(p);
    window.__questions = qs;

    // 만약 data.js 질문과 합쳐 쓰고 싶다면 아래 주석을 참고하여 커스텀.
    const qEl = document.getElementById("questionText");
    const totalEl = document.getElementById("totalQuestions");
    if (qEl) qEl.innerText = qs[0];
    if (totalEl) totalEl.innerText = qs.length;
  })();
});
