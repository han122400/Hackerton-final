// static/js/job_list.js — FINAL (서버 합성된 workRegionNm 바로 사용)

// ===== DOM =====
const cityFilter = document.getElementById("cityFilter");
const districtFilter = document.getElementById("districtFilter");
const searchInput = document.getElementById("searchInput");
const sortFilter = document.getElementById("sortFilter");
const jobList = document.getElementById("jobList");
const jobCount = document.getElementById("jobCount");

// 서버 데이터
let currentJobs = [];

// 간단 지역 목록
const PROVINCES = [
  { key: "seoul", fullName: "서울특별시" },
  { key: "gyeonggi", fullName: "경기도" },
  { key: "busan", fullName: "부산광역시" },
  { key: "incheon", fullName: "인천광역시" },
  { key: "daegu", fullName: "대구광역시" },
  { key: "daejeon", fullName: "대전광역시" },
  { key: "gwangju", fullName: "광주광역시" },
  { key: "ulsan", fullName: "울산광역시" },
  { key: "sejong", fullName: "세종특별자치시" },
  { key: "gangwon", fullName: "강원특별자치도" },
  { key: "chungbuk", fullName: "충청북도" },
  { key: "chungnam", fullName: "충청남도" },
];

function initCityFilter() {
  cityFilter.innerHTML =
    `<option value="all">시/도 선택</option>` +
    PROVINCES.sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(
        (p) =>
          `<option value="${p.key}" data-full="${p.fullName}">${p.fullName}</option>`
      )
      .join("");
}
function updateDistrictFilter() {
  districtFilter.classList.add("d-none");
  districtFilter.innerHTML = `<option value="all">구/군 선택</option>`;
}

// ===== API =====
async function fetchJobs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/jobs${qs ? `?${qs}` : ""}`);
  const j = await res.json();
  return j.ok ? j.items || [] : [];
}

// ===== 유틸 =====
function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}
function fmtDeadline(d) {
  const dd = onlyDigits(d);
  if (!dd || dd.length < 8) return "상시채용";
  return `~${dd.slice(4, 6)}.${dd.slice(6, 8)}`;
}
function isSoon(d) {
  const dd = onlyDigits(d);
  if (!dd || dd.length < 8) return false;
  const end = new Date(+dd.slice(0, 4), +dd.slice(4, 6) - 1, +dd.slice(6, 8));
  const diff = Math.ceil((end - new Date()) / 86400000);
  return diff >= 0 && diff <= 7;
}
function deadlineSortKey(d) {
  const dd = onlyDigits(d);
  return dd && dd.length === 8 ? dd : "99999999";
}
const badge = (t) => `<span class="badge badge-contrast">${esc(t)}</span>`;
const badgeDanger = (t) =>
  `<span class="badge badge-danger-soft">${esc(t)}</span>`;

// ===== 카드 =====
function cardTpl(job) {
  const id = job.empSeqno || job.id || "";
  const logo = job.regLogImgNm
    ? `<img src="${job.regLogImgNm}" alt="${esc(
        job.company || ""
      )}" style="width:100%;height:100%;object-fit:contain">`
    : `<strong class="text-primary fs-4">${esc(
        (job.company || "C").slice(0, 1)
      )}</strong>`;

  // ✅ 서버에서 합성된 workRegionNm 우선
  const regionText =
    job.workRegionNm ||
    job.region ||
    [job.region1, job.region2].filter(Boolean).join(" ") ||
    "";

  const deadlineText = fmtDeadline(job.endDate);
  const deadlineBadge = isSoon(job.endDate)
    ? badgeDanger(deadlineText)
    : badge(deadlineText);

  const empType =
    job.empWantedTypeNm || job.employmentType || job.empType || job.hireType;

  return `
  <div class="col">
    <article class="job-card p-3 h-100" data-id="${esc(id)}">
      <div class="d-flex gap-3">
        <div class="flex-shrink-0 rounded border bg-white d-flex align-items-center justify-content-center" style="width:88px;height:88px;overflow:hidden">
          ${logo}
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="min-w-0">
              <h3 class="h6 mb-1 line-clamp-2">${esc(job.title || "-")}</h3>
              <div class="text-secondary small line-clamp-1">${esc(
                job.company || "-"
              )}</div>
            </div>
            <div class="ms-2">${deadlineBadge}</div>
          </div>
          <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
            ${regionText ? badge("근무지 · " + regionText) : ""}
            ${empType ? badge(empType) : ""}
          </div>
        </div>
      </div>
      <a class="stretched-link" href="/job-detail?id=${encodeURIComponent(
        id
      )}"></a>
    </article>
  </div>`;
}

function renderList(items) {
  jobCount.textContent = items.length;
  jobList.innerHTML = items.length
    ? items.map(cardTpl).join("")
    : `<div class="col"><div class="text-center text-secondary py-5">표시할 공고가 없습니다</div></div>`;
}

// ===== 필터/정렬/검색 =====
async function filterJobs() {
  const params = {};
  const kw = (searchInput.value || "").trim();
  if (kw) params.keyword = kw;

  const cityKey = cityFilter.value;
  const full =
    cityKey !== "all" ? cityFilter.selectedOptions[0]?.dataset.full : null;
  if (full) params.region1 = full; // 백엔드에서 정규화 후 workRegionNm 포함 여부로 필터

  // 1) 목록
  const items = await fetchJobs(params);

  // 2) 정렬
  const sortBy = sortFilter.value;
  items.sort((a, b) => {
    if (sortBy === "company")
      return (a.company || "").localeCompare(b.company || "");
    if (sortBy === "deadline")
      return deadlineSortKey(a.endDate).localeCompare(
        deadlineSortKey(b.endDate)
      );
    // 최신순(기본)
    return String(b.startDate || b.empSeqno || "").localeCompare(
      String(a.startDate || a.empSeqno || "")
    );
  });

  currentJobs = items;
  renderList(items);
}

// ===== 상단 필터 표시 =====
function updateActiveFilters() {
  const wrap = document.getElementById("activeFilters");
  const chips = [];
  const kw = (searchInput.value || "").trim();
  if (kw) chips.push(`검색: ${kw}`);
  if (cityFilter.value !== "all") {
    const full = cityFilter.selectedOptions[0]?.dataset.full;
    if (full) chips.push(`지역: ${full}`);
  }
  wrap.innerHTML = chips.length
    ? chips
        .map(
          (t) => `<span class="badge text-bg-secondary-subtle">${esc(t)}</span>`
        )
        .join(" ")
    : `<span class="text-secondary">전체 지역</span>`;
}

// ===== 이벤트 =====
function setupEvents() {
  cityFilter.addEventListener("change", (e) => {
    updateDistrictFilter(e.target.value);
    filterJobs().then(updateActiveFilters);
  });
  districtFilter.addEventListener("change", () => {
    filterJobs().then(updateActiveFilters);
  });
  sortFilter.addEventListener("change", () => {
    filterJobs().then(updateActiveFilters);
  });
  let t;
  searchInput.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => filterJobs().then(updateActiveFilters), 250);
  });
}

// ===== 시작 =====
document.addEventListener("DOMContentLoaded", async () => {
  initCityFilter();
  updateDistrictFilter("all");
  setupEvents();
  await filterJobs();
  updateActiveFilters();
});
