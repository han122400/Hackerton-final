/* job_detail.js — 원본 JSON 섹션 완전 제거
   - raw에서 쓰던 정보는 전부 바깥 섹션으로 재배치
   - empSelfintroList / empSelsList 보기 좋게 카드/목록화 (한국어 라벨)
   - coClcdNm → "기업구분"으로 표시
   - 버튼 클릭 시 { id, item, detail } 통째로 localStorage 저장 → /user-input 이동
*/

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const setHTML = (id, h) => {
  const el = $(id);
  if (el) el.innerHTML = h;
};
const setText = (id, t) => {
  const el = $(id);
  if (el) el.textContent = t;
};
const show = (id) => {
  const el = $(id);
  if (el) el.classList.remove("d-none");
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const isImg = (u) =>
  /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(u) || /getImage\.do/i.test(u);
const linkify = (s) => {
  if (!s) return "";
  return esc(String(s))
    .replace(/(https?:\/\/[^\s<>"']+)/gi, (m) =>
      isImg(m)
        ? `<div class="my-2"><img src="${m}" class="img-fluid rounded border" loading="lazy"/></div>`
        : `<a href="${m}" target="_blank" rel="noopener">${m}</a>`
    )
    .replace(/\r?\n/g, "<br>");
};
const fmtYMD = (s) => {
  const t = String(s || "").replace(/\D/g, "");
  return t.length === 8
    ? `${t.slice(0, 4)}.${t.slice(4, 6)}.${t.slice(6, 8)}`
    : s ?? "";
};
const tryJSON = (s) => {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t || ("{" !== t[0] && "[" !== t[0])) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
};
const getParam = (...keys) => {
  const q = new URLSearchParams(location.search);
  for (const k of keys) {
    const v = q.get(k);
    if (v) return v;
  }
  return null;
};
const getJobId = () =>
  getParam("id", "empSeqno", "empSeqNo", "seq", "empSeq", "wantedAuthNo");

/* ---------- fetch & unwrap ---------- */
async function jfetch(u) {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return r.json();
}
function unwrapItem(resp) {
  return resp?.item ?? resp?.data ?? resp?.detail ?? resp?.result ?? resp;
}
function unwrapDetail(it) {
  return it?.raw?.detail || it?.raw?.data || it?.raw || it?.detail || it;
}

async function fetchDetail(id) {
  if (window.API?.getJobDetail) {
    try {
      const r = await window.API.getJobDetail(id);
      const it = unwrapItem(r);
      if (it) return it;
    } catch {}
  }
  const cand = [
    `/api/jobs/${encodeURIComponent(id)}`,
    `/api/jobs/detail?id=${encodeURIComponent(id)}`,
    `/api/job-detail?id=${encodeURIComponent(id)}`,
    `/api/job/${encodeURIComponent(id)}`,
    `/api/jobs?id=${encodeURIComponent(id)}`,
    `/api/jobs?empSeqno=${encodeURIComponent(id)}`,
  ];
  for (const u of cand) {
    try {
      const it = unwrapItem(await jfetch(u));
      if (it) return it;
    } catch {}
  }
  throw new Error("상세 API 응답 없음");
}

/* ---------- header ---------- */
function renderHeader(job) {
  const logo = job.regLogImgNm || job.company_logo;
  if (logo) {
    setHTML(
      "companyLogo",
      `<img src="${esc(logo)}" alt="${esc(
        job.empBusiNm || job.company || ""
      )}" style="width:100%;height:100%;object-fit:contain">`
    );
  } else {
    setHTML(
      "companyLogo",
      `<span class="text-primary fw-bold fs-3">${esc(
        (job.empBusiNm || job.company || "C").slice(0, 1)
      )}</span>`
    );
  }
  setText("jobTitle", job.empWantedTitle || job.title || job.empRecrNm || "-");
  setText("jobCompany", job.empBusiNm || job.company || "-");

  const corpType = job.coClcdNm; // 기업구분
  if (corpType) {
    const pill = $("corpType");
    setText("corpType", `기업구분 · ${corpType}`);
    show("corpType");
  }

  const region =
    job.workRegionNm ||
    job.region ||
    [job.region1, job.region2].filter(Boolean).join(" ") ||
    "지역 정보 없음";
  setText("jobLocation", `근무지 · ${region}`);

  const start = job.empWantedStdt,
    end = job.empWantedEndt || job.empWantedCloseDt || job.endDate;
  const period =
    start || end
      ? `${fmtYMD(start) || ""}${start && end ? " ~ " : ""}${fmtYMD(end) || ""}`
      : "상시채용";
  setText("jobDeadline", `접수기간 · ${period}`);

  const empType =
    job.empWantedTypeNm || job.employmentType || job.empWantedCareerNm || "";
  if (empType) {
    setText("jobEmpType", `고용형태 · ${empType}`);
    show("jobEmpType");
  }
}

/* ---------- 기본 정보(요약) ---------- */
function renderBasicInfo(job, detail) {
  const kv = {};
  if (job.empSeqno) kv["공고번호"] = job.empSeqno;
  if (job.empWantedTitle) kv["공고명"] = job.empWantedTitle;
  if (job.empBusiNm) kv["회사명"] = job.empBusiNm;
  if (job.coClcdNm) kv["기업구분"] = job.coClcdNm;
  if (detail.workRegionNm || job.workRegionNm)
    kv["근무지역"] = detail.workRegionNm || job.workRegionNm;
  if (job.empWantedTypeNm) kv["고용형태"] = job.empWantedTypeNm;
  if (job.empWantedStdt) kv["접수 시작일"] = fmtYMD(job.empWantedStdt);
  if (job.empWantedEndt || job.empWantedCloseDt)
    kv["접수 마감일"] = fmtYMD(job.empWantedEndt || job.empWantedCloseDt);

  if (Object.keys(kv).length) {
    show("basicInfoSection");
    const rows = Object.entries(kv)
      .map(
        ([k, v]) =>
          `<tr><th class="text-nowrap pe-3">${esc(k)}</th><td>${esc(
            String(v)
          )}</td></tr>`
      )
      .join("");
    setHTML(
      "basicInfoBody",
      `<table class="table table-sm kv-table mb-0"><tbody>${rows}</tbody></table>`
    );
  }
}

/* ---------- 주요 텍스트 섹션 ---------- */
function cardSection(title, html) {
  if (!html || !String(html).trim()) return "";
  return `<section class="card shadow-soft rounded-16 border-0 section-card">
    <div class="card-body"><h3>${esc(
      title
    )}</h3><div class="desc">${html}</div></div></section>`;
}
function renderTextSections(detail) {
  const mapping = [
    ["empnRecrSummaryCont", "모집 요약"],
    ["recrCommCont", "응시자격/안내"],
    ["empSubmitDocCont", "제출서류"],
    ["empRcptMthdCont", "접수방법"],
    ["empAcptPsnAnncCont", "합격자 발표/유의"],
    ["inqryCont", "문의"],
    ["empnEtcCont", "기타"],
  ];
  const parts = [];
  for (const [k, title] of mapping) {
    const v = detail[k];
    if (v && String(v).trim()) parts.push(cardSection(title, linkify(v)));
  }
  setHTML("sections", parts.join(""));
}

/* ---------- 모집분야 ---------- */
function renderRecruitList(detail) {
  const src = detail.empRecrList?.empRecrListInfo || detail.empRecrListInfo;
  const list = src ? (Array.isArray(src) ? src : [src]) : [];
  if (!list.length) return;
  show("recruitListSection");
  const html = list
    .map((it, idx) => {
      const title = it.empRecrNm || it.duty || `모집분야 #${idx + 1}`;
      const kv = [];
      if (it.workRegionNm) kv.push(row("근무지", it.workRegionNm));
      if (it.empWantedCareerNm) kv.push(row("경력", it.empWantedCareerNm));
      if (it.empWantedEduNm) kv.push(row("학력", it.empWantedEduNm));
      if (it.sptCertEtc) kv.push(row("자격(기타)", it.sptCertEtc));
      if (it.recrPsncnt) kv.push(row("모집인원", it.recrPsncnt));
      const table = kv.length
        ? `<div class="table-responsive"><table class="table table-sm kv-table mb-0"><tbody>${kv.join(
            ""
          )}</tbody></table></div>`
        : "";
      const desc = it.jobCont || it.jobDescription || it.empRecrMemoCont;
      const step = it.selsCont;

      return `<article class="card shadow-soft rounded-16 border-0">
      <div class="card-body">
        <h4 class="h6 fw-semibold mb-2">${esc(title)}</h4>
        ${table}
        ${desc ? cardSection("직무내용", linkify(desc)) : ""}
        ${step ? cardSection("전형 안내", linkify(step)) : ""}
      </div>
    </article>`;
    })
    .join("");
  setHTML("recruitListBody", html);

  function row(k, v) {
    return `<tr><th class="text-nowrap pe-3">${esc(k)}</th><td>${esc(
      String(v)
    )}</td></tr>`;
  }
}

/* ---------- 전형 절차/일정 (empSelsList) ---------- */
function renderProcess(detail) {
  const src = detail.empSelsList?.empSelsListInfo || detail.empSelsListInfo;
  const list = src ? (Array.isArray(src) ? src : [src]) : [];
  // selfintroQstCont는 제외하고, 전형 단계만 추림
  const steps = list.filter(
    (it) =>
      it && (it.selsNm || it.selsSchdCont || it.selsCont || it.selsMemoCont)
  );
  if (!steps.length) return;
  show("processSection");
  const body = steps
    .map(
      (it, i) => `
    <div class="border rounded-16 p-3 bg-white">
      <div class="small text-secondary"><span class="step-dot"></span>단계 ${
        i + 1
      }${it.selsNm ? ` · <strong>${esc(it.selsNm)}</strong>` : ""}</div>
      ${
        it.selsSchdCont
          ? `<div class="mt-1">${linkify(it.selsSchdCont)}</div>`
          : ""
      }
      ${it.selsCont ? `<div class="mt-1">${linkify(it.selsCont)}</div>` : ""}
      ${
        it.selsMemoCont
          ? `<div class="mt-1 text-secondary small">${linkify(
              it.selsMemoCont
            )}</div>`
          : ""
      }
    </div>
  `
    )
    .join("");
  setHTML("processBody", body);
}

/* ---------- 자기소개(문항) (empSelfintroList 또는 empSelsList 내부 selfintroQstCont) ---------- */
function renderSelfIntro(detail) {
  let items = [];
  // 1) empSelfintroList가 배열/문자 가능
  if (
    Array.isArray(detail.empSelfintroList) &&
    detail.empSelfintroList.length
  ) {
    items = detail.empSelfintroList.map(String);
  } else if (typeof detail.empSelfintroList === "string") {
    const parsed = tryJSON(detail.empSelfintroList);
    if (parsed) {
      if (Array.isArray(parsed)) items = parsed.map(String);
      else items = Object.values(parsed).map(String);
    } else {
      items = String(detail.empSelfintroList)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  // 2) empSelsList 내부 selfintroQstCont
  if (!items.length) {
    const src = detail.empSelsList?.empSelsListInfo || detail.empSelsListInfo;
    const arr = src ? (Array.isArray(src) ? src : [src]) : [];
    items = arr
      .map((it) => it?.selfintroQstCont)
      .filter(Boolean)
      .map(String);
  }
  if (!items.length) return;
  show("selfIntroSection");
  setHTML("selfIntroBody", items.map((t) => `<li>${linkify(t)}</li>`).join(""));
}

/* ---------- 직종 ---------- */
function renderJobsCode(detail) {
  const src = detail.empJobsList?.empJobsListInfo || detail.empJobsListInfo;
  const list = src ? (Array.isArray(src) ? src : [src]) : [];
  if (!list.length) return;
  show("jobsCodeSection");
  setHTML(
    "jobsCodeBody",
    list
      .map(
        (j) => `
    <div class="col">
      <div class="border rounded p-2 h-100 bg-white">
        <span class="badge badge-soft mb-1">코드: ${esc(j.jobsCd || "-")}</span>
        <div class="fw-semibold">${esc(j.jobsCdKorNm || "-")}</div>
      </div>
    </div>
  `
      )
      .join("")
  );
}

/* ---------- 첨부파일 ---------- */
function renderAttachments(detail) {
  const src = detail.regFileList?.regFileListInfo || detail.regFileListInfo;
  const files = src ? (Array.isArray(src) ? src : [src]) : [];
  if (!files.length) return;
  show("attachmentsSection");
  setHTML(
    "attachmentsBody",
    files
      .map((f, i) => {
        const name = f.regFileNm || f.fileNm || `첨부파일 ${i + 1}`;
        const url = f.regFilePath || f.fileUrl || f.url;
        if (!url) return `<div class="text-secondary small">${esc(name)}</div>`;
        if (isImg(url))
          return `<div><div class="small mb-1">${esc(
            name
          )}</div><img src="${esc(url)}" alt="${esc(
            name
          )}" class="img-fluid rounded border"/></div>`;
        return `<a class="link-primary" href="${esc(
          url
        )}" target="_blank" rel="noopener">${esc(name)}</a>`;
      })
      .join("")
  );
}

/* ---------- 관련 링크 (중복 제거) ---------- */
function extractUrlsFromText(s) {
  if (!s) return [];
  const m = String(s).match(/https?:\/\/[^\s<>"']+/g);
  return m ? m : [];
}
function collectLinks(detail, job) {
  const pool = new Set();
  [
    job?.empWantedHomepgDetail,
    job?.empWantedMobileUrl,
    job?.empWantedHomepg,
    detail?.empWantedHomepgDetail,
    detail?.empWantedMobileUrl,
    detail?.empWantedHomepg,
    detail?.empnRecrSummaryCont,
    detail?.recrCommCont,
    detail?.empSubmitDocCont,
    detail?.empRcptMthdCont,
    detail?.inqryCont,
    detail?.empnEtcCont,
  ]
    .filter(Boolean)
    .forEach((v) => extractUrlsFromText(v).forEach((u) => pool.add(u)));
  return [...pool];
}
function renderLinks(detail, job) {
  const urls = collectLinks(detail, job);
  if (!urls.length) return;
  show("linksSection");
  setHTML(
    "linksBody",
    urls
      .map(
        (u) =>
          `<a href="${esc(
            u
          )}" target="_blank" rel="noopener" class="text-decoration-none">${esc(
            u
          )}</a>`
      )
      .join("")
  );
}

/* ---------- CTA: 저장 & 이동 ---------- */
function bindInterviewButtons(item, detail) {
  const payload = {
    id: getJobId(),
    item,
    detail: unwrapDetail(item) || detail || {},
  };
  const go = () => {
    try {
      localStorage.setItem("selectedJob", JSON.stringify(payload));
      location.href = "/user-input";
    } catch (e) {
      console.error(e);
      alert("페이지 이동 중 문제가 발생했습니다.");
    }
  };
  $("interviewBtn")?.addEventListener("click", go);
  $("interviewBtnMobile")?.addEventListener("click", go);
}

/* ---------- main ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const id = getJobId();
    if (!id) throw new Error("공고 ID가 없습니다.");
    const item = await fetchDetail(id);
    renderHeader(item);

    const detail = unwrapDetail(item) || {};
    // 순서대로 렌더
    renderBasicInfo(item, detail);
    renderTextSections(detail);
    renderRecruitList(detail);
    renderProcess(detail);
    renderSelfIntro(detail);
    renderJobsCode(detail);
    renderAttachments(detail);
    renderLinks(detail, item);

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
