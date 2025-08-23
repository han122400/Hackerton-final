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
  const coverLetter = val(formData.get("coverLetter"));

  // 파일 객체들
  const resumeFile = formData.get("resume"); // 실제 파일
  const portfolioFile = formData.get("portfolio");

  // 파일명 추출 (현재 로컬스토리지/JSON으로 넘길 것이므로 파일명만 저장)
  const resumeName =
    resumeFile && typeof resumeFile.name === "string" ? resumeFile.name : "";
  const portfolioName =
    portfolioFile && typeof portfolioFile.name === "string"
      ? portfolioFile.name
      : "";

  // ✅ 필수값 체크: 직무 or 회사 중 최소 하나 + 이력서 파일
  if (!position && !company) {
    alert("직무 또는 회사 중 최소 하나는 입력해야 합니다.");
    return;
  }
  if (!resumeName) {
    alert("이력서 파일을 선택해주세요.");
    return;
  }

  // interviewData 구성 (파일 바이너리는 저장/전송 X, 파일명만 전달)
  const interviewData = {
    position,
    company,
    notes,
    userName: localStorage.getItem("userName") || "",
<<<<<<< HEAD
    resume: resumeName, // ✅ 파일명
    coverLetter: coverLetter || null, // ✅ 텍스트
    portfolio: portfolioName || null, // ✅ 파일명
    startTime: new Date(),
=======
    startTime: new Date().toISOString(),
>>>>>>> b43a0949c46b6e12e504e1e8c7849c1dddad3248
    answers: [],
    duration: 0,
  };

<<<<<<< HEAD
  // 로컬 저장 (interview.js가 여기서 읽어감)
  localStorage.setItem("interviewData", JSON.stringify(interviewData));

  // 서버에도 전송 (현재는 JSON으로 파일명/본문만 보냄)
  // 실제 파일 업로드가 필요하면, multipart/form-data 엔드포인트 별도 구현 필요.
=======
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
>>>>>>> b43a0949c46b6e12e504e1e8c7849c1dddad3248
  fetch("/api/user-input", {
    method: "POST",
    body: uploadData, // FormData 사용
  })
    .then((res) => res.json().catch(() => ({ ok: false })))
    .then(() => {
<<<<<<< HEAD
      // 서버 저장 실패여도 로컬 데이터만으로 진행
=======
>>>>>>> b43a0949c46b6e12e504e1e8c7849c1dddad3248
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

<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", () => {
  hydrateFromSelectedJob();
=======
// DOM 로드 후 초기화
if (document && typeof document.addEventListener === "function") {
  document.addEventListener("DOMContentLoaded", () => {
    hydrateFromSelectedJob();
>>>>>>> b43a0949c46b6e12e504e1e8c7849c1dddad3248

  const form = document.getElementById("interviewForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  } else {
    console.error("폼 요소(#interviewForm)를 찾을 수 없습니다.");
  }
});
