// 사용자 입력 페이지 JavaScript

// 뒤로가기
function goBack() {
  window.location.href = "/";
}

// 안전 문자열
const val = (x) => (x == null ? "" : String(x).trim());

// 폼 제출 처리
function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const position = val(formData.get("jobTitle"));
  const company = val(formData.get("company"));
  const notes = val(formData.get("notes"));
  const resumeFile = formData.get("resume"); // 실제 파일

  // ✅ 최소한 직무/회사 중 하나는 입력
  if (!position && !company) {
    alert("직무 또는 회사 중 최소 하나는 입력해야 합니다.");
    return;
  }

  const interviewData = {
    position,
    company,
    notes,
    userName: localStorage.getItem("userName") || "",
    startTime: new Date().toISOString(),
    answers: [],
    duration: 0,
  };

  // 로컬 저장 (파일 이름만)
  localStorage.setItem(
    "interviewData",
    JSON.stringify({ ...interviewData, resume: resumeFile?.name || "" })
  );

  // 서버 전송용 FormData
  const uploadData = new FormData();
  uploadData.append("position", position);
  uploadData.append("company", company);
  uploadData.append("notes", notes);
  uploadData.append("userName", interviewData.userName);
  uploadData.append("startTime", interviewData.startTime);
  uploadData.append("answers", JSON.stringify(interviewData.answers));
  uploadData.append("duration", interviewData.duration);
  if (resumeFile && resumeFile.size > 0) {
    uploadData.append("resume", resumeFile); // 실제 파일 전송
  }

  // 서버로 전송
  fetch("/api/user-input", {
    method: "POST",
    body: uploadData, // FormData 사용
  })
    .then((res) => res.json().catch(() => ({ ok: false })))
    .then(() => {
      window.location.href = "/interview";
    })
    .catch(() => {
      window.location.href = "/interview";
    });
}

// 선택 공고/프로필 → 자동 채움
function hydrateFromSelectedJob() {
  try {
    const saved = localStorage.getItem("selectedJob");
    if (!saved) return;
    const p = JSON.parse(saved);
    const titleEl = document.getElementById("jobTitle");
    const companyEl = document.getElementById("company");
    if (titleEl) titleEl.value = val(p?.job?.title || p?.title);
    if (companyEl) companyEl.value = val(p?.job?.company || p?.company);
  } catch (e) {
    console.warn("selectedJob parse error", e);
  }
}

// DOM 로드 후 초기화
if (document && typeof document.addEventListener === "function") {
  document.addEventListener("DOMContentLoaded", () => {
    hydrateFromSelectedJob();

    const form = document.getElementById("interviewForm");
    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    } else {
      console.error("폼 요소(#interviewForm)를 찾을 수 없습니다.");
    }
  });
} else if (window && typeof window.addEventListener === "function") {
  window.addEventListener("load", () => {
    hydrateFromSelectedJob();

    const form = document.getElementById("interviewForm");
    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    } else {
      console.error("폼 요소(#interviewForm)를 찾을 수 없습니다.");
    }
  });
} else {
  console.error("이벤트 리스너를 추가할 수 있는 메서드가 없습니다.");
}
