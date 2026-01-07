// 게임 상수
const EMPTY = '';
const PLAYER = '⚫';
const BOT = '✖';

// 게임 상태
let T3 = {
    Start: false,
    Turn: null,
    Board: Array(9).fill(EMPTY),
    Difficulty: 1,
    TurnCount: 0,
    Stage: 1,
    PlayerStones: [],
    BotStones: [],
};

// 유저 통계
let userStats = {
    wins: 0,
    losses: 0,
    draws: 0,
    totalScore: 0,
};

// 페이지 로드 시 통계 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    updateStatsDisplay();
});

// 로컬 스토리지에서 통계 불러오기
function loadStats() {
    const saved = localStorage.getItem('tictactoeStats');
    if (saved) {
        userStats = JSON.parse(saved);
    }
}

// 로컬 스토리지에 통계 저장
function saveStats() {
    localStorage.setItem('tictactoeStats', JSON.stringify(userStats));
}

// 통계 화면 업데이트
function updateStatsDisplay() {
    document.getElementById('wins').textContent = userStats.wins;
    document.getElementById('losses').textContent = userStats.losses;
    document.getElementById('draws').textContent = userStats.draws;
    document.getElementById('total-score').textContent = userStats.totalScore;
}

// 게임 시작
function startGame(difficulty) {
    T3 = {
        Start: true,
        Turn: Math.random() < 0.5 ? 'P' : 'B',
        Board: Array(9).fill(EMPTY),
        Difficulty: difficulty,
        TurnCount: 0,
        Stage: difficulty === 4 ? 4 : 1,
        PlayerStones: [],
        BotStones: [],
    };

    // UI 전환
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');

    // 게임 정보 표시
    document.getElementById('difficulty-display').textContent = `난이도: ${difficulty}`;
    updateTurnDisplay();
    document.getElementById('turn-count').textContent = `턴: 0`;
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = 'message';

    // 보드 초기화
    renderBoard();

    // 선공 안내 메시지
    if (T3.Turn === 'P') {
        showMessage('🎯 당신이 선공입니다! 사각형을 클릭하세요.');
    } else {
        showMessage('Bot이 선공입니다...');
        setTimeout(() => botTurn(), 800);
    }
}

// 턴 표시 업데이트
function updateTurnDisplay() {
    const turnText = T3.Turn === 'P' ? '플레이어' : 'Bot';
    document.getElementById('turn-display').textContent = `차례: ${turnText}`;
}

// 보드 렌더링
function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = T3.Board[index];
        cell.className = 'cell';

        if (T3.Board[index] === PLAYER) {
            cell.classList.add('player');
        } else if (T3.Board[index] === BOT) {
            cell.classList.add('bot');
        }
    });
}

// 메시지 표시
function showMessage(text, type = '') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
}

// 플레이어 이동
function playerMove(index) {
    if (!T3.Start || T3.Turn !== 'P') return;
    if (T3.Board[index] !== EMPTY) {
        showMessage('이미 돌이 놓여져 있습니다!');
        return;
    }

    // 4단계: 3개 초과 시 가장 오래된 돌 제거
    if (T3.Stage === 4 && T3.PlayerStones.length >= 3) {
        const removeIndex = T3.PlayerStones.shift();
        T3.Board[removeIndex] = EMPTY;
        fadeOutCell(removeIndex);
    }

    // 돌 놓기
    T3.Board[index] = PLAYER;
    T3.PlayerStones.push(index);
    T3.TurnCount++;

    renderBoard();
    document.getElementById('turn-count').textContent = `턴: ${Math.ceil(T3.TurnCount / 2)}`;

    // 승리 체크
    const result = checkWinner();
    if (result) {
        endGame(result);
        return;
    }

    // 봇 턴으로 전환
    T3.Turn = 'B';
    updateTurnDisplay();
    showMessage('Bot의 차례입니다...');
    setTimeout(() => botTurn(), 800);
}

// 셀 페이드 아웃 효과
function fadeOutCell(index) {
    const cell = document.querySelectorAll('.cell')[index];
    cell.classList.add('fade-out');
}

// 봇 이동
function botTurn() {
    if (!T3.Start) return;

    let move;
    if (T3.Difficulty === 1) {
        move = randomMove();
    } else if (T3.Difficulty === 2) {
        move = Math.random() < 0.7 ? smartMove() : randomMove();
    } else {
        move = smartMove();
    }

    // 4단계: 3개 초과 시 가장 오래된 돌 제거
    if (T3.Stage === 4 && T3.BotStones.length >= 3) {
        const removeIndex = T3.BotStones.shift();
        T3.Board[removeIndex] = EMPTY;
    }

    // 돌 놓기
    T3.Board[move] = BOT;
    T3.BotStones.push(move);
    T3.TurnCount++;

    renderBoard();
    document.getElementById('turn-count').textContent = `턴: ${Math.ceil(T3.TurnCount / 2)}`;

    // 승리 체크
    const result = checkWinner();
    if (result) {
        endGame(result);
        return;
    }

    // 플레이어 턴으로 전환
    T3.Turn = 'P';
    updateTurnDisplay();
    showMessage('당신의 차례입니다!');
}

// 랜덤 이동
function randomMove() {
    const emptySpots = [];
    for (let i = 0; i < 9; i++) {
        if (T3.Board[i] === EMPTY) {
            emptySpots.push(i);
        }
    }
    return emptySpots[Math.floor(Math.random() * emptySpots.length)];
}

// 스마트 이동 (AI)
function smartMove() {
    // 1. 승리 가능한 수 찾기
    const winMove = findWinningMove(BOT);
    if (winMove !== null) return winMove;

    // 2. 플레이어 승리 막기
    const blockMove = findWinningMove(PLAYER);
    if (blockMove !== null) return blockMove;

    // 3. 중앙 선점
    if (T3.Board[4] === EMPTY) return 4;

    // 4. 코너 선점
    const corners = [0, 2, 6, 8];
    const emptyCorners = corners.filter((i) => T3.Board[i] === EMPTY);
    if (emptyCorners.length > 0) {
        return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
    }

    // 5. 랜덤
    return randomMove();
}

// 승리 가능한 수 찾기
function findWinningMove(stone) {
    for (let i = 0; i < 9; i++) {
        if (T3.Board[i] === EMPTY) {
            T3.Board[i] = stone;
            if (checkWinnerForStone(stone)) {
                T3.Board[i] = EMPTY;
                return i;
            }
            T3.Board[i] = EMPTY;
        }
    }
    return null;
}

// 특정 돌의 승리 체크
function checkWinnerForStone(stone) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8], // 가로
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8], // 세로
        [0, 4, 8],
        [2, 4, 6], // 대각선
    ];

    for (const line of lines) {
        if (line.every((i) => T3.Board[i] === stone)) {
            return true;
        }
    }
    return false;
}

// 승리자 체크
function checkWinner() {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8], // 가로
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8], // 세로
        [0, 4, 8],
        [2, 4, 6], // 대각선
    ];

    for (const line of lines) {
        const [a, b, c] = line;
        if (T3.Board[a] !== EMPTY && T3.Board[a] === T3.Board[b] && T3.Board[a] === T3.Board[c]) {
            return T3.Board[a] === PLAYER ? 'P' : 'B';
        }
    }

    // 4단계에서는 무승부 없음
    if (T3.Stage === 4) return null;

    // 모든 칸이 채워지면 무승부
    if (T3.Board.every((cell) => cell !== EMPTY)) {
        return 'D';
    }

    return null;
}

// 게임 종료
function endGame(result) {
    T3.Start = false;
    const turnCount = Math.ceil(T3.TurnCount / 2);

    if (result === 'P') {
        const scoreResult = calculateScore(true, T3.Difficulty, turnCount);
        userStats.wins++;
        userStats.totalScore += scoreResult.score;
        showMessage(`🎉 승리! +${scoreResult.score}점`, 'win');
    } else if (result === 'B') {
        const scoreResult = calculateScore(false, T3.Difficulty, turnCount);
        userStats.losses++;
        userStats.totalScore += scoreResult.score;
        showMessage(`😢 패배! ${scoreResult.score}점`, 'lose');
    } else {
        const score = T3.Difficulty;
        userStats.draws++;
        userStats.totalScore += score;
        showMessage(`🤝 무승부! +${score}점`, 'draw');
    }

    // Firebase 또는 로컬 저장
    if (typeof saveUserDataToFirestore === 'function' && currentUser) {
        saveUserDataToFirestore();
    } else {
        saveStats();
    }
    updateStatsDisplay();

    // 순위 새로고침
    if (typeof loadGlobalRanking === 'function' && currentUser) {
        setTimeout(() => loadGlobalRanking(), 500);
    }
}

// 점수 계산
function calculateScore(isWin, difficulty, turnCount) {
    const baseScore = difficulty * 10;
    let finalScore;

    if (isWin) {
        finalScore = Math.max(1, Math.round(baseScore - turnCount));
    } else {
        finalScore = -1 * (4 - difficulty);
    }

    return { score: finalScore };
}

// 게임 리셋
function resetGame() {
    startGame(T3.Difficulty);
}

// 메뉴로 돌아가기
function goToMenu() {
    T3.Start = false;
    document.getElementById('game').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
}
