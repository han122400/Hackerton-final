async function saveResult() {
  const email = localStorage.getItem("userEmail");
  const interviewResult = localStorage.getItem("interviewResult"); // JSON 문자열

  if (!email || !interviewResult) {
    alert("이메일 또는 interviewResult가 없습니다.");
    return;
  }

  try {
  const res = await fetch("/api/result_save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        result: JSON.parse(interviewResult)
      })
    });

    if (res.ok) {
      alert("DB에 저장되었습니다.");
      window.location.href = "/";
    } else {
      const err = await res.text();
      alert("저장 실패: " + err);
    }
  } catch (err) {
    console.error(err);
    alert("요청 중 오류 발생");
  }
}
