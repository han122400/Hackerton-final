// 면접 결과 페이지 JavaScript

let interviewResult = null;

// 토스트 메시지 표시
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 ${
        type === 'success' ? 'bg-green-600 text-white' : 
        'bg-gray-600 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 결과 렌더링
function renderResult() {
    if (!interviewResult) return;
    
    // 전체 점수
    document.getElementById('overallScore').textContent = interviewResult.overallScore;
    
    // 세부 평가
    const evaluationItems = document.getElementById('evaluationItems');
    evaluationItems.innerHTML = interviewResult.scores.map(score => `
        <div class="flex items-center gap-3">
            <span class="w-20 text-sm font-medium flex-shrink-0">${score.name}</span>
            <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-green-600 transition-all duration-500 rounded-full" style="width: ${score.score}%"></div>
            </div>
            <span class="w-10 text-sm font-semibold text-right flex-shrink-0">${score.score}점</span>
        </div>
    `).join('');
    
    // 피드백
    const feedbackContent = document.getElementById('feedbackContent');
    feedbackContent.innerHTML = `
        <div class="mb-4">
            <strong class="text-foreground">잘한 점:</strong>
            <ul class="mt-2 space-y-1 pl-4">
                ${interviewResult.feedback.positive.map(item => `<li class="list-disc">${item}</li>`).join('')}
            </ul>
        </div>
        <div>
            <strong class="text-foreground">개선점:</strong>
            <ul class="mt-2 space-y-1 pl-4">
                ${interviewResult.feedback.improvement.map(item => `<li class="list-disc">${item}</li>`).join('')}
            </ul>
        </div>
    `;
    
    // 추천사항
    const recommendations = document.getElementById('recommendations');
    recommendations.innerHTML = interviewResult.recommendations.map((rec, index) => `
        <div class="bg-muted p-3 rounded-lg">
            <span class="font-semibold text-sm block mb-1">추천 ${index + 1}</span>
            <span class="text-xs text-muted-foreground">${rec}</span>
        </div>
    `).join('');
}

// 결과 저장
function saveResult() {
    const resultData = JSON.stringify(interviewResult);
    const blob = new Blob([resultData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-result-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showToast('결과가 저장되었습니다.', 'success');
}

// 다시 연습하기
function restartInterview() {
    // 로컬스토리지 정리
    localStorage.removeItem('interviewResult');
    localStorage.removeItem('interviewData');
    localStorage.removeItem('selectedJob');
    localStorage.removeItem('coverLetterData');
    
    window.location.href = 'index.html';
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function() {
    const resultData = localStorage.getItem('interviewResult');
    if (resultData) {
        interviewResult = JSON.parse(resultData);
        renderResult();
    } else {
        alert('결과 데이터를 찾을 수 없습니다.');
        window.location.href = 'index.html';
    }
});