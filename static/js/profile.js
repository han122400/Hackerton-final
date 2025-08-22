function goBack() {
  location.href = "/";
}

function showToast(message, type = "success") {
  const wrap = document.createElement("div");
  wrap.className = "position-fixed top-0 start-50 translate-middle-x mt-3 z-3";
  wrap.innerHTML = `<div class="alert alert-${
    type === "error" ? "danger" : type
  } shadow">${message}</div>`;
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2000);
}

// 저장
function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    education: document.getElementById("education").value.trim(),
    experience: document.getElementById("experience").value.trim(),
  };
  localStorage.setItem("profileData", JSON.stringify(data));
  showToast("저장되었습니다.", "success");
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
