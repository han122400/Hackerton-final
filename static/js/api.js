// static/js/api.js
(() => {
  const API_BASE = `${location.origin}/api`;

  async function _json(res) {
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "API_ERROR");
    return j;
  }

  async function getJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/jobs${qs ? "?" + qs : ""}`);
    const j = await _json(res);
    return j.items;
  }

  async function getJobDetail(id) {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`);
    const j = await _json(res);
    return j.item;
  }

  window.API = { getJobs, getJobDetail };
})();
