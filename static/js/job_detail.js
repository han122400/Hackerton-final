/* job_detail.js — FINAL (수정 완료)
   - 백엔드(item.raw.*)의 중첩된 구조에서 데이터를 정확히 추출하도록 수정
   - workRegionNm(근무지) / selfintroQstList(자소서 문항) 렌더
   - “이 공고로 면접보기” 버튼 라우팅(localStorage 저장)
*/

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
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function linkify(t) {
  if (!t) return "";
  let x = esc(String(t));
  x = x.replace(
    /(https?:\/\/[^\s<>"']+)/gi,
    (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`
  );
  return x.replace(/\r?\n/g, "<br>");
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

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

// ===== 데이터 추출 헬퍼 함수들 =====
function unwrapItem(resp) {
  if (!resp) return null;
  return resp.item || resp.data || resp.detail || resp.result || resp;
}
function unwrapDetail(item) {
  return (
    item?.raw?.dhsOpenEmpInfoDetailRoot || item?.raw || item?.detail || item
  );
}
const ensureList = (x) => (x ? (Array.isArray(x) ? x : [x]) : []);

// ===== API 호출 =====
async function tryFetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function fetchDetail(id) {
  const cands = [`/api/jobs/${encodeURIComponent(id)}`];
  for (const u of cands) {
    try {
      const j = await tryFetchJSON(u);
      const it = unwrapItem(j);
      if (it) return it;
    } catch {}
  }
  throw new Error("상세 API 응답 없음");
}

function fmtDeadline(d) {
  const dd = onlyDigits(d);
  if (!dd || dd.length !== 8) return "상시채용";
  return `${dd.slice(0, 4)}.${dd.slice(4, 6)}.${dd.slice(6, 8)}`;
}

/* ====== 렌더링 함수들 (수정된 부분) ====== */

function renderHeader(item, detail) {
  const title = detail.empWantedTitle || item.title || "-";
  const company = detail.empBusiNm || item.company || "-";
  const endDate = detail.empWantedEndt || item.endDate || "";
  const regLogo = detail.regLogImgNm || item.regLogImgNm || "";
  const empType = detail.empWantedTypeNm || item.empWantedTypeNm || "";
  const region = item.workRegionNm || "-"; // 백엔드 합성값 사용

  // 로고
  if (regLogo) {
    setHTML(
      "companyLogo",
      `<img src="${esc(regLogo)}" alt="${esc(
        company
      )}" style="width:100%;height:100%;object-fit:contain" />`
    );
  } else {
    setHTML(
      "companyLogo",
      `<span class="fw-bold fs-3 text-primary">${esc(
        (company || "C").slice(0, 1)
      )}</span>`
    );
  }

  setText("jobTitle", title);
  setText("jobCompany", company);
  setText("jobLocation", region);
  setText("jobDeadline", fmtDeadline(endDate));

  if (empType) {
    setText("jobEmpType", empType);
    show("jobEmpType");
  }
}

function renderLinks(detail) {
  const mobileUrl = detail.empWantedMobileUrl || "";
  const webUrl = detail.empWantedHomepgDetail || "";
  const openUrl = mobileUrl || webUrl || "";
  if (openUrl) {
    setHTML(
      "linksBody",
      `<a class="btn btn-outline-primary" href="${esc(
        openUrl
      )}" target="_blank" rel="noopener">채용 사이트 열기</a>`
    );
    show("linksSection");
  }
}

function renderTextSections(detail) {
  const sections = $("sections");
  if (!sections) return;
  const buckets = [
    ["공통요건", detail.recrCommCont],
    ["제출서류/접수방법", detail.required_docs || detail.application_method],
    [
      "문의/기타",
      [detail.inquiry, detail.other_info].filter(Boolean).join("\n\n"),
    ],
  ];
  sections.innerHTML = buckets
    .filter(([, content]) => content && String(content).trim())
    .map(
      ([title, content]) => `
        <section class="card rounded-16 shadow-soft border-0 section-card">
          <div class="card-body">
            <h3>${esc(title)}</h3>
            <div class="desc"><pre>${linkify(content)}</pre></div>
          </div>
        </section>`
    )
    .join("");
}

function renderRecruitList(detail) {
  const list = ensureList(detail.empRecrList?.empRecrListInfo);
  if (list.length > 0) {
    const html = list
      .map(
        (it) => `
      <div class="border rounded p-3 bg-white">
        <div class="fw-semibold mb-1">${esc(it.empRecrNm || "모집분야")}</div>
        <div class="small text-secondary">
          ${
            it.empWantedCareerNm
              ? `<span>경력: ${esc(it.empWantedCareerNm)}</span>`
              : ""
          }
          ${
            it.empWantedEduNm
              ? `<span class="ms-2">학력: ${esc(it.empWantedEduNm)}</span>`
              : ""
          }
        </div>
        ${
          it.jobCont
            ? `<div class="mt-2 desc"><pre>${linkify(it.jobCont)}</pre></div>`
            : ""
        }
        ${
          it.sptCertEtc
            ? `<div class="mt-2 small"><b>요건:</b> ${esc(it.sptCertEtc)}</div>`
            : ""
        }
      </div>
    `
      )
      .join("");
    setHTML("recruitListBody", html);
    show("recruitListSection");
  }
}

function renderProcess(detail) {
  const list = ensureList(detail.empSelsList?.empSelsListInfo);
  if (list.length > 0) {
    const html = list
      .map(
        (it) => `
          <div><span class="step-dot"></span><strong>${esc(it.selsNm)}</strong>
          ${
            it.selsCont
              ? `<div class="text-secondary small ps-4">${linkify(
                  it.selsCont
                )}</div>`
              : ""
          }
          </div>
      `
      )
      .join("");
    setHTML("processBody", html);
    show("processSection");
  }
}

function renderSelfIntro(item) {
  const list = item.selfintroQstList || [];
  if (list.length > 0) {
    const html = list
      .map(
        (q, i) => `<li><strong class="me-2">Q${i + 1}.</strong> ${esc(q)}</li>`
      )
      .join("");
    setHTML("selfIntroBody", html);
    show("selfIntroSection");
  }
}

function renderJobsCode(detail) {
  const list = ensureList(detail.empJobsList?.empJobsListInfo);
  if (list.length > 0) {
    const html = list
      .map(
        (j) => `
            <div class="col">
                <div class="border rounded p-2 bg-light h-100">${esc(
                  j.jobsCdKorNm
                )}</div>
            </div>
        `
      )
      .join("");
    setHTML("jobsCodeBody", html);
    show("jobsCodeSection");
  }
}

/* 면접 라우팅: 상세 JSON 저장 → /user-input 이동 */
function bindInterviewButtons(item, detail) {
  // description 필드를 생성하여 user-input 페이지에서 활용
  const description = ensureList(detail.empRecrList?.empRecrListInfo)
    .map(
      (it) =>
        `[${it.empRecrNm || "모집분야"}]\n${it.jobCont || ""}\n요건: ${
          it.sptCertEtc || ""
        }`
    )
    .join("\n\n");

  const payload = {
    id: getJobId(),
    job: {
      title: detail.empWantedTitle || item.title,
      company: detail.empBusiNm || item.company,
    },
    description: description || detail.recrCommCont || "",
  };
  const go = () => {
    try {
      localStorage.setItem("selectedJob", JSON.stringify(payload));
      location.href = "/user-input";
    } catch (e) {
      console.error("route to /user-input failed:", e);
      alert("면접 페이지로 이동 중 문제가 발생했습니다.");
    }
  };
  $("interviewBtn").onclick = go;
  $("interviewBtnMobile").onclick = go;
}

/* ====== MAIN ====== */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const id = getJobId();
    if (!id) throw new Error("공고 ID가 없습니다.");

    const item = await fetchDetail(id);
    const detail = unwrapDetail(item);

    renderHeader(item, detail);
    renderLinks(detail);
    renderTextSections(detail);
    renderRecruitList(detail);
    renderProcess(detail);
    renderJobsCode(detail);
    renderSelfIntro(item);

    bindInterviewButtons(item, detail);
  } catch (e) {
    console.error("[job-detail] fatal:", e);
    setHTML(
      "sections",
      `<div class="alert alert-danger">상세 데이터를 불러오지 못했습니다.<br><code>${esc(
        e.message || String(e)
      )}</code></div>`
    );
  }
});
