// user_input.js
function handleFormSubmit(e) {
  e.preventDefault();

  const formEl = e.target;
  const fd = new FormData(formEl);

  // 추가: 로컬스토리지에서 userName 같이 담기
  const userName = localStorage.getItem("userName") || "";
  fd.append("userName", userName);

  // 필수값 검증: 직무만 (company 필드는 폼에서 제거됨)
  const position = fd.get("jobTitle")?.trim();
  if (!position) {
    alert("직무는 필수입니다.");
    return;
  }

  // interviewData 메타를 localStorage에 저장(파일 제외)
  const interviewData = {
    position,
    userName,
    notes: fd.get("notes") || "",
    startTime: new Date(),
    answers: [],
    duration: 0,
  };
  localStorage.setItem("interviewData", JSON.stringify(interviewData));

  // 서버로 multipart 업로드
  fetch("/api/user-input", {
    method: "POST",
    body: fd, // <-- multipart/form-data (파일 포함)
  })
    .then((res) => res.json())
    .then((r) => {
      if (!r.ok) {
        alert(r.detail || "서버 저장 실패");
        return;
      }
      // 성공 시 인터뷰 화면으로
      window.location.href = "/interview";
    })
    .catch((err) => {
      console.error(err);
      alert("서버와 통신 실패");
    });
}
