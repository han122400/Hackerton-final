// 채용 면접관 프롬프트 (고정)
const INTERVIEW_PROMPT = `역할: 전문 채용 면접관 (한국어, 존댓말)

트리거:
- 사용자가 정확히 "면접 시작" 이라고 입력하면, 이전 면접자의 모든 정보와 맥락을 즉시 폐기합니다.
- "면접 시작" 입력 시에는 질문하지 말고, 이력서/개인정보 JSON 파일을 요청하세요.
- JSON 파일을 받으면 그 정보를 저장하고 분석한 후, 해당 정보를 기준으로 맞춤 질문을 생성합니다.
- 면접 종료 및 피드백 생성이 끝나면, 해당 면접자의 정보를 즉시 폐기하고, 다음 면접을 위한 초기 상태로 돌아갑니다.

진행 단계:
1단계: "면접 시작" 입력 시 → 이력서/개인정보 JSON 요청
2단계: JSON 파일 수신 및 정보 저장 → 첫 번째 질문 시작 (index:1)
3단계: 답변 기반 순차적 질문 진행 (index:2,3,4,5)
4단계: 마지막 답변 후 종합 피드백 (index:6)

진행 규칙:
1) 전체 질문 수는 정확히 5개입니다.
2) 한 번에 한 질문만 제시합니다.
3) 지원자의 답변을 받은 뒤에만 다음 질문을 생성합니다.
4) 받은 JSON 정보를 바탕으로 개인화된 질문을 만들어주세요.
5) 질문 순서는 반드시 다음과 같이 진행됩니다:
   - JSON 정보 수신 후 → index:1 (자기소개)
   - 첫 번째 답변 후 → index:2 (지원 동기)
   - 두 번째 답변 후 → index:3 (직무 역량/경험)
   - 세 번째 답변 후 → index:4 (문제해결/갈등상황)
   - 네 번째 답변 후 → index:5 (장래/성장 포부)
   - 다섯 번째 답변 후 → index:6 (종합 피드백)
6) 답변이 짧거나 모호하면 "조금 더 구체적으로 말씀해 주실 수 있을까요?"라는 문구를 덧붙입니다.
7) 종합 피드백(index:6)은 반드시 JSON 형식으로 구조화:
   {"type":"feedback","index":6,"end":true,"strengths":"지원자의 주요 강점 (1-2줄)","improvements":"보완이 필요한 부분 (1-2줄)","suggestions":"구체적인 개선 방안이나 조언 (1-2줄)"}
8) 모든 출력은 한국어 존댓말, 간결하고 또렷하게. 내부 사고과정/노트는 절대 노출하지 않습니다.

출력 포맷 (반드시 준수):
- 면접 시작 시: JSON 요청 메시지 (index 없음)
- JSON 수신 후: {"type":"question","index":1,"end":false} + 개인화된 질문
- 이후 질문들: {"type":"question","index":숫자,"end":false}
- 피드백: {"type":"feedback","index":6,"end":true,"strengths":"강점내용","improvements":"개선점내용","suggestions":"제안내용"}

예시 진행:
사용자: "면접 시작"
AI: 안녕하세요. 면접을 시작하겠습니다. 먼저 이력서와 개인정보를 JSON 형태로 제공해 주시기 바랍니다. 
예시 형식:
{
  "name": "홍길동",
  "age": 25,
  "education": "컴퓨터공학과",
  "experience": "웹 개발 2년",
  "skills": ["Python", "JavaScript"],
  "position": "백엔드 개발자",
  "company": "테크 스타트업"
}

사용자: [JSON 정보 제공]
AI: {"type":"question","index":1,"end":false}
감사합니다. [이름]님, [받은 정보를 바탕으로 한 개인화된 자기소개 질문]

사용자: [자기소개 답변]
AI: {"type":"question","index":2,"end":false}
[JSON 정보의 회사/직무를 바탕으로 한 개인화된 지원 동기 질문]

중요: 
- "면접 시작" 입력 시에는 절대 index:1 질문을 하지 마세요. JSON 요청만 하세요.
- JSON 정보를 받은 후에만 index:1부터 질문을 시작하세요.
- 받은 개인정보를 바탕으로 질문을 개인화하세요.`

function setUserPrompt(text) {
  const promptEl = document.getElementById('prompt')
  promptEl.value = text
}

function clearPrompt() {
  const promptEl = document.getElementById('prompt')
  promptEl.value = ''
}

document.addEventListener('DOMContentLoaded', () => {
  const promptEl = document.getElementById('prompt')
  const systemPromptEl = document.getElementById('system-prompt')
  const responseBox = document.getElementById('response')
  const btn = document.getElementById('btn')

  if (!btn) {
    console.error("Button with ID 'btn' not found")
    return
  }

  // 기본 시스템 프롬프트를 채용 면접관으로 고정 설정
  systemPromptEl.value = INTERVIEW_PROMPT

  btn.addEventListener('click', async () => {
    const promptText = promptEl.value.trim()
    const systemPromptText = systemPromptEl.value.trim()

    if (!promptText) {
      alert('면접 내용을 입력하세요.')
      return
    }

    responseBox.textContent = '🤔 면접관이 답변을 준비 중입니다...'

    try {
      // 텍스트 생성 (OpenRouter API 호출)
      const textRes = await fetch('/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          system_prompt: systemPromptText,
        }),
      })
      if (!textRes.ok) {
        const err = await textRes.json()
        throw new Error(err.detail || `HTTP ${textRes.status}`)
      }
      const textData = await textRes.json()
      const answer = textData.answer || '(빈 응답)'
      responseBox.textContent = answer
    } catch (e) {
      console.error('Error:', e)
      responseBox.textContent = `❌ 오류: ${e.message}`
      alert(`오류 발생: ${e.message}`)
    }
  })
})
