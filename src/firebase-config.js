// Firebase 설정
// ⚠️ 중요: 아래 설정값을 본인의 Firebase 프로젝트 설정으로 교체하세요!
// Firebase Console > 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성

const firebaseConfig = {
    apiKey: 'AIzaSyBcu45VGow8irHwMxEoRFUKntFapgTnggw',
    authDomain: 'tiktaktoe-5a2b2.firebaseapp.com',
    projectId: 'tiktaktoe-5a2b2',
    storageBucket: 'tiktaktoe-5a2b2.firebasestorage.app',
    messagingSenderId: '828799841484',
    appId: '1:828799841484:web:74b6d231cd7d5f30493e69',
    measurementId: 'G-SE90FN1ZFB',
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firebase 서비스 인스턴스
const auth = firebase.auth();
const db = firebase.firestore();

// 현재 로그인한 유저
let currentUser = null;

// ==================== 인증 관련 함수 ====================

// 인증 상태 변경 감지
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    updateAuthUI();

    if (user) {
        // 로그인 상태: Firestore에서 유저 데이터 로드
        await loadUserDataFromFirestore();
        loadGlobalRanking();
    } else {
        // 로그아웃 상태: 로컬 스토리지에서 로드
        loadStats();
    }
    updateStatsDisplay();
});

// 이메일 회원가입
async function signUpWithEmail() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const nickname = document.getElementById('signup-nickname').value;

    if (!email || !password || !nickname) {
        showAuthMessage('모든 필드를 입력해주세요!', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('비밀번호는 6자 이상이어야 합니다!', 'error');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Firestore에 유저 정보 저장
        await db.collection('users').doc(userCredential.user.uid).set({
            nickname: nickname,
            email: email,
            wins: 0,
            losses: 0,
            draws: 0,
            totalScore: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        showAuthMessage('회원가입 성공! 환영합니다 🎉', 'success');
        hideAuthModal();
    } catch (error) {
        console.error('Sign up error:', error);
        showAuthMessage(getErrorMessage(error.code), 'error');
    }
}

// 이메일 로그인
async function signInWithEmail() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    if (!email || !password) {
        showAuthMessage('이메일과 비밀번호를 입력해주세요!', 'error');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showAuthMessage('로그인 성공! 🎮', 'success');
        hideAuthModal();
    } catch (error) {
        console.error('Sign in error:', error);
        showAuthMessage(getErrorMessage(error.code), 'error');
    }
}

// Google 로그인
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);

        // 새 유저인 경우 Firestore에 정보 생성
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists) {
            await db
                .collection('users')
                .doc(result.user.uid)
                .set({
                    nickname: result.user.displayName || 'Player',
                    email: result.user.email,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    totalScore: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
        }

        showAuthMessage('Google 로그인 성공! 🎮', 'success');
        hideAuthModal();
    } catch (error) {
        console.error('Google sign in error:', error);
        showAuthMessage(getErrorMessage(error.code), 'error');
    }
}

// 로그아웃
async function signOut() {
    try {
        await auth.signOut();
        showMessage('로그아웃 되었습니다.', '');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// 에러 메시지 변환
function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
        'auth/weak-password': '비밀번호가 너무 약합니다.',
        'auth/user-not-found': '존재하지 않는 계정입니다.',
        'auth/wrong-password': '비밀번호가 틀렸습니다.',
        'auth/popup-closed-by-user': '로그인이 취소되었습니다.',
        'auth/network-request-failed': '네트워크 오류가 발생했습니다.',
    };
    return messages[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}

// ==================== Firestore 데이터 관련 ====================

// Firestore에서 유저 데이터 로드
async function loadUserDataFromFirestore() {
    if (!currentUser) return;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            userStats = {
                wins: data.wins || 0,
                losses: data.losses || 0,
                draws: data.draws || 0,
                totalScore: data.totalScore || 0,
            };
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Firestore에 유저 데이터 저장
async function saveUserDataToFirestore() {
    if (!currentUser) {
        saveStats(); // 로그인 안 된 경우 로컬 저장
        return;
    }

    try {
        await db.collection('users').doc(currentUser.uid).update({
            wins: userStats.wins,
            losses: userStats.losses,
            draws: userStats.draws,
            totalScore: userStats.totalScore,
            lastPlayedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// ==================== 순위 관련 변수 ====================
let rankingCurrentPage = 1;
let rankingTotalPages = 1;
let rankingPerPage = 10;
let allRankingData = [];

// 글로벌 순위 로드 (전체 데이터)
async function loadGlobalRanking() {
    try {
        const snapshot = await db.collection('users').orderBy('totalScore', 'desc').get();

        const rankingList = document.getElementById('ranking-list');
        if (!rankingList) return;

        if (snapshot.empty) {
            rankingList.innerHTML = '<p class="no-ranking">아직 순위 데이터가 없습니다.</p>';
            document.getElementById('ranking-pagination').classList.add('hidden');
            return;
        }

        // 전체 데이터 저장 (한 판 이상 플레이한 유저만 필터링)
        const filteredDocs = snapshot.docs.filter((doc) => {
            const data = doc.data();
            const totalGames = (data.wins || 0) + (data.losses || 0) + (data.draws || 0);
            return totalGames > 0;
        });

        allRankingData = filteredDocs.map((doc, index) => ({
            id: doc.id,
            rank: index + 1,
            ...doc.data(),
        }));

        if (allRankingData.length === 0) {
            rankingList.innerHTML = '<p class="no-ranking">아직 순위 데이터가 없습니다.</p>';
            document.getElementById('ranking-pagination').classList.add('hidden');
            return;
        }

        // 총 페이지 수 계산
        rankingTotalPages = Math.ceil(allRankingData.length / rankingPerPage);
        rankingCurrentPage = 1;

        // 첫 페이지 렌더링
        renderRankingPage();
    } catch (error) {
        console.error('Error loading ranking:', error);
    }
}

// 순위 페이지 렌더링
function renderRankingPage() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    rankingList.innerHTML = '';

    const startIndex = (rankingCurrentPage - 1) * rankingPerPage;
    const endIndex = Math.min(startIndex + rankingPerPage, allRankingData.length);
    const pageData = allRankingData.slice(startIndex, endIndex);

    pageData.forEach((data) => {
        const rank = data.rank;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
        const isCurrentUser = currentUser && data.id === currentUser.uid;

        // 전적 계산
        const wins = data.wins || 0;
        const losses = data.losses || 0;
        const draws = data.draws || 0;
        const totalGames = wins + losses + draws;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        const item = document.createElement('div');
        item.className = `ranking-item ${isCurrentUser ? 'current-user' : ''}`;
        item.innerHTML = `
            <div class="ranking-main">
                <span class="rank">${medal}</span>
                <span class="nickname">${data.nickname || 'Unknown'}</span>
                <span class="score">${data.totalScore}점</span>
            </div>
            <div class="ranking-stats">
                <span class="record">${totalGames}전 ${wins}승 ${losses}패 ${draws}무</span>
                <span class="winrate">승률 ${winRate}%</span>
            </div>
        `;
        rankingList.appendChild(item);
    });

    // 페이지네이션 업데이트
    updatePagination();
}

// 페이지네이션 UI 업데이트
function updatePagination() {
    const pagination = document.getElementById('ranking-pagination');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    // 총 인원이 10명 초과일 때만 페이지네이션 표시
    if (allRankingData.length > rankingPerPage) {
        pagination.classList.remove('hidden');
        pageInfo.textContent = `${rankingCurrentPage} / ${rankingTotalPages}`;
        prevBtn.disabled = rankingCurrentPage === 1;
        nextBtn.disabled = rankingCurrentPage === rankingTotalPages;
    } else {
        pagination.classList.add('hidden');
    }
}

// 페이지 변경
function changePage(direction) {
    const newPage = rankingCurrentPage + direction;
    if (newPage >= 1 && newPage <= rankingTotalPages) {
        rankingCurrentPage = newPage;
        renderRankingPage();
    }
}

// 순위 토글 (표시/숨기기)
function toggleRanking() {
    const rankingModal = document.getElementById('ranking-modal');
    const isHidden = rankingModal.classList.contains('hidden');

    if (isHidden) {
        rankingModal.classList.remove('hidden');
        loadGlobalRanking();
    } else {
        rankingModal.classList.add('hidden');
    }
}

// 순위 새로고침
function refreshRanking() {
    loadGlobalRanking();
}

// ==================== UI 관련 함수 ====================

// 인증 UI 업데이트
function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const userInfo = document.getElementById('user-info');
    const loginBtn = document.getElementById('login-btn');
    const rankingToggleBtn = document.getElementById('ranking-toggle-btn');
    const rankingModal = document.getElementById('ranking-modal');

    if (currentUser) {
        // 로그인 상태
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userInfo) {
            userInfo.classList.remove('hidden');
            db.collection('users')
                .doc(currentUser.uid)
                .get()
                .then((doc) => {
                    const nickname = doc.exists ? doc.data().nickname : currentUser.email;
                    document.getElementById('user-nickname').textContent = nickname;
                });
        }
        // 순위 버튼 표시 (순위 모달은 숨김 유지)
        if (rankingToggleBtn) rankingToggleBtn.classList.remove('hidden');
    } else {
        // 로그아웃 상태
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userInfo) userInfo.classList.add('hidden');
        if (rankingToggleBtn) rankingToggleBtn.classList.add('hidden');
        if (rankingModal) rankingModal.classList.add('hidden');
    }
}

// 인증 모달 표시
function showAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');
    switchAuthMode(mode);
}

// 인증 모달 숨기기
function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('hidden');
    clearAuthInputs();
}

// 로그인/회원가입 모드 전환
function switchAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
    }
    clearAuthMessage();
}

// 인증 입력 초기화
function clearAuthInputs() {
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-nickname').value = '';
    clearAuthMessage();
}

// 인증 메시지 표시
function showAuthMessage(message, type) {
    const msgEl = document.getElementById('auth-message');
    msgEl.textContent = message;
    msgEl.className = `auth-message ${type}`;
}

// 인증 메시지 초기화
function clearAuthMessage() {
    const msgEl = document.getElementById('auth-message');
    msgEl.textContent = '';
    msgEl.className = 'auth-message';
}

// 로그인 엔터키 처리
function handleLoginEnter(event) {
    if (event.key === 'Enter') {
        signInWithEmail();
    }
}

// 회원가입 엔터키 처리
function handleSignupEnter(event) {
    if (event.key === 'Enter') {
        signUpWithEmail();
    }
}

// 순위 새로고침
function refreshRanking() {
    loadGlobalRanking();
}
