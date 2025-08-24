// interview.js – UI 변경 반영: (1) sttAuto 자리에 녹음 버튼, (2) 5개 상태바, (3) recDot은 '녹음 중'에만 애니메이션

let interviewData = null;
let currentQuestionIndex = 0;
let interviewQuestions = [];
let interviewAnswers = [];
let interviewTimer = null;
let interviewStartTime = null;

// 녹음 상태
let mediaRecorder = null;
let isRecording = false;
let recordedChunks = [];

/* ========= 질문 구성 ========= */
function generateInterviewQuestions() {
  interviewQuestions = [];

  // 기본 질문 샘플
  const general = (INTERVIEW_QUESTIONS.general || [])
    .slice()
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  // 공고 기반 기술 질문
  const jobData = localStorage.getItem("selectedJob");
  const category = jobData ? JSON.parse(jobData).category : "프론트엔드";
  const techBase =
    (INTERVIEW_QUESTIONS.technical &&
      INTERVIEW_QUESTIONS.technical[category]) ||
    (INTERVIEW_QUESTIONS.technical &&
      INTERVIEW_QUESTIONS.technical["프론트엔드"]) ||
    [];
  const technical = techBase
    .slice()
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);

  interviewQuestions = [...general, ...technical];

  const totalEl = document.getElementById("totalQuestions");
  if (totalEl) totalEl.textContent = interviewQuestions.length;

  // 상태바 초기 렌더
  renderQuestionStatus();
}

/* ========= 현재 질문 표시 ========= */
function showCurrentQuestion() {
  if (currentQuestionIndex >= interviewQuestions.length) {
    completeInterview();
    return;
  }

  const idxEl = document.getElementById("currentQuestion");
  const qTextEl = document.getElementById("questionText");

  if (idxEl) idxEl.textContent = currentQuestionIndex + 1;
  if (qTextEl) qTextEl.textContent = interviewQuestions[currentQuestionIndex];

  updateQuestionStatus();
}

/* ========= 질문 상태바 렌더/업데이트 ========= */
function renderQuestionStatus() {
  const wrap = document.getElementById("qStatusBar");
  if (!wrap) return;

  // 세그먼트 개수는 5개로 고정 (요청사항)
  // (질문 수가 다르더라도 5개로 보여주되, 진행 위치만 반영)
  wrap.querySelectorAll(".seg").forEach((seg) => {
    seg.classList.remove("done", "current");
  });

  updateQuestionStatus();
}

function updateQuestionStatus() {
  const wrap = document.getElementById("qStatusBar");
  if (!wrap) return;

  const total = 5; // 고정
  const now = Math.min(currentQuestionIndex, total - 1);
  const segs = wrap.querySelectorAll(".seg");

  segs.forEach((seg, i) => {
    seg.classList.remove("done", "current");
    if (i < now) seg.classList.add("done");
    if (i === now) seg.classList.add("current");
  });
}

/* ========= 다음 질문 ========= */
function nextQuestion() {
  if (isRecording) toggleRecording(); // 녹음 중이면 중지

  interviewAnswers.push({
    question: interviewQuestions[currentQuestionIndex],
    answer: document.getElementById("realtimeTranscript")?.textContent || "",
    timestamp: new Date(),
  });

  currentQuestionIndex++;
  showCurrentQuestion();
}

/* ========= 마이크 권한 요청 ========= */
async function requestMicStream() {
  const isSecure =
    location.protocol === "https:" || location.hostname === "localhost";
  if (!isSecure) {
    console.warn(
      "getUserMedia는 HTTPS/localhost에서만 권한 팝업이 정상 동작합니다."
    );
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (err) {
    console.error("마이크 권한 거부 또는 오류:", err);
    alert(
      "마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 '허용'으로 변경하세요."
    );
    return null;
  }
}

/* ========= 녹음 토글 (버튼 클릭) ========= */
async function toggleRecording() {
  const btn = document.getElementById("recordButton");
  const recDot = document.getElementById("recDot");

  // ---- 정지 ----
  if (isRecording) {
    try {
      mediaRecorder && mediaRecorder.stop();
    } catch {}
    isRecording = false;
    if (btn) {
      btn.classList.remove("btn-success");
      btn.classList.add("btn-danger");
      btn.textContent = "음성 답변";
    }
    recDot && recDot.classList.remove("active");
    return;
  }

  // ---- 시작 ----
  const micStream = await requestMicStream();
  if (!micStream) return;

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(micStream, { mimeType: "audio/webm" });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    micStream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("audio", blob, "answer.webm");

    const sttBox = document.getElementById("realtimeTranscript");
    if (sttBox) sttBox.textContent = "분석 중…";

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (sttBox) sttBox.textContent = data.text || "분석 결과가 없습니다.";
    } catch (e) {
      console.error(e);
      if (sttBox) sttBox.textContent = "분석 실패";
    }
  };

  mediaRecorder.start();
  isRecording = true;
  if (btn) {
    btn.classList.remove("btn-danger");
    btn.classList.add("btn-success");
    btn.textContent = "녹음 중지";
  }
  recDot && recDot.classList.add("active");
}

/* ========= 타이머 ========= */
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

/* ========= 면접 완료 / 결과 ========= */
function completeInterview() {
  if (interviewTimer) clearInterval(interviewTimer);
  generateInterviewResult();
  window.location.href = "/result";
}
function generateInterviewResult() {
  const totalTime = Math.floor((new Date() - interviewStartTime) / 1000);
  const scores = EVALUATION_CRITERIA.map((criteria) => {
    const baseScore = 70 + Math.random() * 20;
    return {
      name: criteria.name,
      score: Math.round(baseScore),
      weight: criteria.weight,
    };
  });
  const overallScore = Math.round(
    scores.reduce((s, it) => s + it.score * it.weight, 0)
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
function generateFeedback() {
  const positives = FEEDBACK_TEMPLATES.positive
    .slice()
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  const improvements = FEEDBACK_TEMPLATES.improvement
    .slice()
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);
  return { positive: positives, improvement: improvements };
}
function generateRecommendations() {
  return FEEDBACK_TEMPLATES.suggestions
    .slice()
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
}

/* ========= 초기화 ========= */
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

/* ========= 페이지 로드시 ========= */
document.addEventListener("DOMContentLoaded", function () {
  // 면접 데이터 로드
  const data = localStorage.getItem("interviewData");
  if (data) {
    interviewData = JSON.parse(data);
    initializeInterview();
  } else {
    alert("면접 정보를 찾을 수 없습니다.");
    window.location.href = "/";
  }

  // selectedJob 기반 텍스트 구성(초기 질문)
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

    const qEl = document.getElementById("questionText");
    const totalEl = document.getElementById("totalQuestions");
    if (qEl) qEl.innerText = qs[0];
    if (totalEl) totalEl.innerText = 5; // 상태바는 5개 고정
  })();

  // 녹음 버튼 연결 (stt 영역 헤더에 위치)
  document
    .getElementById("recordButton")
    ?.addEventListener("click", toggleRecording);
});
