// ===== DOM =====
const cityFilter = document.getElementById("cityFilter");
const districtFilter = document.getElementById("districtFilter");
const searchInput = document.getElementById("searchInput");
const sortFilter = document.getElementById("sortFilter");
const jobList = document.getElementById("jobList");
const jobCount = document.getElementById("jobCount");

// 서버 데이터
let currentJobs = [];

// REGIONS (data.js가 없는 경우 대비한 최소 시/도 목록)
const FALLBACK_REGIONS = [
  { key: "seoul", fullName: "서울특별시", aliases: ["서울"], districts: [] },
  { key: "busan", fullName: "부산광역시", aliases: ["부산"], districts: [] },
  { key: "incheon", fullName: "인천광역시", aliases: ["인천"], districts: [] },
  { key: "daegu", fullName: "대구광역시", aliases: ["대구"], districts: [] },
  { key: "gwangju", fullName: "광주광역시", aliases: ["광주"], districts: [] },
  { key: "daejeon", fullName: "대전광역시", aliases: ["대전"], districts: [] },
  { key: "ulsan", fullName: "울산광역시", aliases: ["울산"], districts: [] },
  {
    key: "sejong",
    fullName: "세종특별자치시",
    aliases: ["세종"],
    districts: [],
  },
  { key: "gyeonggi", fullName: "경기도", aliases: ["경기"], districts: [] },
  {
    key: "gangwon",
    fullName: "강원특별자치도",
    aliases: ["강원"],
    districts: [],
  },
  { key: "chungbuk", fullName: "충청북도", aliases: ["충북"], districts: [] },
  { key: "chungnam", fullName: "충청남도", aliases: ["충남"], districts: [] },
  {
    key: "jeonbuk",
    fullName: "전북특별자치도",
    aliases: ["전북"],
    districts: [],
  },
  { key: "jeonnam", fullName: "전라남도", aliases: ["전남"], districts: [] },
  { key: "gyeongbuk", fullName: "경상북도", aliases: ["경북"], districts: [] },
  { key: "gyeongnam", fullName: "경상남도", aliases: ["경남"], districts: [] },
  { key: "jeju", fullName: "제주특별자치도", aliases: ["제주"], districts: [] },
];
const PROVINCES =
  window.REGIONS && Array.isArray(window.REGIONS) && window.REGIONS.length
    ? window.REGIONS
    : FALLBACK_REGIONS;

function cityKeyToFull(key) {
  const p = PROVINCES.find((r) => r.key === key);
  return p ? p.fullName : null;
}

// 문자열에서 광역 시/도 추출
const PROV_LIST = PROVINCES.map((p) => ({
  full: p.fullName,
  aliases: new Set([p.fullName, ...(p.aliases || [])]),
}));
function extractProvincesFromRegionString(regionStr) {
  const out = new Set();
  if (!regionStr || typeof regionStr !== "string") return out;
  for (const token of regionStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    for (const p of PROV_LIST) {
      for (const a of p.aliases)
        if (a && token.includes(a)) {
          out.add(p.full);
          break;
        }
      if (out.size) break;
    }
  }
  return out;
}

// 드롭다운 초기화
function initCityFilter() {
  cityFilter.innerHTML =
    `<option value="all">시/도 선택</option>` +
    [...PROVINCES]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(
        (p) =>
          `<option value="${p.key}" data-full="${p.fullName}">${p.fullName}</option>`
      )
      .join("");
}
function updateDistrictFilter(cityKey) {
  const rec = PROVINCES.find((r) => r.key === cityKey);
  if (!rec || !(rec.districts && rec.districts.length)) {
    districtFilter.classList.add("d-none");
    districtFilter.innerHTML = `<option value="all">구/군 선택</option>`;
    return;
  }
  districtFilter.classList.remove("d-none");
  districtFilter.innerHTML =
    `<option value="all">구/군 선택</option>` +
    rec.districts.map((d) => `<option value="${d}">${d}</option>`).join("");
}

// API
async function fetchJobs(params = {}) {
  try {
    if (window.API?.getJobs) return await window.API.getJobs(params);
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/jobs${qs ? `?${qs}` : ""}`);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "API_ERROR");
    return j.items || [];
  } catch (e) {
    console.error("jobs fetch error:", e);
    return [];
  }
}

// 필터/렌더
function badge(txt) {
  return `<span class="badge text-bg-light border">${txt}</span>`;
}

function cardTpl(job) {
  const regionText =
    job.region ||
    [job.region1, job.region2].filter(Boolean).join(" ") ||
    job.workRegionNm ||
    "";
  const deadline = job.endDate
    ? `~${job.endDate.slice(4, 6)}.${job.endDate.slice(6, 8)}`
    : "상시채용";
  // 7일 이내 마감
  const soon = (() => {
    if (!job.endDate || (job.endDate || "").length < 8) return false;
    const d = new Date(
      +job.endDate.slice(0, 4),
      +job.endDate.slice(4, 6) - 1,
      +job.endDate.slice(6, 8)
    );
    const diff = Math.ceil((d - new Date()) / 86400000);
    return diff >= 0 && diff <= 7;
  })();

  return `
  <div class="col">
    <article class="card h-100 shadow-sm" style="border-radius:16px">
      <div class="card-body d-flex gap-3">
        <div class="flex-shrink-0 rounded border bg-white d-flex align-items-center justify-content-center" style="width:88px;height:88px;overflow:hidden">
          ${
            job.company_logo
              ? `<img src="${job.company_logo}" alt="${
                  job.company || ""
                }" style="width:100%;height:100%;object-fit:contain">`
              : `<strong class="text-primary fs-4">${(job.company || "C").slice(
                  0,
                  1
                )}</strong>`
          }
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="min-w-0">
              <h3 class="h6 mb-1 text-truncate">${job.title || "-"}</h3>
              <div class="text-secondary small text-truncate">${
                job.company || "-"
              }</div>
            </div>
            <span class="badge rounded-pill ${
              soon ? "text-bg-danger-subtle text-danger" : "text-bg-light"
            }">${deadline}</span>
          </div>
          <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
            ${regionText ? badge(regionText) : ""}
            ${job.employmentType ? badge(job.employmentType) : ""}
          </div>
        </div>
      </div>
      <a class="stretched-link" href="/job-detail?id=${encodeURIComponent(
        job.empSeqno || job.id || ""
      )}"></a>
    </article>
  </div>`;
}

function applyClientFilter(items) {
  const kw = (searchInput.value || "").trim().toLowerCase();
  const cityKey = cityFilter.value;
  const dist = districtFilter.value;
  const full =
    cityKey !== "all" ? cityFilter.selectedOptions[0]?.dataset.full : null;

  return items.filter((it) => {
    if (kw) {
      const text = `${it.title || ""} ${it.company || ""}`.toLowerCase();
      if (!text.includes(kw)) return false;
    }
    if (full) {
      const provinces = new Set([
        ...extractProvincesFromRegionString(it.region || ""),
        ...(it.region1 ? [it.region1] : []),
      ]);
      if (!provinces.has(full)) return false;
      if (dist && dist !== "all") {
        const allText = `${it.region || ""} ${it.region2 || ""} ${
          it.workRegionNm || ""
        }`;
        if (!allText.includes(dist)) return false;
      }
    }
    return true;
  });
}

function renderList(items) {
  jobCount.textContent = items.length;
  jobList.innerHTML =
    items.map(cardTpl).join("") ||
    `<div class="col"><div class="text-center text-secondary py-5">표시할 공고가 없습니다</div></div>`;
}

function updateActiveFilters() {
  const wrap = document.getElementById("activeFilters");
  wrap.innerHTML = "";
  const kw = (searchInput.value || "").trim();
  if (kw)
    wrap.innerHTML += `<span class="badge text-bg-secondary-subtle">검색: ${kw}</span>`;
  if (cityFilter.value !== "all") {
    const full = cityFilter.selectedOptions[0]?.dataset.full;
    if (full)
      wrap.innerHTML += `<span class="badge text-bg-secondary-subtle">지역: ${full}</span>`;
  }
  if (
    !districtFilter.classList.contains("d-none") &&
    districtFilter.value !== "all"
  ) {
    wrap.innerHTML += `<span class="badge text-bg-secondary-subtle">상세: ${districtFilter.value}</span>`;
  }
}

async function filterJobs() {
  const params = {};
  const kw = (searchInput.value || "").trim();
  if (kw) params.keyword = kw;

  const cityKey = cityFilter.value;
  const full =
    cityKey !== "all" ? cityFilter.selectedOptions[0]?.dataset.full : null;
  if (full) params.region1 = full;

  if (
    !districtFilter.classList.contains("d-none") &&
    districtFilter.value !== "all"
  ) {
    params.region2 = districtFilter.value;
  }

  const items = await fetchJobs(params);
  currentJobs = items;
  const view = applyClientFilter(items);

  // 정렬
  const sortBy = sortFilter.value;
  view.sort((a, b) => {
    if (sortBy === "company")
      return (a.company || "").localeCompare(b.company || "");
    if (sortBy === "deadline")
      return (a.endDate || "").localeCompare(b.endDate || "");
    return String(b.startDate || b.empSeqno || "").localeCompare(
      String(a.startDate || a.empSeqno || "")
    );
  });

  renderList(view);
  updateActiveFilters();
}

// 이벤트
function setupEvents() {
  cityFilter.addEventListener("change", (e) => {
    updateDistrictFilter(e.target.value);
    filterJobs();
  });
  districtFilter.addEventListener("change", filterJobs);
  sortFilter.addEventListener("change", filterJobs);
  let t;
  searchInput.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(filterJobs, 250);
  });
}

// 시작
document.addEventListener("DOMContentLoaded", async () => {
  initCityFilter();
  updateDistrictFilter("all");
  setupEvents();
  currentJobs = await fetchJobs({});
  const view = applyClientFilter(currentJobs);
  renderList(view);
  updateActiveFilters();
});
