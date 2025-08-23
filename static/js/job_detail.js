/* ============ job_detail.js (pretty raw-all, KR labels) ============ */

// ---------- DOM helper ----------
function $(id) {
  return document.getElementById(id);
}
function setHTML(id, html) {
  const el = $(id);
  if (!el) {
    console.warn(`#${id} not found`);
    return;
  }
  el.innerHTML = html;
}
function setText(id, text) {
  const el = $(id);
  if (!el) {
    console.warn(`#${id} not found`);
    return;
  }
  el.textContent = text;
}
function show(id) {
  const el = $(id);
  if (el) el.classList.remove("d-none");
}

// ---------- URL 파라미터 ----------
function getParam(...keys) {
  const u = new URLSearchParams(location.search);
  for (const k of keys) {
    const v = u.get(k);
    if (v) return v;
  }
  return null;
}
function getJobId() {
  return getParam("id", "empSeqno", "empSeqNo", "seq", "empSeq");
}

// ---------- 유틸 ----------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function isImageUrl(url) {
  return (
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url) ||
    /getImage\.do/i.test(url)
  );
}
function linkify(rawText) {
  if (!rawText) return "";
  let text = escapeHtml(rawText);
  const urlRe = /(https?:\/\/[^\s<>"']+)/gi;
  return text
    .replace(urlRe, (m) => {
      const url = m;
      if (isImageUrl(url))
        return `<div class="my-2"><img src="${url}" alt="image" class="img-fluid rounded border" loading="lazy"></div>`;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    })
    .replace(/\r?\n/g, "<br>");
}
function formatYMD(s) {
  const str = String(s || "").replace(/\D/g, "");
  if (str.length === 8)
    return `${str.slice(0, 4)}.${str.slice(4, 6)}.${str.slice(6, 8)}`;
  return s ?? "";
}
function tryParseJSON(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t || (t[0] !== "{" && t[0] !== "[")) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function tableKV(obj) {
  const rows = Object.entries(obj)
    .map(([k, v]) => {
      const val =
        typeof v === "string"
          ? linkify(v)
          : v == null
          ? ""
          : escapeHtml(JSON.stringify(v));
      return `<tr><th class="text-nowrap align-top pe-3 py-1">${escapeHtml(
        k
      )}</th><td class="py-1">${val}</td></tr>`;
    })
    .join("");
  return `<div class="table-responsive"><table class="table table-sm align-middle kv-table"><tbody>${rows}</tbody></table></div>`;
}
function cardSection(title, html) {
  if (!html || !String(html).trim()) return "";
  return `<section class="card shadow-sm rounded-16"><div class="card-body"><h3 class="h6 fw-semibold mb-3">${escapeHtml(
    title
  )}</h3><div class="desc">${html}</div></div></section>`;
}
function collectDeepByKeys(obj, keys) {
  const hit = [];
  const visit = (x) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      x.forEach(visit);
      return;
    }
    const lowerKeys = Object.keys(x).map((k) => k.toLowerCase());
    if (keys.some((k) => lowerKeys.includes(k.toLowerCase()))) hit.push(x);
    for (const v of Object.values(x)) visit(v);
  };
  visit(obj);
  return hit;
}

// ---------- 응답 풀기 ----------
function unwrapItem(resp) {
  if (resp == null) return null;
  if (resp.item) return resp.item;
  if (resp.data) return resp.data;
  if (resp.detail) return resp.detail;
  if (resp.result) return resp.result;
  if (resp.payload) return resp.payload;
  if (resp.ok && resp.item) return resp.item;
  if (resp.ok && resp.data) return resp.data;
  if (Array.isArray(resp) && resp.length === 1) return resp[0];
  return resp;
}
function unwrapDetail(item) {
  return (
    item?.raw?.detail || item?.raw?.data || item?.raw || item?.detail || item
  );
}

// ---------- API ----------
async function tryFetch(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function fetchDetail(id) {
  if (window.API?.getJobDetail) {
    try {
      const res = await window.API.getJobDetail(id);
      return unwrapItem(res);
    } catch (e) {
      console.warn("API.getJobDetail failed", e);
    }
  }
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
      const j = await tryFetch(u);
      const it = unwrapItem(j);
      if (it) return it;
    } catch (e) {
      /* next */
    }
  }
  throw new Error("No detail endpoint responded");
}

// ---------- 렌더: 헤더/모집/직종/텍스트/첨부 ----------
function renderHeader(job) {
  if (job.company_logo)
    setHTML(
      "companyLogo",
      `<img src="${job.company_logo}" alt="${escapeHtml(
        job.company || ""
      )}" style="width:100%;height:100%;object-fit:contain">`
    );
  else
    setHTML(
      "companyLogo",
      `<span class="text-primary fw-bold fs-3">${escapeHtml(
        (job.company || "C").slice(0, 1)
      )}</span>`
    );

  const title = job.title || job.empWantedTitle || job.empRecrNm || "-";
  const company = job.company || job.empBusiNm || "-";
  setText("jobTitle", title);
  setText("jobCompany", company);

  const regionText =
    job.region ||
    [job.region1, job.region2].filter(Boolean).join(" ") ||
    job.workRegionNm ||
    "지역 정보 없음";
  setText("jobLocation", regionText);

  const end =
    job.endDate && String(job.endDate).length >= 8
      ? `~${String(job.endDate).slice(4, 6)}.${String(job.endDate).slice(6, 8)}`
      : "상시채용";
  setText("jobDeadline", end);

  const empType = job.employmentType || job.empWantedCareerNm || "";
  if (empType) {
    setText("jobEmpType", empType);
    show("jobEmpType");
  }

  const apply =
    job.apply_url ||
    job.empWantedHomepg ||
    job.empWantedHomepgDetail ||
    job.homepg ||
    job.url;
  const a1 = $("applyButton");
  const a2 = $("applyButtonMobile");
  if (a1 && a2) {
    if (apply) {
      a1.href = apply;
      a2.href = apply;
    } else {
      a1.classList.add("disabled");
      a2.classList.add("disabled");
    }
  }
}

function renderRecruitList(detail) {
  const src =
    detail.empRecrInfoList?.empRecrInfoListInfo || detail.empRecrInfoListInfo;
  if (!src) return;
  const list = Array.isArray(src) ? src : [src];
  if (!list.length) return;

  show("recruitListSection");
  const html = list
    .map((it, idx) => {
      const title = it.empRecrNm || it.title || `모집분야 #${idx + 1}`;
      const rows = {};
      if (it.workRegionNm) rows["근무지역"] = it.workRegionNm;
      if (it.empWantedCareerNm) rows["고용형태/경력"] = it.empWantedCareerNm;
      if (it.empWantedEduNm) rows["학력"] = it.empWantedEduNm;
      if (it.recrPsncnt) rows["모집인원"] = it.recrPsncnt;
      const desc = it.jobCont || it.jobDescription || it.empRecrMemoCont;

      return `<article class="card shadow-sm rounded-16"><div class="card-body">
      <h4 class="h6 fw-semibold mb-2">${escapeHtml(title)}</h4>
      ${Object.keys(rows).length ? tableKV(rows) : ""}
      ${desc ? cardSection("직무내용", linkify(desc)) : ""}
    </div></article>`;
    })
    .join("");
  setHTML("recruitListBody", html);
}

function renderJobsCode(detail) {
  const src = detail.empJobsList?.empJobsListInfo || detail.empJobsListInfo;
  if (!src) return;
  const list = Array.isArray(src) ? src : [src];
  if (!list.length) return;

  show("jobsCodeSection");
  const html = list
    .map(
      (j) => `
    <div class="col"><div class="border rounded p-2 h-100">
      <div class="small fw-semibold">${escapeHtml(j.jobsCdKorNm || "-")}</div>
      <div class="text-secondary small">코드: ${escapeHtml(
        j.jobsCd || "-"
      )}</div>
    </div></div>`
    )
    .join("");
  setHTML("jobsCodeBody", html);
}

function renderTextSections(detail) {
  const mapping = [
    ["empnRecrSummaryCont", "모집 요약"],
    ["recrCommCont", "응시자격 / 안내"],
    ["empSubmitDocCont", "제출서류"],
    ["empRcptMthdCont", "접수방법"],
    ["empAcptPsnAnncCont", "접수 유의사항"],
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

function renderAttachments(detail) {
  const raw = detail.regFileList?.regFileListInfo || detail.regFileListInfo;
  if (!raw) return;
  const list = Array.isArray(raw) ? raw : [raw];
  if (!list.length) return;

  show("attachmentsSection");
  const html = list
    .map((f, i) => {
      const name = f.regFileNm || f.fileNm || `첨부파일 ${i + 1}`;
      const url = f.regFilePath || f.fileUrl || f.url;
      if (!url)
        return `<div class="text-secondary small">${escapeHtml(name)}</div>`;
      if (isImageUrl(url))
        return `<div><div class="small mb-1">${escapeHtml(
          name
        )}</div><img src="${url}" alt="${escapeHtml(
          name
        )}" class="img-fluid rounded border"></div>`;
      return `<a class="link-primary" href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        name
      )}</a>`;
    })
    .join("");
  setHTML("attachmentsBody", html);
}

// ---------- 렌더: 기타 상세(예쁘게) ----------
const KR_LABEL = {
  empSeqno: "공고번호",
  empWantedTitle: "공고명",
  empBusiNm: "회사명",
  empWantedStdt: "접수 시작일",
  empWantedEndt: "접수 마감일",
  empWantedTypeNm: "고용형태",
  workRegionNm: "근무지역",
  empWantedHomepg: "홈페이지",
  empWantedHomepgDetail: "상세 페이지",
  homepg: "회사 홈페이지",
  url: "관련 링크",
  regLogImgNm: "로고 이미지",
};

function renderRawAll(detail) {
  // 1) 링크 섹션
  const linkPieces = [];
  const linkKeys = [
    "empWantedHomepg",
    "empWantedHomepgDetail",
    "homepg",
    "url",
    "apply_url",
    "regLogImgNm",
  ];
  const used = new Set([
    "empRecrInfoList",
    "empRecrInfoListInfo",
    "empJobsList",
    "empJobsListInfo",
    "regFileList",
    "regFileListInfo",
    "empnRecrSummaryCont",
    "recrCommCont",
    "empSubmitDocCont",
    "empRcptMthdCont",
    "empAcptPsnAnncCont",
    "inqryCont",
    "empnEtcCont",
  ]);

  for (const k of linkKeys) {
    if (detail[k]) {
      used.add(k);
      const label = KR_LABEL[k] || k;
      const v = detail[k];
      if (typeof v === "string" && isImageUrl(v)) {
        linkPieces.push(
          `<li class="list-group-item"><div class="fw-semibold mb-1">${escapeHtml(
            label
          )}</div><img src="${v}" alt="${escapeHtml(
            label
          )}" class="img-fluid rounded border"></li>`
        );
      } else {
        linkPieces.push(
          `<li class="list-group-item"><div class="fw-semibold mb-1">${escapeHtml(
            label
          )}</div><div class="desc">${linkify(String(v))}</div></li>`
        );
      }
    }
  }

  // 2) 기본 정보(요약) 테이블
  const infoPairs = {};
  const infoKeys = [
    "empSeqno",
    "empWantedTitle",
    "empBusiNm",
    "empWantedStdt",
    "empWantedEndt",
    "empWantedTypeNm",
    "workRegionNm",
  ];
  for (const k of infoKeys) {
    if (detail[k] != null && detail[k] !== "") {
      used.add(k);
      let val = detail[k];
      if (k === "empWantedStdt" || k === "empWantedEndt") val = formatYMD(val);
      infoPairs[KR_LABEL[k] || k] = val;
    }
  }

  // 3) 자기소개서 항목
  let selfIntroHtml = "";
  {
    used.add("empSelfIntroList");
    const raw = detail.empSelfIntroList;
    const obj = tryParseJSON(raw) || raw;
    let items = [];
    if (obj && typeof obj === "object") {
      // 흔한 케이스: { empSelfsListInfo: [ { selfIntroQstCont: ... } ] }
      const arrA = collectDeepByKeys(obj, [
        "selfintroqstcont",
        "selfintroqst",
        "selfintro",
      ]); // 케이스 허용
      if (arrA.length) {
        // 각 객체에서 selfIntroQstCont 찾기
        arrA.forEach((o) => {
          const key = Object.keys(o).find((k) =>
            k.toLowerCase().includes("selfintroqstcont")
          );
          if (key && o[key]) items.push(o[key]);
        });
      }
    }
    if (Array.isArray(obj)) items = obj;

    if (items.length) {
      selfIntroHtml = `
        <section class="card shadow-sm rounded-16 mb-3">
          <div class="card-body">
            <h3 class="h6 fw-semibold mb-3">자기소개서 항목</h3>
            <ol class="mb-0">
              ${items
                .map((t) => `<li class="mb-2">${linkify(String(t))}</li>`)
                .join("")}
            </ol>
          </div>
        </section>
      `;
    }
  }

  // 4) 전형 절차/일정
  let selsHtml = "";
  {
    used.add("empSelsList");
    const raw = detail.empSelsList;
    const obj = tryParseJSON(raw) || raw;
    let steps = [];
    if (obj && typeof obj === "object") {
      // 흔한 케이스: { empSelsListInfo: [ { selsNm, selsCont, selsMemoCont, ... } ] }
      const arr = collectDeepByKeys(obj, [
        "selsnm",
        "selscont",
        "selsmemocont",
        "selsschdcont",
      ]);
      if (arr.length) {
        arr.forEach((o) => {
          const n = o.selsNm || o.SELSNM || o.name || "전형";
          const c = o.selsCont || o.SELSCONT || o.content || "";
          const m = o.selsMemoCont || o.SELSMEMOCONT || o.memo || "";
          const sch = o.selsSchdCont || o.SELSSCHDCONT || "";
          steps.push({ n, c, m, sch });
        });
      }
    }
    if (steps.length) {
      selsHtml = `
        <section class="card shadow-sm rounded-16 mb-3">
          <div class="card-body">
            <h3 class="h6 fw-semibold mb-3">전형 절차/일정</h3>
            <div class="vstack gap-2">
              ${steps
                .map(
                  (s, i) => `
                <div class="border rounded p-2">
                  <div class="fw-semibold">${i + 1}. ${escapeHtml(s.n)}</div>
                  ${
                    s.sch
                      ? `<div class="small text-secondary">일정: ${linkify(
                          String(s.sch)
                        )}</div>`
                      : ""
                  }
                  ${
                    s.c ? `<div class="mt-1">${linkify(String(s.c))}</div>` : ""
                  }
                  ${
                    s.m
                      ? `<div class="mt-1 text-secondary small">${linkify(
                          String(s.m)
                        )}</div>`
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </section>
      `;
    }
  }

  // 5) 나머지 필드 정리 (짧은 건 표, 긴 텍스트는 카드)
  const shortPairs = {};
  const longCards = [];
  for (const [k, v] of Object.entries(detail)) {
    if (used.has(k)) continue;
    if (v == null || v === "") continue;

    const str = typeof v === "string" ? v : JSON.stringify(v);
    // URL 들어있으면 링크 섹션 뒤로
    if (/https?:\/\//i.test(str)) {
      linkPieces.push(
        `<li class="list-group-item"><div class="fw-semibold mb-1">${escapeHtml(
          KR_LABEL[k] || k
        )}</div><div class="desc">${linkify(str)}</div></li>`
      );
      continue;
    }
    // 길이로 분류
    if (str.includes("\n") || str.length > 140 || typeof v === "object") {
      longCards.push({ label: KR_LABEL[k] || k, value: str });
    } else {
      shortPairs[KR_LABEL[k] || k] = str;
    }
  }

  // ---- 섹션 조립 ----
  const pieces = [];

  if (linkPieces.length) {
    pieces.push(`
      <section class="card shadow-sm rounded-16 mb-3">
        <div class="card-body">
          <h3 class="h6 fw-semibold mb-3">관련 링크</h3>
          <ul class="list-group list-group-flush">${linkPieces.join("")}</ul>
        </div>
      </section>
    `);
  }

  if (Object.keys(infoPairs).length) {
    pieces.push(`
      <section class="card shadow-sm rounded-16 mb-3">
        <div class="card-body">
          <h3 class="h6 fw-semibold mb-3">기본 정보(요약)</h3>
          ${tableKV(infoPairs)}
        </div>
      </section>
    `);
  }

  if (selfIntroHtml) pieces.push(selfIntroHtml);
  if (selsHtml) pieces.push(selsHtml);

  if (Object.keys(shortPairs).length) {
    pieces.push(`
      <section class="card shadow-sm rounded-16 mb-3">
        <div class="card-body">
          <h3 class="h6 fw-semibold mb-3">추가 정보(요약)</h3>
          ${tableKV(shortPairs)}
        </div>
      </section>
    `);
  }

  if (longCards.length) {
    pieces.push(`
      <section class="vstack gap-3">
        ${longCards.map((i) => cardSection(i.label, linkify(i.value))).join("")}
      </section>
    `);
  }

  if (!pieces.length) {
    pieces.push(
      `<div class="text-secondary">추가로 표시할 정보가 없습니다.</div>`
    );
  }

  setHTML("rawAllBody", pieces.join(""));
}

// ---------- 메인 ----------
async function loadJobDetail() {
  try {
    const id = getJobId();
    if (!id) throw new Error("NO_ID");

    const item = await fetchDetail(id);
    renderHeader(item);

    const detail = unwrapDetail(item);
    if (!detail) throw new Error("NO_DETAIL_OBJECT");

    renderTextSections(detail);
    renderRecruitList(detail);
    renderJobsCode(detail);
    renderAttachments(detail);
    renderRawAll(detail);
  } catch (e) {
    console.error("[job-detail] fatal:", e);
    setHTML(
      "rawAllBody",
      `<div class="alert alert-danger">상세 데이터를 불러오지 못했습니다.<br><code>${escapeHtml(
        e.message || String(e)
      )}</code></div>`
    );
  }
}

document.addEventListener("DOMContentLoaded", loadJobDetail);
