// result.js — 로컬 저장 결과 안전 렌더링

let interviewResult = null;

// 유틸: 텍스트 세터(여러 후보 id 지원)
function setTextByIds(ids, value) {
  const val = value ?? "-";
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

// 유틸: HTML 세터(id 또는 첫 번째 매칭되는 클래스)
function setHTMLByCandidates({ id, className }, html) {
  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = html;
      return true;
    }
  }
  if (className) {
    const el = document.querySelector("." + className);
    if (el) {
      el.innerHTML = html;
      return true;
    }
  }
  return false;
}

// 토스트(간단)
function showToast(message, type = "success") {
  const el = document.createElement("div");
  el.className =
    "fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50 " +
    (type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// 저장(다운로드)
function downloadResult() {
  const data = interviewResult || {
    time: new Date().toISOString(),
    note: "no-data",
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

// 다시 연습
function restartInterview() {
  // 필요 시 상태 초기화 추가 가능
  location.href = "/user-input";
}

document.addEventListener("DOMContentLoaded", () => {
  // 결과 불러오기
  const saved = localStorage.getItem("interviewResult");
  if (saved) {
    try {
      interviewResult = JSON.parse(saved);
    } catch {
      interviewResult = null;
    }
  }

  if (!interviewResult) {
    showToast("면접 결과를 불러올 수 없습니다.", "error");
    // 그래도 화면은 기본값으로 유지
    interviewResult = {
      overallScore: "-",
      scores: [],
      feedback: { positive: [], improvement: [] },
      recommendations: [],
      duration: 0,
      answers: [],
    };
  }

  // 총점: 두 가지 케이스 모두 지원
  setTextByIds(["overallScore", "scoreValue"], interviewResult.overallScore);

  // 세부 평가 막대/목록
  const evalItemsHtml = (interviewResult.scores || [])
    .map((s) => {
      // 막대 UI가 있는 템플릿(.evaluation-items)과
      // 리스트 템플릿(#evaluationItems) 둘 다 커버
      return `
        <div class="eval-item d-flex align-items-center gap-2 mb-2">
          <span class="eval-label" style="min-width:6rem">${
            s.name ?? "-"
          }</span>
          <div class="eval-bar flex-grow-1" style="height:8px;background:#eee;border-radius:999px;overflow:hidden">
            <div class="eval-fill" style="height:100%;width:${
              s.score ?? 0
            }%;background:#6366f1"></div>
          </div>
          <span class="eval-score" style="min-width:3.5rem;text-align:right">${
            s.score ?? 0
          }점</span>
        </div>
      `;
    })
    .join("");

  // 1) class 기반(싱글) -> 2) id 기반(리스트) 순으로 주입 시도
  if (
    !setHTMLByCandidates(
      { className: "evaluation-items" },
      evalItemsHtml || `<div class="text-secondary">세부 항목 없음</div>`
    )
  ) {
    const ulHtml = (interviewResult.scores || [])
      .map(
        (s) =>
          `<li class="list-group-item d-flex justify-content-between"><span>${
            s.name ?? "-"
          }</span><strong>${s.score ?? 0}점</strong></li>`
      )
      .join("");
    setHTMLByCandidates(
      { id: "evaluationItems" },
      ulHtml || `<li class="list-group-item text-secondary">세부 항목 없음</li>`
    );
  }

  // 피드백
  const pos = (interviewResult.feedback?.positive || [])
    .map((t) => `<li>${t}</li>`)
    .join("");
  const imp = (interviewResult.feedback?.improvement || [])
    .map((t) => `<li>${t}</li>`)
    .join("");
  setHTMLByCandidates(
    { id: "feedbackContent", className: "feedback-content" },
    `
      <div style="margin-bottom:1rem">
        <strong>잘한 점</strong>
        <ul style="margin-top:.5rem;padding-left:1.2rem">${
          pos || "<li>-</li>"
        }</ul>
      </div>
      <div>
        <strong>개선점</strong>
        <ul style="margin-top:.5rem;padding-left:1.2rem">${
          imp || "<li>-</li>"
        }</ul>
      </div>
    `
  );

  // 추천 사항(있으면)
  if (interviewResult.recommendations?.length) {
    const recHtml = interviewResult.recommendations
      .map(
        (t, i) => `
        <div class="recommendation-item d-flex align-items-center gap-2 mb-2">
          <span class="rec-title badge text-bg-primary-subtle">추천 ${
            i + 1
          }</span>
          <span class="rec-desc">${t}</span>
        </div>`
      )
      .join("");
    setHTMLByCandidates(
      { className: "recommendations", id: "recommendations" },
      recHtml
    );
  }

  // 버튼 바인딩(있을 때만)
  const dlBtn = document.getElementById("downloadBtn");
  if (dlBtn) dlBtn.addEventListener("click", downloadResult);
  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) restartBtn.addEventListener("click", restartInterview);
});
