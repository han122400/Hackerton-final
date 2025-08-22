let interviewResult = null;

function showToast(message, type = "success") {
  const wrap = document.createElement("div");
  wrap.className = "position-fixed top-0 start-50 translate-middle-x mt-3 z-3";
  wrap.innerHTML = `<div class="alert alert-${
    type === "error" ? "danger" : type
  } shadow">${message}</div>`;
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2000);
}

function downloadResult() {
  const data = interviewResult || {
    time: new Date().toISOString(),
    note: "sample",
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `interview-result-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("결과가 저장되었습니다.", "success");
}

function restartInterview() {
  location.href = "/user-input";
}

document.addEventListener("DOMContentLoaded", () => {
  // 실제로는 서버/스토리지에서 결과 로드 & DOM 채움
  // 아래는 placeholder
  interviewResult = {
    score: 92,
    speed: "보통",
    clarity: "우수",
    logic: "양호",
  };
  document.getElementById("scoreValue").textContent = interviewResult.score;
  document.getElementById("speedValue").textContent = interviewResult.speed;
  document.getElementById("clarityValue").textContent = interviewResult.clarity;
  document.getElementById("logicValue").textContent = interviewResult.logic;

  document.getElementById("evaluationItems").innerHTML = `
    <div>- STAR 구조가 잘 지켜졌습니다.</div>
    <div>- 구체 예시가 더 있으면 좋겠어요.</div>
  `;
  document.getElementById("feedbackContent").textContent =
    "핵심 메시지를 먼저 말하고, 수치/성과를 덧붙이면 더 설득력이 높아집니다.";
});
