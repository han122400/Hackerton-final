// static/js/profile.js
function goBack() {
  location.href = "/";
}

function showToast(message, type = "success") {
  const el = document.createElement("div");
  el.className =
    "fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50 " +
    (type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

async function saveToServer(data) {
  const res = await fetch("/api/user-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.detail || json.error || "서버 저장 실패");
  }
  return json;
}

function loadProfileData() {
  try {
    const raw = localStorage.getItem("profileData");
    if (!raw) return;
    const d = JSON.parse(raw);
    document.getElementById("name").value = d.name || "";
    document.getElementById("email").value = d.email || "";
    document.getElementById("phone").value = d.phone || "";
    document.getElementById("education").value = d.education || "";
    document.getElementById("experience").value = d.experience || "";
  } catch (_) {}
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    education: document.getElementById("education").value.trim(),
    experience: document.getElementById("experience").value.trim(),
  };

  // 간단한 필수값 체크
  if (!payload.name || !payload.email) {
    showToast("이름과 이메일은 필수입니다.", "error");
    return;
  }

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();

    if (!res.ok || !j.ok) {
      throw new Error(j.detail || j.error || `HTTP ${res.status}`);
    }

    // ✅ 성공 시 로컬스토리지 저장 (전체 + userName)
    localStorage.setItem("profileData", JSON.stringify(payload));
    localStorage.setItem("userName", payload.name);

    showToast("저장되었습니다.", "success");
    setTimeout(() => goBack(), 800);
  } catch (err) {
    console.error(err);
    showToast(`저장 실패: ${err.message}`, "error");
  }
}

function loadProfileData() {
  const raw = localStorage.getItem("profileData");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    document.getElementById("name").value = data.name || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("education").value = data.education || "";
    document.getElementById("experience").value = data.experience || "";
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
  loadProfileData();
  document
    .getElementById("profileForm")
    .addEventListener("submit", handleFormSubmit);
});
