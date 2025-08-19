// 메인 페이지 JavaScript

// 페이지 네비게이션 함수들
function navigateToUserInput() {
  window.location.href = "./user-input.html";
}

function navigateToJobList() {
  window.location.href = "job-list.html";
}

function navigateToProfile() {
  window.location.href = "profile.html";
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // 메인 페이지는 특별한 초기화가 필요하지 않음
  console.log("메인 페이지 로드 완료");
});
