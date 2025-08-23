/* ============ job_detail.js (KR labels, cleaned lists, no duplication) ============ */

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

// ---------- URL ----------
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

// ---------- utils ----------
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
  return !v ? [] : Array.isArray(v) ? v : [v];
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

// ---------- unwrap ----------
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
    } catch (e) {}
  }
  throw new Error("No detail endpoint responded");
}

// ---------- header ----------
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
  const a1 = $("applyButton"),
    a2 = $("applyButtonMobile");
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

// ---------- sections: text ----------
function renderTextSections(detail) {
  // 한국어 라벨로 고정
  const mapping = [
    ["recrCommCont", "응시자격 / 안내"],
    ["recrPlanPsncnt", "채용예정인원"],
    ["empSubmitDocCont", "제출서류"],
    ["empRcptMthdCont", "접수방법"],
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

// ---------- sections: 모집분야 (empRecrList/*) ----------
function renderRecruitList(detail) {
  // 다양한 키 대응
  let raw =
    detail.empRecrInfoList?.empRecrInfoListInfo ||
    detail.empRecrInfoListInfo ||
    detail.empRecrList ||
    detail.empRecrListInfo;
  raw = tryParseJSON(raw) ?? raw;
  const list = ensureArray(raw);
  if (!list.length) return;

  show("recruitListSection");
  const html = list
    .map((it, idx) => {
      // 하위 오브젝트를 한 번 더 평탄화 (work24 응답 케이스 대응)
      const o = typeof it === "object" ? it : {};
      const title =
        o.empRecrNm || o.title || o.jobsNm || `모집분야 #${idx + 1}`;
      const rows = {};
      if (o.workRegionNm || o.region)
        rows["근무지역"] = o.workRegionNm || o.region;
      if (o.empWantedCareerNm || o.employmentType)
        rows["고용형태/경력"] = o.empWantedCareerNm || o.employmentType;
      if (o.empWantedEduNm) rows["학력"] = o.empWantedEduNm;
      if (o.recrPsncnt) rows["모집인원"] = o.recrPsncnt;
      const desc = o.jobCont || o.jobDescription || o.empRecrMemoCont;

      return `<article class="card shadow-sm rounded-16"><div class="card-body">
      <h4 class="h6 fw-semibold mb-2">${escapeHtml(title)}</h4>
      ${Object.keys(rows).length ? tableKV(rows) : ""}
      ${desc ? cardSection("직무내용", linkify(desc)) : ""}
    </div></article>`;
    })
    .join("");

  setHTML("recruitListBody", html);
}

// ---------- sections: 직종 코드 ----------
function renderJobsCode(detail) {
  const src = detail.empJobsList?.empJobsListInfo || detail.empJobsListInfo;
  const list = ensureArray(src);
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
    </div></div>
  `
    )
    .join("");
  setHTML("jobsCodeBody", html);
}

// ---------- sections: 첨부파일 ----------
function renderAttachments(detail) {
  const raw = detail.regFileList?.regFileListInfo || detail.regFileListInfo;
  const list = ensureArray(raw);
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

// ---------- 기타 상세(중복 제거 + 한국어 라벨) ----------
const KR_LABEL = {
  empSeqno: "공고번호",
  empWantedTitle: "공고명",
  empBusiNm: "회사명",
  empWantedStdt: "접수 시작일",
  empWantedEndt: "접수 마감일",
  empWantedTypeNm: "고용형태",
  workRegionNm: "근무지역",
  coClcdNm: "기업구분",
  empSelfintroList: "자기소개서 항목",
  empRecrList: "모집분야 목록",
  empWantedHomepg: "홈페이지",
  empWantedHomepgDetail: "상세 페이지",
  homepg: "회사 홈페이지",
  url: "관련 링크",
  regLogImgNm: "로고 이미지",
};

function renderRawAll(detail) {
  // 이미 화면에 뿌린 키들은 여기서 제외
  const used = new Set([
    // 상단 요약/헤더
    "title",
    "company",
    "region",
    "region1",
    "region2",
    "company_logo",
    "endDate",
    "employmentType",
    "empWantedTitle",
    "empBusiNm",
    "empWantedTypeNm",
    "workRegionNm",
    // 텍스트 섹션
    "recrCommCont",
    "recrPlanPsncnt",
    "empSubmitDocCont",
    "empRcptMthdCont",
    "inqryCont",
    "empnEtcCont",
    // 모집/직종/첨부
    "empRecrInfoList",
    "empRecrInfoListInfo",
    "empRecrList",
    "empRecrListInfo",
    "empJobsList",
    "empJobsListInfo",
    "regFileList",
    "regFileListInfo",
    // 기타
    "empSelfintroList",
    "empSelsList",
    "empWantedStdt",
    "empWantedEndt",
    "coClcdNm",
    // 링크
    "empWantedHomepg",
    "empWantedHomepgDetail",
    "homepg",
    "url",
    "apply_url",
    "regLogImgNm",
  ]);

  // 1) 링크 모음
  const linkKeys = [
    "empWantedHomepg",
    "empWantedHomepgDetail",
    "homepg",
    "url",
    "apply_url",
    "regLogImgNm",
  ];
  const linkPieces = [];
  for (const k of linkKeys) {
    const v = detail[k];
    if (!v) continue;
    const label = KR_LABEL[k] || k;
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

  // 2) 기본 정보(요약)
  const infoPairs = {};
  [
    ["empSeqno", "공고번호"],
    ["empWantedTitle", "공고명"],
    ["empBusiNm", "회사명"],
    ["empWantedStdt", "접수 시작일"],
    ["empWantedEndt", "접수 마감일"],
    ["empWantedTypeNm", "고용형태"],
    ["workRegionNm", "근무지역"],
    ["coClcdNm", "기업구분"],
  ].forEach(([k, kr]) => {
    const v = detail[k];
    if (v != null && v !== "") {
      infoPairs[kr] =
        k === "empWantedStdt" || k === "empWantedEndt" ? formatYMD(v) : v;
    }
  });

  // 3) 자기소개서 항목 (JSON/XML-라이크 정제)
  let selfIntroHtml = "";
  {
    const raw = detail.empSelfintroList;
    const obj = tryParseJSON(raw) ?? raw;
    let items = [];
    if (obj && typeof obj === "object") {
      const hits = collectDeepByKeys(obj, [
        "selfintroqstcont",
        "selfintroqst",
        "selfintro",
        "qstcont",
        "question",
      ]);
      hits.forEach((o) => {
        const key = Object.keys(o).find((k) =>
          /selfintroqstcont|qstcont|question/i.test(k)
        );
        if (key && o[key]) items.push(String(o[key]));
      });
    }
    if (Array.isArray(obj)) items = items.concat(obj.map(String));
    // fallback: 문자열에서 줄 단위 추출
    if (!items.length && typeof raw === "string")
      items = raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    if (items.length) {
      selfIntroHtml = `
        <section class="card shadow-sm rounded-16 mb-3">
          <div class="card-body">
            <h3 class="h6 fw-semibold mb-3">자기소개서 항목</h3>
            <ol class="mb-0">${items
              .map((t) => `<li class="mb-2">${linkify(t)}</li>`)
              .join("")}</ol>
          </div>
        </section>`;
    }
  }

  // 4) 전형 절차/일정
  let selsHtml = "";
  {
    const raw = detail.empSelsList;
    const obj = tryParseJSON(raw) ?? raw;
    let steps = [];
    if (obj && typeof obj === "object") {
      const arr = collectDeepByKeys(obj, [
        "selsnm",
        "selscont",
        "selsmemocont",
        "selsschdcont",
      ]);
      arr.forEach((o) => {
        const n = o.selsNm || o.SELSNM || o.name || "전형";
        const c = o.selsCont || o.SELSCONT || o.content || "";
        const m = o.selsMemoCont || o.SELSMEMOCONT || o.memo || "";
        const sch = o.selsSchdCont || o.SELSSCHDCONT || "";
        steps.push({ n, c, m, sch });
      });
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
                </div>`
                )
                .join("")}
            </div>
          </div>
        </section>`;
    }
  }

  // 5) 남은 필드 정리(중복 제거 후 요약/장문 분리)
  const shortPairs = {},
    longCards = [];
  for (const [k, v] of Object.entries(detail)) {
    if (used.has(k)) continue;
    if (v == null || v === "") continue;
    const label = KR_LABEL[k] || k; // 한국어 라벨 우선
    const str = typeof v === "string" ? v : JSON.stringify(v);
    if (/https?:\/\//i.test(str)) {
      linkPieces.push(
        `<li class="list-group-item"><div class="fw-semibold mb-1">${escapeHtml(
          label
        )}</div><div class="desc">${linkify(str)}</div></li>`
      );
      continue;
    }
    if (str.includes("\n") || str.length > 140 || typeof v === "object") {
      longCards.push({ label, value: str });
    } else {
      shortPairs[label] = str;
    }
  }

  // 조립
  const pieces = [];
  if (linkPieces.length) {
    pieces.push(
      `<section class="card shadow-sm rounded-16 mb-3"><div class="card-body"><h3 class="h6 fw-semibold mb-3">관련 링크</h3><ul class="list-group list-group-flush">${linkPieces.join(
        ""
      )}</ul></div></section>`
    );
  }
  if (Object.keys(infoPairs).length) {
    pieces.push(
      `<section class="card shadow-sm rounded-16 mb-3"><div class="card-body"><h3 class="h6 fw-semibold mb-3">기본 정보(요약)</h3>${tableKV(
        infoPairs
      )}</div></section>`
    );
  }
  if (selfIntroHtml) pieces.push(selfIntroHtml);
  if (selsHtml) pieces.push(selsHtml);
  if (Object.keys(shortPairs).length) {
    pieces.push(
      `<section class="card shadow-sm rounded-16 mb-3"><div class="card-body"><h3 class="h6 fw-semibold mb-3">추가 정보(요약)</h3>${tableKV(
        shortPairs
      )}</div></section>`
    );
  }
  if (longCards.length) {
    pieces.push(
      `<section class="vstack gap-3">${longCards
        .map((i) => cardSection(i.label, linkify(i.value)))
        .join("")}</section>`
    );
  }
  if (!pieces.length)
    pieces.push(
      `<div class="text-secondary">추가로 표시할 정보가 없습니다.</div>`
    );

  setHTML("rawAllBody", pieces.join(""));
}

// ---------- main ----------
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
