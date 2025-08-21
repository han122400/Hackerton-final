// 채용공고 상세 페이지 JavaScript

// URL에서 id 파라미터 가져오기
function getJobId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// 뒤로가기
function goBack() {
  location.href = "/job-list";
}

// 마크다운 파서
function parseMarkdown(markdown) {
  return markdown
    .replace(
      /^# (.*$)/gim,
      '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>'
    )
    .replace(
      /^## (.*$)/gim,
      '<h4 class="text-base font-semibold mt-3 mb-2">$1</h4>'
    )
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(
      /(<li.*<\/li>)/gims,
      '<ul class="list-disc space-y-1 mb-3">$1</ul>'
    )
    .replace(/\n\n/gim, '</p><p class="mb-3">')
    .replace(/\n/gim, "<br>");
}

// 상세 정보 렌더링
async function renderJobDetail() {
  const empSeqno = getJobId();
  if (!empSeqno) {
    alert("잘못된 접근입니다.");
    location.href = "/job-list";
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${empSeqno}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    console.log("API Response:", data); // 디버깅용 로그 추가

    if (!data.ok || !data.item) throw new Error("데이터를 찾을 수 없습니다.");

    const job = data.item;
    const raw = job.raw || {};

    // 기본 정보 업데이트
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value || "-";
      }
    };

    // 기본 정보 업데이트
    updateElement("jobTitle", job.title);
    updateElement("companyName", job.company_name);
    updateElement("companyType", job.company_type);
    updateElement("companyLogo", (job.company_name?.[0] || "C").toUpperCase());

    // 상세 설명 구성
    let descriptionContent = "";

    // 모집 요약 정보
    if (job.recruitment_summary) {
      descriptionContent += `# 모집 요약\n${job.recruitment_summary}\n\n`;
    }

    // 모집 분야별 상세 정보
    if (job.recruitment_info && job.recruitment_info.length > 0) {
      job.recruitment_info.forEach((info) => {
        descriptionContent += `# ${info.title || "모집분야"}\n`;
        if (info.job_description)
          descriptionContent += `## 직무내용\n${info.job_description}\n\n`;
        if (info.work_location)
          descriptionContent += `## 근무지역\n${info.work_location}\n\n`;
        if (info.career || info.education) {
          descriptionContent += `## 자격요건\n`;
          if (info.career) descriptionContent += `- 경력: ${info.career}\n`;
          if (info.education)
            descriptionContent += `- 학력: ${info.education}\n`;
          if (info.other_requirements)
            descriptionContent += `- 기타: ${info.other_requirements}\n`;
          descriptionContent += "\n";
        }
      });
    }

    // 공통 지원자격
    if (job.common_requirements) {
      descriptionContent += `# 공통 지원자격\n${job.common_requirements}\n\n`;
    }

    // 전형절차
    if (job.selection_steps && job.selection_steps.length > 0) {
      descriptionContent += `# 전형절차\n`;
      job.selection_steps.forEach((step, index) => {
        descriptionContent += `## ${step.name || `${index + 1}차 전형`}\n`;
        if (step.details) descriptionContent += `${step.details}\n`;
        if (step.schedule) descriptionContent += `- 일정: ${step.schedule}\n`;
        if (step.note) descriptionContent += `- 비고: ${step.note}\n`;
        descriptionContent += "\n";
      });
    }

    // 지원방법
    if (job.application_method) {
      descriptionContent += `# 지원방법\n${job.application_method}\n\n`;
    }

    // 제출서류
    if (job.required_docs) {
      descriptionContent += `# 제출서류\n${job.required_docs}\n\n`;
    }

    // 기타사항
    if (job.other_info) {
      descriptionContent += `# 기타사항\n${job.other_info}\n\n`;
    }

    // 마크다운으로 변환하여 렌더링
    const descriptionElement = document.getElementById("jobDescriptionContent");
    if (descriptionElement) {
      descriptionElement.innerHTML = parseMarkdown(descriptionContent);
    }

    // 채용 모집 정보 렌더링
    const recrContent = document.getElementById("jobRecruitmentInfo");
    if (recrContent && job.recruitment_info.length > 0) {
      recrContent.innerHTML = job.recruitment_info
        .map(
          (info) => `
        <div class="border rounded-lg p-4 mb-4">
          <h4 class="font-semibold text-lg mb-2">${
            info.title || "모집분야"
          }</h4>
          <ul class="space-y-2">
            <li>직무내용: ${info.job_description || "-"}</li>
            <li>근무지역: ${info.work_location || "-"}</li>
            <li>자격요건: ${info.career || "-"} / ${info.education || "-"}</li>
            <li>기타요건: ${info.other_requirements || "-"}</li>
            <li>모집인원: ${info.headcount || "-"}명</li>
            ${info.note ? `<li>비고: ${info.note}</li>` : ""}
          </ul>
        </div>
      `
        )
        .join("");
    }

    // 전형 단계 정보 렌더링
    const stepsContent = document.getElementById("jobSelectionSteps");
    if (stepsContent && job.selection_steps.length > 0) {
      stepsContent.innerHTML = job.selection_steps
        .map(
          (step, index) => `
        <div class="flex items-start space-x-4 mb-4">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
            ${index + 1}
          </div>
          <div>
            <h5 class="font-semibold">${step.name || `${index + 1}차 전형`}</h5>
            <p>${step.details || "-"}</p>
            <p class="text-sm text-gray-600">일정: ${
              step.schedule || "미정"
            }</p>
            ${
              step.note
                ? `<p class="text-sm text-gray-500">비고: ${step.note}</p>`
                : ""
            }
          </div>
        </div>
      `
        )
        .join("");
    }

    // 면접 데이터 저장
    window.__selectedJob = {
      id: job.id,
      title: job.title,
      company_name: job.company_name,
      employment_type: job.employment_type,
      recruitment_info: job.recruitment_info,
      common_requirements: job.common_requirements,
    };
  } catch (error) {
    console.error("상세 에러:", error);
    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = `
        <div class="text-center py-10">
          <h2 class="text-xl mb-4">데이터를 불러오는데 실패했습니다</h2>
          <button onclick="location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded">
            새로고침
          </button>
        </div>
      `;
    }
  }
}

// 면접 시작
function startInterviewWithJob() {
  const payload = window.__selectedJob;
  if (!payload) {
    alert("상세 정보가 없습니다.");
    return;
  }
  localStorage.setItem("selectedJob", JSON.stringify(payload));
  location.href = "/user-input";
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", renderJobDetail);
function startInterviewWithJob() {
  const payload = window.__selectedJob;
  if (!payload) {
    alert("상세 정보가 없습니다.");
    return;
  }
  localStorage.setItem("selectedJob", JSON.stringify(payload));
  location.href = "/user-input";
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", renderJobDetail);
