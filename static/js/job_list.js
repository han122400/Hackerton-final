// 채용공고 목록 페이지 JavaScript

// 필터 상태
let filters = {
  search: "",
  category: "all",
  city: "all",
  district: "all",
  sort: "latest",
};

// 전역 상태로 jobs 데이터 관리
let currentJobs = window.serverJobs || [];

// 뒤로가기
function goBack() {
  window.location.href = "/";
}

// 필터 토글
function toggleFilter() {
  const filterSection = document.getElementById("filterSection");
  filterSection.classList.toggle("hidden");
}

// 지역 선택 드롭다운 초기화
function initializeLocationSelect() {
  const citySelect = document.getElementById("cityFilter");
  Object.keys(LOCATION_DATA).forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  citySelect.addEventListener("change", function () {
    const districtSelect = document.getElementById("districtFilter");
    const selectedCity = this.value;

    districtSelect.innerHTML = '<option value="all">구/군 선택</option>';

    if (selectedCity && selectedCity !== "all") {
      LOCATION_DATA[selectedCity].forEach((district) => {
        const option = document.createElement("option");
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
      districtSelect.style.display = "block";
    } else {
      districtSelect.style.display = "none";
    }

    filters.city = selectedCity;
    filters.district = "all";
    applyFilters();
  });

  document
    .getElementById("districtFilter")
    .addEventListener("change", function () {
      filters.district = this.value;
      applyFilters();
    });

  document
    .getElementById("categoryFilter")
    .addEventListener("change", function () {
      filters.category = this.value;
      applyFilters();
    });

  document.getElementById("sortFilter").addEventListener("change", function () {
    filters.sort = this.value;
    applyFilters();
  });
}

// 필터링된 공고 가져오기
function getFilteredJobs() {
  let filtered = DUMMY_JOBS.filter((job) => {
    const searchMatch =
      !filters.search ||
      job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      job.company.toLowerCase().includes(filters.search.toLowerCase());

    const categoryMatch =
      filters.category === "all" || job.category === filters.category;

    const locationMatch =
      filters.city === "all" ||
      (job.city === filters.city &&
        (filters.district === "all" || job.district === filters.district));

    return searchMatch && categoryMatch && locationMatch;
  });

  filtered.sort((a, b) => {
    switch (filters.sort) {
      case "company":
        return a.company.localeCompare(b.company);
      case "deadline":
        return a.deadline.localeCompare(b.deadline);
      case "latest":
      default:
        return b.id - a.id;
    }
  });

  return filtered;
}

// 공고 목록 렌더링
async function renderJobList() {
  const jobList = document.getElementById("jobList");
  const jobCount = document.getElementById("jobCount");

  // 서버 데이터가 있으면 먼저 렌더링
  if (currentJobs.length > 0) {
    updateJobList(currentJobs);
  }

  try {
    // API에서 최신 데이터 가져오기
    const response = await fetch("/api/jobs");
    const data = await response.json();

    if (data.ok && data.items) {
      currentJobs = data.items;
      updateJobList(currentJobs);
    }
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    // 에러 발생해도 기존 데이터 유지
  }
}

function updateJobList(jobs) {
  const jobList = document.getElementById("jobList");
  const jobCount = document.getElementById("jobCount");

  jobCount.textContent = jobs.length;

  if (jobs.length === 0) {
    jobList.innerHTML =
      '<p class="text-center text-muted-foreground">채용공고가 없습니다.</p>';
    return;
  }

  jobList.innerHTML = jobs
    .map(
      (job) => `
    <div class="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition cursor-pointer"
         onclick="openJobDetail('${job.empSeqno}')">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-semibold">${job.title}</h3>
          <p class="text-sm text-muted-foreground mt-1">${job.company}</p>
        </div>
        <span class="text-xs text-muted-foreground">${job.endDate || "-"}</span>
      </div>
      <div class="text-xs text-muted-foreground mt-2">${job.region || ""}</div>
    </div>
  `
    )
    .join("");
}

// 공고 카드 생성
function createJobCard(job) {
  const card = document.createElement("div");
  card.className =
    "bg-card border border-border rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow";
  card.addEventListener("click", () => selectJob(job));

  card.innerHTML = `
        <h3 class="font-semibold mb-2">${job.title}</h3>
        <p class="text-sm text-muted-foreground mb-3">${job.company} · ${
    job.region
  }</p>
        <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">마감일: ${
              job.endDate || "정보 없음"
            }</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        </div>
    `;

  return card;
}

// 공고 선택
function selectJob(job) {
  localStorage.setItem("selectedJob", JSON.stringify(job));
  window.location.href = "/job-detail";
}

// 필터 적용
function applyFilters() {
  filters.search = document.getElementById("searchInput").value;
  renderJobList();
}

// 모든 필터 초기화
function clearAllFilters() {
  filters = {
    search: "",
    category: "all",
    city: "all",
    district: "all",
    sort: "latest",
  };

  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "all";
  document.getElementById("cityFilter").value = "all";
  document.getElementById("districtFilter").value = "all";
  document.getElementById("districtFilter").style.display = "none";
  document.getElementById("sortFilter").value = "latest";

  renderJobList();
}

// 페이지 초기화
document.addEventListener("DOMContentLoaded", function () {
  initializeLocationSelect();
  renderJobList();
})(
  /* ======= 채용공고 연동·필터 보강 모듈  ======= */
  function () {
    // 이미 초기화됐다면 중복 로드 방지
    if (window.__JOB_LIST_PATCHED__) return;
    window.__JOB_LIST_PATCHED__ = true;

    // ===== 0) 안전 유틸 =====
    const $ = (id) => document.getElementById(id);
    const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

    // ===== 1) 공통 API (api.js 없을 경우 대비) =====
    const API_BASE = `${location.origin}/api`;
    async function _json(res) {
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "API_ERROR");
      return j;
    }
    async function apiGetJobs(params = {}) {
      if (window.API?.getJobs) return window.API.getJobs(params); // api.js 있으면 그거 사용
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/jobs${qs ? "?" + qs : ""}`);
      return (await _json(res)).items;
    }

    // ===== 2) 상태(state) (이미 있으면 재사용) =====
    const state = window.JobListState || {
      keyword: "",
      category: "all",
      sort: "recent",
      city: "all",
      district: "all",
      items: [],
    };
    window.JobListState = state; // 공개

    // ===== 3) 지역 드롭다운 연동 (없으면 기본 제공) =====
    // 네 템플릿 id 기준: #cityFilter, #districtFilter
    if (!window.initRegionDropdowns) {
      const REGION_MAP = {
        서울: ["강남구", "서초구", "송파구", "마포구", "종로구"],
        경기: ["고양시", "성남시", "수원시", "용인시", "파주시"],
        부산: ["해운대구", "수영구", "연제구", "부산진구"],
      };
      window.initRegionDropdowns = function initRegionDropdowns() {
        const citySel = $("cityFilter");
        const distSel = $("districtFilter");
        if (!citySel || !distSel) return;

        on(citySel, "change", () => {
          const city = citySel.value;
          state.city = city;
          // 시/도 변경 시 구/군 목록 갱신
          const dists = REGION_MAP[city] || [];
          distSel.innerHTML =
            `<option value="all">전체</option>` +
            dists.map((d) => `<option value="${d}">${d}</option>`).join("");
          state.district = "all";
          triggerFetchAndRender();
          updateActiveFilters();
        });

        on(distSel, "change", () => {
          state.district = distSel.value;
          triggerFetchAndRender();
          updateActiveFilters();
        });
      };
    }

    // ===== 4) 필터 토글(없으면 기본 제공) =====
    if (!window.initFilterToggle) {
      window.initFilterToggle = function initFilterToggle() {
        const btn = $("filterToggleBtn");
        const panel = $("filterPanel");
        if (!btn || !panel) return;
        on(btn, "click", () => {
          const isOpen = panel.getAttribute("data-open") === "1";
          panel.setAttribute("data-open", isOpen ? "0" : "1");
          panel.style.display = isOpen ? "none" : "block";
        });
      };
    }

    // ===== 5) 활성 필터 뱃지 업데이트(없으면 기본 제공) =====
    if (!window.updateActiveFilters) {
      window.updateActiveFilters = function updateActiveFilters() {
        const wrap = $("activeFilters");
        if (!wrap) return;
        const chips = [];

        if (state.keyword) chips.push(`#${state.keyword}`);
        if (state.category && state.category !== "all")
          chips.push(`#${state.category}`);
        if (state.city && state.city !== "all") chips.push(`#${state.city}`);
        if (state.district && state.district !== "all")
          chips.push(`#${state.district}`);
        if (state.sort && state.sort !== "recent") chips.push(`#${state.sort}`);

        wrap.innerHTML = chips.length
          ? chips
              .map(
                (t) =>
                  `<span class="px-2 py-1 text-xs bg-muted rounded">${t}</span>`
              )
              .join("")
          : `<span class="text-xs text-muted-foreground">필터 없음</span>`;
      };
    }

    // ===== 6) 렌더러(없으면 기본 제공) =====
    if (!window.renderJobList) {
      window.renderJobList = function renderJobList(items) {
        const listEl = $("jobList");
        const countEl = $("jobCount");
        if (countEl) countEl.textContent = items.length;

        if (!listEl) return;
        if (!items.length) {
          listEl.innerHTML = `<div class="text-sm text-muted-foreground">표시할 공고가 없습니다.</div>`;
          return;
        }
        listEl.innerHTML = items.map(cardTpl).join("");
      };
    }

    // ===== 7) 카드 템플릿 & 클릭 핸들러(없으면 기본 제공) =====
    if (!window.openJobDetail) {
      window.openJobDetail = function openJobDetail(id) {
        location.href = `/job-detail?id=${encodeURIComponent(id)}`;
      };
    }
    function cardTpl(job) {
      const end = job.endDate || "-";
      const region = job.region || "";
      return `
      <div class="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition"
           data-id="${job.empSeqno}"
           role="button"
           tabindex="0"
           onclick="openJobDetail('${job.empSeqno}')">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-semibold">${job.title}</h3>
            <p class="text-sm text-muted-foreground mt-1">${job.company}</p>
          </div>
          <span class="text-xs text-muted-foreground">${end}</span>
        </div>
        <div class="text-xs text-muted-foreground mt-2">${region}</div>
      </div>`;
    }

    // ===== 8) 검색/카테고리/정렬 이벤트(이미 있으면 건드리지 않음) =====
    const searchInput = $("searchInput");
    const categorySel = $("categoryFilter");
    const sortSel = $("sortFilter");

    // 이미 프로젝트에 동일한 이벤트가 있으면 중복 실행만 피하면 됨
    if (searchInput && !searchInput.__PATCHED__) {
      searchInput.__PATCHED__ = true;
      on(
        searchInput,
        "input",
        debounce(() => {
          state.keyword = searchInput.value.trim();
          triggerFetchAndRender();
          updateActiveFilters();
        }, 250)
      );
    }
    if (categorySel && !categorySel.__PATCHED__) {
      categorySel.__PATCHED__ = true;
      on(categorySel, "change", () => {
        state.category = categorySel.value;
        triggerFetchAndRender();
        updateActiveFilters();
      });
    }
    if (sortSel && !sortSel.__PATCHED__) {
      sortSel.__PATCHED__ = true;
      on(sortSel, "change", () => {
        state.sort = sortSel.value;
        triggerFetchAndRender();
        updateActiveFilters();
      });
    }

    // ===== 9) 페치 → 렌더 공통 경로 =====
    async function triggerFetchAndRender() {
      const listEl = $("jobList");
      if (listEl)
        listEl.innerHTML = `<div class="text-sm text-muted-foreground">로딩 중…</div>`;

      // 서버 파라미터 매핑(간단 예시)
      const params = {};
      if (state.keyword) params.keyword = state.keyword;
      // city/district/category/sort는 서버에서 실제 Work24 파라미터로 매핑해도 됨

      try {
        const items = await apiGetJobs(params);
        state.items = items;
        // 클라이언트 측 필터(옵션): 카테고리/지역 등
        const filtered = items.filter((it) => {
          // 예시 필터, 실제 필드와 맞춰 조정 가능
          const passCity =
            state.city === "all" || it.region?.includes?.(state.city);
          const passDistrict =
            state.district === "all" || it.region?.includes?.(state.district);
          return passCity && passDistrict;
        });

        // 정렬(예시)
        const sorted = [...filtered].sort((a, b) => {
          if (state.sort === "deadline") {
            return (a.endDate || "").localeCompare(b.endDate || "");
          }
          // recent(기본): 데이터 자체가 최신 등록 순이라고 가정
          return 0;
        });

        renderJobList(sorted);
      } catch (e) {
        if (listEl) {
          listEl.innerHTML = `<div class="text-sm text-destructive">불러오기 실패: ${e.message}</div>`;
        }
      }
    }

    // ===== 10) 진입점 =====
    function init() {
      // 기존 프로젝트에 동일 초기화가 있으면 그대로 두고, 없을 때만 기본 제공
      if (window.initRegionDropdowns) window.initRegionDropdowns();
      if (window.initFilterToggle) window.initFilterToggle();
      updateActiveFilters?.();
      triggerFetchAndRender();
    }
    window.addEventListener("DOMContentLoaded", init);

    // ===== 11) 작은 헬퍼 =====
    function debounce(fn, ms) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    }
  }
)();

/* ======= API 우선 렌더 패치 (job_list.js 맨 하단에 추가) ======= */
(function () {
  if (window.__JOB_LIST_FORCE_API__) return;
  window.__JOB_LIST_FORCE_API__ = true;

  const $ = (id) => document.getElementById(id);

  // 간단 카드 템플릿 (data.js의 렌더와 무관하게 동작)
  function itemTpl(job) {
    const end = job.endDate || "-";
    const region = job.region || "";
    return `
      <div class="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition"
           onclick="openJobDetail('${job.empSeqno}')">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-semibold">${job.title}</h3>
            <p class="text-sm text-muted-foreground mt-1">${job.company}</p>
          </div>
          <span class="text-xs text-muted-foreground">${end}</span>
        </div>
        <div class="text-xs text-muted-foreground mt-2">${region}</div>
      </div>
    `;
  }

  // API 렌더 (항상 DOM을 '덮어씀')
  function renderAPIList(items) {
    const listEl = $("jobList");
    const countEl = $("jobCount");
    if (!listEl) return;

    listEl.innerHTML = items.length
      ? items.map(itemTpl).join("")
      : `<div class="text-sm text-muted-foreground">표시할 공고가 없습니다.</div>`;
    if (countEl) countEl.textContent = items.length;
  }

  // 공통 API 호출 (api.js가 있으면 우선 사용)
  const API_BASE = `${location.origin}/api`;
  async function getJobs(params = {}) {
    try {
      if (window.API?.getJobs) return await window.API.getJobs(params);
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/jobs${qs ? "?" + qs : ""}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "API_ERROR");
      return j.items;
    } catch (e) {
      console.error("[job-list] /api/jobs 실패:", e);
      throw e;
    }
  }

  // 더미가 나중에 다시 그려도 API가 이기도록 감시자 설치
  let lastHTML = "";
  let apiItemsCache = null;
  function installObserver() {
    const listEl = $("jobList");
    if (!listEl || listEl.__OBS__) return;
    const mo = new MutationObserver(() => {
      if (window.__JOB_DATA_SOURCE === "api" && apiItemsCache) {
        const now = listEl.innerHTML;
        // 누군가(더미)가 덮었으면 즉시 API 내용으로 복구
        if (now !== lastHTML) {
          renderAPIList(apiItemsCache);
          lastHTML = listEl.innerHTML;
        }
      }
    });
    mo.observe(listEl, { childList: true, subtree: true });
    listEl.__OBS__ = mo;
  }

  async function initAPI() {
    // API 우선 플래그: data.js가 더미 렌더하려 할 때 스킵하도록 사용 가능
    window.__JOB_DATA_SOURCE = "api";

    const listEl = $("jobList");
    if (listEl)
      listEl.innerHTML = `<div class="text-sm text-muted-foreground">로딩 중…</div>`;

    try {
      const items = await getJobs({});
      apiItemsCache = items;
      renderAPIList(items);
      lastHTML = $("jobList")?.innerHTML || "";
      installObserver(); // 이후 더미가 덮어써도 자동 복구
    } catch (e) {
      if (listEl)
        listEl.innerHTML = `<div class="text-sm text-destructive">불러오기 실패: ${e.message}</div>`;
    }
  }

  // DOM 준비되면 실행 (중복 등록 방지)
  if (!window.__JOB_LIST_READY__) {
    window.__JOB_LIST_READY__ = true;
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", initAPI)
      : initAPI();
  }
})();
