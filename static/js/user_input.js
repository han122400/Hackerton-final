// user_input.js
function handleFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const interviewData = {
    position: formData.get("jobTitle") || "",
    company: formData.get("company") || "",
    notes: formData.get("notes") || "",
    userName: localStorage.getItem("userName") || "", // ✅ 추가
    startTime: new Date(),
    answers: [],
    duration: 0,
  };

  if (!interviewData.position || !interviewData.company) {
    alert("직무와 회사는 필수입니다.");
    return;
  }

  // localStorage 저장
  localStorage.setItem("interviewData", JSON.stringify(interviewData));

  // 서버(user-input.py)로도 전달
  fetch("/api/user-input", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(interviewData),
  })
    .then((res) => res.json())
    .then((r) => {
      if (!r.ok) {
        alert("서버 저장 실패");
        return;
      }
      window.location.href = "/interview";
    })
    .catch((err) => {
      console.error(err);
      alert("서버와 통신 실패");
    });
}
