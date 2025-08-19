// 사용자 입력 페이지 JavaScript

// 뒤로가기
function goBack() {
    window.location.href = 'index.html';
}

// 폼 제출 처리
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const interviewData = {
        position: formData.get('jobTitle'),
        company: formData.get('company'),
        jobDescription: formData.get('jobDescription'),
        resume: formData.get('resume') ? formData.get('resume').name : null,
        coverLetter: formData.get('coverLetter'),
        portfolio: formData.get('portfolio') ? formData.get('portfolio').name : null,
        startTime: new Date(),
        answers: [],
        duration: 0
    };
    
    localStorage.setItem('interviewData', JSON.stringify(interviewData));
    window.location.href = 'interview.html';
}

// 프로필 데이터 로드
function loadProfileData() {
    const savedData = localStorage.getItem('profileData');
    if (savedData) {
        const data = JSON.parse(savedData);
        // 프로필 데이터가 있으면 일부 필드를 미리 채울 수 있음
        // 현재는 별도 필드가 없으므로 나중에 확장 가능
    }
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadProfileData();
    document.getElementById('inputForm').addEventListener('submit', handleFormSubmit);
});