// 사용자 입력 페이지 JavaScript — FINAL (핵심 필드만 추출·정규화하여 interviewData 저장)

// 뒤로가기
function goBack() {
  window.location.href = "/";
}

// 안전 문자열
const val = (x) => (x == null ? "" : String(x).trim());

// JSON 파서
function readLocalJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

// 텍스트 요약
function summarizeText(s, len = 400) {
  if (!s) return "";
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > len ? t.slice(0, len) + "…" : t;
}

/** 공고 상세(detail)에서 질문·후처리에 유용한 필드만 정규화 */
function normalizeJobDetail(detail = {}) {
  // 학력
  const educationReq =
    detail.educationReq ||
    detail.empWantedEduNm ||
    detail.qualificationsEdu ||
    detail.qualificationsEduNm ||
    detail.academic ||
    detail.edu ||
    "";

  // 경력
  const experienceReq =
    detail.experienceReq ||
    detail.empWantedCareerNm ||
    detail.eligibilityCareer ||
    detail.career ||
    detail.careerYn ||
    detail.exp ||
    "";

  // 직무설명
  const dutyDesc =
    detail.duty ||
    detail.recrCont ||
    detail.jobCont ||
    detail.jobDescription ||
    detail.mainDuties ||
    detail.task ||
    "";

  // 채용모집명(모집분야명)
  const recruitTitle =
    detail.recruitTitle ||
    detail.empRecrNm ||
    detail.empWantedTitle ||
    detail.empRecrTitle ||
    "";

  // 직종명 (jobsCdList에서 우선)
  let jobName = "";
  if (Array.isArray(detail.jobsCdList) && detail.jobsCdList.length) {
    jobName =
      detail.jobsCdList[0]?.jobsCdNm || detail.jobsCdList[0]?.jobsNm || "";
  }
  if (!jobName) {
    jobName = detail.jobName || detail.jobsNm || "";
  }

  // 고용형태
  const empType =
    detail.empType ||
    detail.employmentType ||
    detail.empWantedTypeNm ||
    detail.emplymShp ||
    "";

  return {
    educationReq: summarizeText(educationReq, 120),
    experienceReq: summarizeText(experienceReq, 160),
    dutyDesc: summarizeText(dutyDesc, 500),
    recruitTitle: summarizeText(recruitTitle, 80),
    jobName: summarizeText(jobName, 80),
    empType: summarizeText(empType, 60),
  };
}

/** 프로필/자소서 요약 (이력서 파일명 있으면 대체) */
function buildResumeAndExtra({ profile, coverLetterData, resumeFile, notes }) {
  const resumeSummaryFromProfile = [profile?.education, profile?.experience]
    .filter(Boolean)
    .join(" ")
    .trim();

  const resume_summary_docx =
    resumeSummaryFromProfile ||
    (resumeFile && resumeFile.name) ||
    "대졸 이상 학력. Figma 사용 능력. 디지털 채널 UX 전략 기획, 화면 설계, 사용자 경험 분석 및 해커톤 참여 경험.";

  const extra_from_cover = coverLetterData?.coverLetter
    ? summarizeText(coverLetterData.coverLetter, 600)
    : "";
  const extra_info =
    (extra_from_cover + " " + (notes || "")).trim() ||
    "Figma 활용 화면 설계, UX 분석 및 서비스 기획, State 관리 및 브라우저 호환성 문제 해결, 해커톤 참여 경험.";

  return { resume_summary_docx, extra_info };
}

// 폼 제출 처리
function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const position = val(formData.get("jobTitle"));
  const companyInForm = val(formData.get("company"));
  const resumeFile = formData.get("resume");
  const notes = val(formData.get("notes"));

  // 최소 입력
  if (!position && !companyInForm) {
    alert("직무 또는 회사 중 최소 하나는 입력해야 합니다.");
    return;
  }

  // 로컬 스토리지
  const profile = readLocalJSON("profileData") || {};
  const coverLetterData = readLocalJSON("coverLetterData") || {};
  const selectedJob = readLocalJSON("selectedJob") || {};
  const jobItem = selectedJob?.item || selectedJob?.job || {};
  const detailRaw = selectedJob?.detail || {};
  const jobDetail = normalizeJobDetail(detailRaw);

  // 화면 표기용: 회사/제목
  const company =
    companyInForm ||
    jobItem.company ||
    detailRaw.empBusiNm ||
    selectedJob.company ||
    "";
  const title =
    jobItem.title ||
    detailRaw.empWantedTitle ||
    detailRaw.empRecrNm ||
    selectedJob.title ||
    position || // 없으면 직무로 대체
    "";

  // 직무명(role) 우선순위: 폼 입력 > 직종명 > 공고 제목 일부
  const role =
    position ||
    jobDetail.jobName ||
    (title && title.length <= 40 ? title : "지원 직무");

  // 요약 텍스트
  const { resume_summary_docx, extra_info } = buildResumeAndExtra({
    profile,
    coverLetterData,
    resumeFile,
    notes,
  });

  // ✅ 최종 interviewData (핵심만, 가볍고 질문에 유용하게)
  const interviewData = {
    role, // 직무명(질문에서 자주 사용)
    company, // 회사명
    title, // 공고 제목
    resume_summary_docx, // 학력/경력 요약 또는 파일명
    extra_info, // 자소서·메모 요약

    // 질문 생성에 필요한 핵심만 포함(덜 중요한 필드는 제외)
    jobDetail: {
      educationReq: jobDetail.educationReq, // 지원자격(학력)
      experienceReq: jobDetail.experienceReq, // 지원자격(경력)
      dutyDesc: jobDetail.dutyDesc, // 직무설명
      recruitTitle: jobDetail.recruitTitle, // 채용모집명
      jobName: jobDetail.jobName, // 직종명
      empType: jobDetail.empType, // 고용형태
    },

    userName: localStorage.getItem("userName") || "",
    resume: resumeFile && resumeFile.name ? resumeFile.name : "",
    startTime: new Date().toISOString(),
    answers: [],
    duration: 0,
  };

  // 로컬 저장
  localStorage.setItem("interviewData", JSON.stringify(interviewData));

  // 서버 전송 (multipart/form-data)
  formData.append("userName", interviewData.userName);
  formData.append("startTime", interviewData.startTime);
  formData.append("answers", JSON.stringify([]));
  formData.append("duration", "0");
  formData.append("interviewData", JSON.stringify(interviewData));

  fetch("/api/user-input", {
    method: "POST",
    body: formData,
  })
    .then((res) => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json().catch(() => ({}));
    })
    .then(() => (window.location.href = "/interview"))
    .catch((err) => {
      console.error("Fetch Error:", err);
      // 실패해도 면접 페이지로 진입 (로컬스토리지는 이미 세팅됨)
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
    if (titleEl)
      titleEl.value = val(p?.job?.title || p?.item?.title || p?.title);
    if (companyEl)
      companyEl.value = val(
        p?.job?.company ||
          p?.item?.company ||
          p?.company ||
          p?.detail?.empBusiNm
      );
  } catch (e) {
    console.warn("selectedJob parse error", e);
  }
}

// DOM 로드 후 초기화
document.addEventListener("DOMContentLoaded", () => {
  hydrateFromSelectedJob();
  const form = document.getElementById("interviewForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  } else {
    console.error("폼 요소(#interviewForm)를 찾을 수 없습니다.");
  }
});
