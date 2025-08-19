document.addEventListener('DOMContentLoaded', () => {
  const promptEl = document.getElementById('prompt')
  const responseBox = document.getElementById('response')
  const audio = document.getElementById('audio')
  const btn = document.getElementById('btn')

  if (!btn) {
    console.error("Button with ID 'btn' not found")
    return
  }

  btn.addEventListener('click', async () => {
    const promptText = promptEl.value.trim()
    if (!promptText) {
      alert('프롬프트를 입력하세요.')
      return
    }

    responseBox.textContent = '생성 중...'
    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    try {
      // 텍스트 생성 (OpenRouter API 호출)
      const textRes = await fetch('/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      })
      if (!textRes.ok) {
        const err = await textRes.json()
        throw new Error(err.detail || `HTTP ${textRes.status}`)
      }
      const textData = await textRes.json()
      const answer = textData.answer || '(빈 응답)'
      responseBox.textContent = answer

      if (!answer) return

      // 음성 생성 (Typecast TTS API 호출)
      const ttsRes = await fetch('/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer }),
      })
      if (!ttsRes.ok) {
        const err = await ttsRes.json()
        throw new Error(err.detail || `HTTP ${ttsRes.status}`)
      }
      const blob = await ttsRes.blob()
      const url = URL.createObjectURL(blob)
      audio.src = url
      audio.load()
      audio.play().catch((e) => {
        console.warn('Autoplay blocked:', e)
        responseBox.textContent +=
          '\n음성을 재생하려면 플레이 버튼을 클릭하세요.'
      })
    } catch (e) {
      console.error('Error:', e)
      responseBox.textContent = `오류: ${e.message}`
      alert(`오류 발생: ${e.message}`)
    }
  })
})
