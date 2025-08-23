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
  const resumeFile = formData.get("resume");

  // ✅ 최소한 직무/회사 중 하나는 입력
  if (!position && !company) {
    alert("직무 또는 회사 중 최소 하나는 입력해야 합니다.");
    return;
  }

  // ====================================
  // ▼▼▼▼▼▼▼▼▼▼ 이 부분이 수정되었습니다 ▼▼▼▼▼▼▼▼▼▼
  // ====================================

  // 1. localStorage에는 기존처럼 파일 이름을 포함한 JSON 정보를 저장합니다.
  const interviewDataForStorage = {
    position,
    company,
    notes: val(formData.get("notes")),
    resume: resumeFile && resumeFile.name ? resumeFile.name : "",
    userName: localStorage.getItem("userName") || "",
    startTime: new Date(),
    answers: [],
    duration: 0,
  };
  localStorage.setItem(
    "interviewData",
    JSON.stringify(interviewDataForStorage)
  );

  // 2. 서버로 보낼 FormData에 폼 입력값 외의 추가 정보를 append합니다.
  // (기존 폼 필드: jobTitle, company, notes, resume는 이미 formData에 포함되어 있습니다)
  formData.append("userName", localStorage.getItem("userName") || "");
  formData.append("startTime", new Date().toISOString());
  formData.append("answers", JSON.stringify([])); // 배열은 JSON 문자열로 변환
  formData.append("duration", "0");

  // 3. 서버에 FormData 객체를 그대로 전송합니다.
  //    - headers의 'Content-Type'을 제거해야 브라우저가 자동으로 multipart/form-data로 설정합니다.
  fetch("/api/user-input", {
    method: "POST",
    body: formData,
  })
    .then((res) => {
      // 서버 응답이 성공적이지 않을 경우를 대비
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json().catch(() => ({})); // JSON 파싱 실패를 대비
    })
    .then(() => {
      window.location.href = "/interview";
    })
    .catch((error) => {
      console.error("Fetch Error:", error);
      // 에러가 발생해도 일단 면접 페이지로 이동
      window.location.href = "/interview";
    });

  // ====================================
  // ▲▲▲▲▲▲▲▲▲▲ 여기까지 수정되었습니다 ▲▲▲▲▲▲▲▲▲▲
  // ====================================
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
}
