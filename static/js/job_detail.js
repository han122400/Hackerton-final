// URL 파라미터
function getJobId() {
  return new URLSearchParams(location.search).get("id");
}
function goBack() {
  location.href = "/job-list";
}

// 간단 마크다운 변환 → Bootstrap 타이포 스타일에 맞춰 최소 변환
function md(markdown) {
  if (!markdown) return "";
  let html = markdown
    .replace(/^### (.*$)/gim, '<h5 class="fw-semibold mt-4 mb-2">$1</h5>')
    .replace(/^## (.*$)/gim, '<h5 class="fw-semibold mt-4 mb-2">$1</h5>')
    .replace(/^# (.*$)/gim, '<h4 class="fw-bold mt-4 mb-2">$1</h4>')
    .replace(/^\- (.*$)/gim, "<li>$1</li>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n$/gim, "<br/>");
  // <li> wrap
  html = html.replace(
    /(<li>.*<\/li>)/gis,
    '<ul class="list-unstyled ps-3 mb-2">$1</ul>'
  );
  return html;
}

async function loadJobDetail() {
  const id = getJobId();
  if (!id) {
    alert("잘못된 접근입니다.");
    location.href = "/job-list";
    return;
  }

  const job = window.API?.getJobDetail
    ? await window.API.getJobDetail(id)
    : await fetch(`/api/jobs/${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((j) => j.item);

  // 헤더
  const logoWrap = document.getElementById("companyLogo");
  if (job.company_logo) {
    logoWrap.innerHTML = `<img src="${job.company_logo}" alt="${
      job.company || ""
    }" style="width:100%;height:100%;object-fit:contain">`;
  } else {
    logoWrap.innerHTML = `<span class="text-primary fw-bold fs-3">${(
      job.company || "C"
    ).slice(0, 1)}</span>`;
  }
  document.getElementById("jobTitle").textContent =
    job.title || job.empWantedTitle || "-";
  document.getElementById("jobCompany").textContent =
    job.company || job.empBusiNm || "-";

  // 위치/마감
  const regionText =
    job.region ||
    [job.region1, job.region2].filter(Boolean).join(" ") ||
    job.workRegionNm ||
    "지역 정보 없음";
  document.getElementById("jobLocation").textContent = regionText;
  const deadlineTxt = job.endDate
    ? `~${job.endDate.slice(4, 6)}.${job.endDate.slice(6, 8)}`
    : "상시채용";
  document.getElementById("jobDeadline").textContent = deadlineTxt;

  // 지원 버튼
  const applyHref = job.apply_url || job.empWantedHomepg || "#";
  document.getElementById("applyButton").href = applyHref;
  document.getElementById("applyButtonMobile").href = applyHref;

  // 태그
  const tagsWrap = document.getElementById("jobTags");
  const pills = [];
  if (job.employmentType) pills.push(job.employmentType);
  if (job.employment_status) pills.push(job.employment_status);
  if (Array.isArray(job.tags)) pills.push(...job.tags);
  tagsWrap.innerHTML = pills.length
    ? pills
        .map((t) => `<span class="badge text-bg-light border">${t}</span>`)
        .join("")
    : `<span class="text-secondary">태그 정보 없음</span>`;

  // 본문(모집 요약/분야/지원자격/우대/전형/유의/첨부 등)
  let descriptionContent = "";

  if (job.recruitment_summary)
    descriptionContent += `# 모집 요약\n${job.recruitment_summary}\n\n`;

  if (job.recruitment_info && job.recruitment_info.length) {
    job.recruitment_info.forEach((info) => {
      descriptionContent += `# ${info.title || "모집분야"}\n`;
      if (info.job_description)
        descriptionContent += `## 직무내용\n${info.job_description}\n\n`;
      if (info.work_location)
        descriptionContent += `## 근무지역\n${info.work_location}\n\n`;
      if (info.career || info.education || info.other_requirements) {
        descriptionContent += `## 자격요건\n`;
        if (info.career) descriptionContent += `- 경력: ${info.career}\n`;
        if (info.education) descriptionContent += `- 학력: ${info.education}\n`;
        if (info.other_requirements)
          descriptionContent += `- 기타: ${info.other_requirements}\n`;
        descriptionContent += `\n`;
      }
      if (info.headcount)
        descriptionContent += `## 모집인원\n${info.headcount}명\n\n`;
      if (info.note) descriptionContent += `## 비고\n${info.note}\n\n`;
    });
  }

  if (job.qualification)
    descriptionContent += `# 지원자격\n${job.qualification}\n\n`;
  if (job.preferred) descriptionContent += `# 우대사항\n${job.preferred}\n\n`;
  if (job.selection_process)
    descriptionContent += `# 전형절차\n${job.selection_process}\n\n`;
  if (job.caution) descriptionContent += `# 유의사항\n${job.caution}\n\n`;

  // 첨부파일 (워크넷 등)
  if (job.raw && job.raw.regFileList) {
    const list = Array.isArray(job.raw.regFileList.regFileListInfo)
      ? job.raw.regFileList.regFileListInfo
      : [job.raw.regFileList.regFileListInfo];
    if (list && list.length) {
      descriptionContent += `# 첨부파일\n`;
      descriptionContent +=
        list.map((f) => `- ${f.regFileNm || "첨부파일"}`).join("\n") + "\n\n";
    }
  }

  document.getElementById("jobDescriptionContent").innerHTML = md(
    descriptionContent || "상세 내용이 없습니다."
  );
}

document.addEventListener("DOMContentLoaded", loadJobDetail);
