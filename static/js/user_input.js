function hydrateFromSelectedJob() {
  const saved = localStorage.getItem("selectedJob");
  if (!saved) return;

  try {
    const p = JSON.parse(saved);
    const titleEl = document.getElementById("jobTitle");

    // 'company' 관련 코드를 제거했습니다.
    if (titleEl) {
      titleEl.value = p.job?.title || titleEl.value || "";
    }
  } catch (error) {
    // 에러가 발생하면 콘솔에 명확히 표시합니다.
    console.error("selectedJob 데이터 파싱 중 오류가 발생했습니다:", error);
  }
}

/**
 * 폼 제출 이벤트를 처리하는 함수
 * @param {Event} e 폼 제출 이벤트 객체
 */
function handleFormSubmit(e) {
  // 기본 폼 제출 동작(페이지 새로고침)을 막습니다.
  e.preventDefault();

  const formData = new FormData(e.target);

  // localStorage에 저장할 데이터 객체를 생성합니다.
  const interviewData = {
    position: (formData.get("jobTitle") || "").trim(),
    // 'company' 속성을 제거했습니다.
    notes: (formData.get("notes") || "").trim(),
    startTime: new Date(),
    answers: [],
    duration: 0,
  };

  // 'company' 유효성 검사를 제거하고 직무만 확인합니다.
  if (!interviewData.position) {
    showAlert("직무는 필수입니다.", "danger");
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

/**
 * 사용자에게 알림 메시지를 표시하는 함수
 * @param {string} message 표시할 메시지
 * @param {string} type 알림 타입 (e.g., 'danger', 'success')
 */
function showAlert(message, type = "danger") {
  // showAlert 함수는 HTML에 #alertContainer 요소가 있어야 동작합니다.
  // 만약 없다면 body 최상단에 추가하는 로직이 필요할 수 있습니다.
  const alertContainer =
    document.getElementById("alertContainer") || document.body;
  const alertElement = document.createElement("div");
  alertElement.className = `alert alert-${type} alert-dismissible fade show`;
  alertElement.style.position = "fixed";
  alertElement.style.top = "20px";
  alertElement.style.left = "50%";
  alertElement.style.transform = "translateX(-50%)";
  alertElement.style.zIndex = "1050";
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  alertContainer.prepend(alertElement);

  // 3초 후 자동으로 알림 닫기
  setTimeout(() => {
    // bootstrap 객체가 로드되었는지 확인 후 실행
    if (window.bootstrap && window.bootstrap.Alert) {
      const alertInstance = bootstrap.Alert.getOrCreateInstance(alertElement);
      if (alertInstance) {
        alertInstance.close();
      }
    } else {
      alertElement.remove();
    }
  }, 3000);
}

// DOM 콘텐츠가 모두 로드되면 스크립트를 실행합니다.
document.addEventListener("DOMContentLoaded", () => {
  hydrateFromSelectedJob();

  const form = document.getElementById("interviewForm");
  if (!form) {
    console.error("폼 요소(#interviewForm)를 찾을 수 없습니다.");
    return;
  }
  form.addEventListener("submit", handleFormSubmit);
});
