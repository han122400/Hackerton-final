/* job_detail.js — “이 공고로 면접보기” 라우팅 + 상세 JSON 저장 */

function $(id) {
  return document.getElementById(id);
}
function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}
function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}
function show(id) {
  const el = $(id);
  if (el) el.classList.remove("d-none");
}
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function linkify(text) {
  if (!text) return "";
  let t = escapeHtml(String(text));
  const urlRe = /(https?:\/\/[^\s<>"']+)/gi;
  t = t.replace(
    urlRe,
    (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`
  );
  return t.replace(/\r?\n/g, "<br>");
}
function getParam(...keys) {
  const qs = new URLSearchParams(location.search);
  for (const k of keys) {
    const v = qs.get(k);
    if (v) return v;
  }
  return null;
}
function getJobId() {
  return getParam("id", "empSeqno", "empSeqNo", "seq", "empSeq");
}

async function tryFetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
function unwrapItem(resp) {
  if (!resp) return null;
  if (resp.item) return resp.item;
  if (resp.data) return resp.data;
  if (resp.detail) return resp.detail;
  if (resp.result) return resp.result;
  return resp;
}
function unwrapDetail(item) {
  return (
    item?.raw?.detail || item?.raw?.data || item?.raw || item?.detail || item
  );
}

async function fetchDetail(id) {
  // 1) 커스텀 API가 있으면 우선 사용
  if (window.API?.getJobDetail) {
    try {
      const res = await window.API.getJobDetail(id);
      const it = unwrapItem(res);
      if (it) return it;
    } catch (e) {
      console.warn("API.getJobDetail failed:", e);
    }
  }
  // 2) 추정 가능한 엔드포인트 후보들 차례로 시도
  const candidates = [
    `/api/jobs/${encodeURIComponent(id)}`,
    `/api/jobs/detail?id=${encodeURIComponent(id)}`,
    `/api/job-detail?id=${encodeURIComponent(id)}`,
    `/api/job/${encodeURIComponent(id)}`,
    `/api/jobs?id=${encodeURIComponent(id)}`,
    `/api/jobs?empSeqno=${encodeURIComponent(id)}`,
  ];
  for (const u of candidates) {
    try {
      const j = await tryFetchJSON(u);
      const it = unwrapItem(j);
      if (it) return it;
    } catch {}
  }
  throw new Error("상세 API 응답 없음");
}

/* ---------- 렌더 (필요 최소만 유지: 상단 요약 + 나머지는 원래대로 컨테이너에 렌더) ---------- */
function renderHeader(job) {
  // 로고
  const logoBox = $("companyLogo");
  if (logoBox) {
    if (job.company_logo) {
      logoBox.innerHTML = `<img src="${escapeHtml(
        job.company_logo
      )}" alt="${escapeHtml(
        job.company || ""
      )}" style="width:100%;height:100%;object-fit:contain" />`;
    } else {
      logoBox.innerHTML = `<span class="fw-bold fs-3 text-primary">${escapeHtml(
        (job.company || job.empBusiNm || "C").slice(0, 1)
      )}</span>`;
    }
  }
  // 텍스트
  const title = job.title || job.empWantedTitle || job.empRecrNm || "-";
  const company = job.company || job.empBusiNm || "-";
  setText("jobTitle", title);
  setText("jobCompany", company);

  const region =
    job.region ||
    [job.region1, job.region2].filter(Boolean).join(" ") ||
    job.workRegionNm ||
    "지역 정보 없음";
  setText("jobLocation", region);

  const endRaw = job.endDate || job.empWantedCloseDt;
  let deadline = "상시채용";
  if (endRaw) {
    const s = String(endRaw).replace(/\D/g, "");
    if (s.length === 8)
      deadline = `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
    else deadline = String(endRaw);
  }
  setText("jobDeadline", deadline);

  const empType =
    job.employmentType || job.empWantedCareerNm || job.empWantedTypeNm || "";
  if (empType) {
    setText("jobEmpType", empType);
    show("jobEmpType");
  }
}

/* 아래 4개는 프로젝트 기존 렌더 함수를 쓰고 있다면 그대로 두세요.
   여기서는 안전한 기본 구현만 둡니다. */
function renderTextSections(detail) {
  const sections = $("sections");
  if (!sections) return;
  const buckets = [
    [
      "응시자격/안내",
      detail.qualifications ||
        detail.hopeWage ||
        detail.preferrential ||
        detail.etc ||
        "",
    ],
    ["채용예정인원", detail.collectPsncnt || detail.emplymShp || ""],
    ["제출서류", detail.submission || detail.empWantedFile || ""],
    ["접수방법", detail.receipt || detail.empWantedHomepgDetail || ""],
    ["문의", detail.contact || detail.empWantedMngrNm || ""],
  ];
  sections.innerHTML = buckets
    .filter(([, html]) => html)
    .map(
      ([title, html]) => `
      <section class="card shadow-sm rounded-16">
        <div class="card-body">
          <h3 class="h6 fw-semibold mb-3">${escapeHtml(title)}</h3>
          <div class="desc">${linkify(html)}</div>
        </div>
      </section>
    `
    )
    .join("");
}
function renderRecruitList(detail) {
  const box = $("recruitListSection");
  const body = $("recruitListBody");
  const list = Array.isArray(detail.empRecrList) ? detail.empRecrList : null;
  if (!box || !body || !list || list.length === 0) {
    return;
  }
  box.classList.remove("d-none");
  body.innerHTML = list
    .map(
      (it) => `
    <div class="border rounded p-3 bg-white">
      <div class="fw-semibold mb-1">${escapeHtml(
        it.recrAreaNm || it.duty || "모집분야"
      )}</div>
      <div class="small text-secondary">${escapeHtml(
        it.recrCnt ? `인원: ${it.recrCnt}` : ""
      )}</div>
      ${
        it.recrCont
          ? `<div class="mt-2 desc">${linkify(it.recrCont)}</div>`
          : ""
      }
    </div>
  `
    )
    .join("");
}
function renderJobsCode(detail) {
  const box = $("jobsCodeSection");
  const body = $("jobsCodeBody");
  const arr = Array.isArray(detail.jobsCdList) ? detail.jobsCdList : null;
  if (!box || !body || !arr || arr.length === 0) return;
  box.classList.remove("d-none");
  body.innerHTML = arr
    .map(
      (j) => `
    <div class="col">
      <div class="border rounded p-3 bg-white h-100">
        <div class="fw-semibold">${escapeHtml(
          j.jobsCdNm || j.jobsNm || "직종"
        )}</div>
        <div class="small text-secondary">${escapeHtml(j.jobsCd || "")}</div>
      </div>
    </div>
  `
    )
    .join("");
}
function renderAttachments(detail) {
  const box = $("attachmentsSection");
  const body = $("attachmentsBody");
  const files = Array.isArray(detail.fileList) ? detail.fileList : null;
  if (!box || !body || !files || files.length === 0) return;
  box.classList.remove("d-none");
  body.innerHTML = files
    .map(
      (f) => `
    <div class="d-flex align-items-center justify-content-between border rounded p-2 bg-white">
      <div class="me-3 text-truncate">${escapeHtml(
        f.fileNm || f.name || "첨부파일"
      )}</div>
      <a class="btn btn-outline-primary btn-sm" href="${escapeHtml(
        f.fileUrl || f.url || "#"
      )}" target="_blank" rel="noopener">열기</a>
    </div>
  `
    )
    .join("");
}
function renderRawAll(detail) {
  const el = $("rawAllBody");
  if (!el) return;
  try {
    el.innerHTML = `<pre class="mb-0">${escapeHtml(
      JSON.stringify(detail, null, 2)
    )}</pre>`;
  } catch {
    el.textContent = "[상세 JSON 출력 실패]";
  }
}

/* -------- 면접 라우팅: 공고 JSON 저장 → /interview 로 이동 -------- */
function bindInterviewButtons(item, detailObj) {
  const payload = {
    id: getJobId(),
    item,
    detail: unwrapDetail(item) || detailObj || {},
  };
  const go = () => {
    try {
      // 🔸 localStorage에 저장 (interview.js가 selectedJob을 사용 중)
      localStorage.setItem("selectedJob", JSON.stringify(payload));
      // 이동
      location.href = "/user-input";
    } catch (e) {
      console.error("route to /interview failed:", e);
      alert("면접 페이지로 이동 중 문제가 발생했습니다.");
    }
  };
  const pcBtn = $("interviewBtn");
  const moBtn = $("interviewBtnMobile");
  if (pcBtn) pcBtn.onclick = go;
  if (moBtn) moBtn.onclick = go;
}

/* -------- 메인 -------- */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const id = getJobId();
    if (!id) throw new Error("공고 ID가 없습니다.");
    const item = await fetchDetail(id);
    renderHeader(item);

    const detail = unwrapDetail(item);
    renderTextSections(detail);
    renderRecruitList(detail);
    renderJobsCode(detail);
    renderAttachments(detail);
    renderRawAll(detail);

    bindInterviewButtons(item, detail);
  } catch (e) {
    console.error("[job-detail] fatal:", e);
    setHTML(
      "rawAllBody",
      `<div class="alert alert-danger">상세 데이터를 불러오지 못했습니다.<br><code>${escapeHtml(
        e.message || String(e)
      )}</code></div>`
    );
  }
});
