let interviewResult = null;

function setTextByIds(ids, value){
  const val = value ?? "-";
  ids.forEach(id => { const el=document.getElementById(id); if(el) el.textContent=val; });
}

function setVerticalBar(idFill, score){
  const fillEl=document.getElementById(idFill);
  if(fillEl){
    const max = 100;
    const pct = Math.max(0, Math.min(score ?? 0, max));
    fillEl.style.height = pct + "%";
    fillEl.textContent = pct;
  }
}

function showToast(msg, type="success"){
  const el=document.createElement("div");
  el.className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-50 "+(type==="error"?"bg-red-600 text-white":"bg-green-600 text-white");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2000);
}

function downloadResult(){
  const data = interviewResult || { time:new Date().toISOString(), note:"no-data" };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url;
  a.download=`interview-result-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showToast("결과가 저장되었습니다.","success");
}

function restartInterview(){ location.href="/user-input"; }

document.addEventListener("DOMContentLoaded", async ()=>{
  try {
    const resp = await fetch("/api/result");
    const data = await resp.json();
    if (!data.ok) throw new Error("API 오류");
    interviewResult = data;
  } catch(e){
    showToast("면접 결과를 불러올 수 없습니다.","error");
    interviewResult = {
      overallScore:"-",
      detailFeedback:{direction:0, eye:0, smile:0},
      feedback:{strength:[], improvement:[], suggestion:[]},
      postureFeedback:{direction:"-", eye:"-", smile:"-"}
    };
  }

  // 총점
  setTextByIds(["scoreValue"], interviewResult.overallScore);

  // 그래프
  const df = interviewResult.detailFeedback || {};
  setVerticalBar("directionFill", df.direction);
  setVerticalBar("eyeFill", df.eye);
  setVerticalBar("smileFill", df.smile);

  // 자세 피드백 텍스트 (방향/시선/미소)
  const pf = interviewResult.postureFeedback || {};
  let pfHtml = "";
  [
    {label:"방향", key:"direction"},
    {label:"시선", key:"eye"},
    {label:"미소", key:"smile"}
  ].forEach(({label, key})=>{
    pfHtml += `<div class="feedback-section"><strong>${label}</strong>: ${pf[key]||"-"}</div>`;
  });
  document.getElementById("detailFeedbackText").innerHTML = pfHtml;

  // 상세 피드백 (강점 / 개선점 / 제안)
  const fb = interviewResult.feedback || {};
  const strength = (fb.strength||[]).map(t=>`<li>${t}</li>`).join("");
  const improvement = (fb.improvement||[]).map(t=>`<li>${t}</li>`).join("");
  const suggestion = (fb.suggestion||[]).map(t=>`<li>${t}</li>`).join("");

  document.getElementById("feedbackContent").innerHTML = `
    <div class="feedback-section"><strong>강점</strong><ul>${strength||"<li>-</li>"}</ul></div>
    <div class="feedback-section"><strong>개선점</strong><ul>${improvement||"<li>-</li>"}</ul></div>
    <div class="feedback-section"><strong>제안</strong><ul>${suggestion||"<li>-</li>"}</ul></div>
  `;
});
