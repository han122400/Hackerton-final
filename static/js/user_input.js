// user_input.js

// 뒤로가기 버튼
function goBack() {
  window.location.href = "/";
}

// 안전 문자열 처리
const val = (x) => (x == null ? "" : String(x).trim());

// 폼 제출 처리
function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // 로컬스토리지에서 userName 추가
  const userName = localStorage.getItem("userName") || "";
  formData.append("userName", userName);

  // 최소한 직무 또는 회사가 입력되었는지 확인
  const position = val(formData.get("jobTitle"));
  const company = val(formData.get("company"));
  if (!position && !company) {
    alert("직무 또는 회사 중 최소 하나는 입력해야 합니다.");
    return;
  }

  // 로컬스토리지에는 파일 제외하고 메타 저장
  const interviewMeta = {
    position,
    company,
    notes: val(formData.get("notes")),
    userName,
    startTime: new Date(),
    answers: [],
    duration: 0,
  };
  localStorage.setItem("interviewData", JSON.stringify(interviewMeta));

  // 서버로 multipart/form-data 전송 (파일 포함 가능)
  fetch("/api/user-input", {
    method: "POST",
    body: formData, // <-- JSON이 아닌 FormData로 전송
  })
    .then((res) => res.json())
    .then((r) => {
      if (!r.ok) {
        alert(r.detail || "서버 저장 실패");
        return;
      }
      window.location.href = "/interview"; // 성공 시 이동
    })
    .catch((err) => {
      console.error(err);
      alert("서버와 통신 실패");
      window.location.href = "/interview"; // 실패해도 이동
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

// DOMContentLoaded에서 폼 이벤트 연결
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
