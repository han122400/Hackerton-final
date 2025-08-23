// 사용자 입력 페이지 JavaScript

// 선택 공고(selectedJob)에서 자동 채움
function hydrateFromSelectedJob() {
  const saved = localStorage.getItem("selectedJob");
  if (!saved) return;
  try {
    const p = JSON.parse(saved);
    const titleEl = document.getElementById("jobTitle");
    const companyEl = document.getElementById("company");
    if (titleEl) titleEl.value = p.job?.title || titleEl.value || "";
    if (companyEl) companyEl.value = p.job?.company || companyEl.value || "";
  } catch (_) {}
}

// 폼 제출 처리
function handleFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const interviewData = {
    position: (formData.get("jobTitle") || "").trim(),
    company: (formData.get("company") || "").trim(),
    notes: (formData.get("notes") || "").trim(),
    startTime: new Date(),
    answers: [],
    duration: 0,
  };

  if (!interviewData.position || !interviewData.company) {
    showAlert("직무와 회사는 필수입니다.", "danger");
    return;
  }

  try {
    localStorage.setItem("interviewData", JSON.stringify(interviewData));
    window.location.href = "/interview";
  } catch (error) {
    showAlert("데이터 저장 중 오류가 발생했습니다.", "danger");
    console.error("localStorage 저장 오류:", error);
  }
}

// 알림 표시 함수
function showAlert(message, type = "danger") {
  const alertContainer = document.getElementById("alertContainer");
  const alertElement = document.createElement("div");
  alertElement.className = `alert alert-${type} alert-dismissible fade show`;
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  alertContainer.appendChild(alertElement);

  // 3초 후 자동으로 알림 닫기
  setTimeout(() => {
    const alert = new bootstrap.Alert(alertElement);
    alert.close();
  }, 3000);
}

// 페이지 초기화
document.addEventListener("DOMContentLoaded", () => {
  hydrateFromSelectedJob();

  // ✅ HTML과 동일한 id로 리스너 등록
  const form = document.getElementById("interviewForm");
  if (!form) {
    console.error("폼 요소(#interviewForm)를 찾을 수 없습니다.");
    return;
  }
  form.addEventListener("submit", handleFormSubmit);
});
