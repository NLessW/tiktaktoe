// 게임 상수
const EMPTY = "";
const PLAYER = "⚫";
const BOT = "✖";

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
  Timer: null,
  TimeLeft: 0,
};

// 유저 통계
let userStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  totalScore: 0,
};

// 페이지 로드 시 통계 불러오기
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  updateStatsDisplay();
});

// 로컬 스토리지에서 통계 불러오기
function loadStats() {
  const saved = localStorage.getItem("tictactoeStats");
  if (saved) {
    userStats = JSON.parse(saved);
  }
}

// 로컬 스토리지에 통계 저장
function saveStats() {
  localStorage.setItem("tictactoeStats", JSON.stringify(userStats));
}

// 통계 화면 업데이트
function updateStatsDisplay() {
  document.getElementById("wins").textContent = userStats.wins;
  document.getElementById("losses").textContent = userStats.losses;
  document.getElementById("draws").textContent = userStats.draws;
  document.getElementById("total-score").textContent = userStats.totalScore;
}

// 게임 시작
function startGame(difficulty) {
  // 이전 타이머 정리
  if (T3.Timer) {
    clearInterval(T3.Timer);
  }

  // LEVEL 4,5: 인피니티 모드
  const isHellMode = difficulty === 5;
  const isInfiniteMode = difficulty >= 4;

  T3 = {
    Start: true,
    // 모든 난이도 랜덤 선공 (공정한 게임)
    Turn: Math.random() < 0.5 ? "P" : "B",
    Board: Array(9).fill(EMPTY),
    Difficulty: difficulty,
    TurnCount: 0,
    Stage: isInfiniteMode ? 4 : 1,
    PlayerStones: [],
    BotStones: [],
    Timer: null,
    TimeLeft: 5,
  };

  // UI 전환
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  // 게임 정보 표시
  const difficultyNames = {
    1: "EASY",
    2: "NORMAL",
    3: "HARD",
    4: "INFINITE",
    5: "🔥 HELL",
  };
  document.getElementById(
    "difficulty-display"
  ).textContent = `LV.${difficulty} ${difficultyNames[difficulty]}`;
  updateTurnDisplay();
  document.getElementById("turn-count").textContent = `턴: 0`;
  document.getElementById("message").textContent = "";
  document.getElementById("message").className = "message";

  // 보드 초기화
  renderBoard();

  // 선공 안내 메시지
  if (T3.Turn === "P") {
    showMessage("🎯 당신이 선공입니다! 사각형을 클릭하세요.");
  } else {
    showMessage(isHellMode ? "😈 Bot이 선공입니다..." : "Bot이 선공입니다...");
    setTimeout(() => botTurn(), 800);
  }
}

// 턴 표시 업데이트
function updateTurnDisplay() {
  const turnText = T3.Turn === "P" ? "플레이어" : "Bot";
  document.getElementById("turn-display").textContent = `차례: ${turnText}`;
}

// 보드 렌더링
function renderBoard() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell, index) => {
    cell.textContent = T3.Board[index];
    cell.className = "cell";

    if (T3.Board[index] === PLAYER) {
      cell.classList.add("player");
    } else if (T3.Board[index] === BOT) {
      cell.classList.add("bot");
    }
  });
}

// 메시지 표시
function showMessage(text, type = "") {
  const messageEl = document.getElementById("message");
  messageEl.textContent = text;
  messageEl.className = "message " + type;
}

// 플레이어 이동
function playerMove(index) {
  if (!T3.Start || T3.Turn !== "P") return;
  if (T3.Board[index] !== EMPTY) {
    showMessage("이미 돌이 놓여져 있습니다!");
    return;
  }

  // 4단계+: 3개 초과 시 가장 오래된 돌 제거
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
  document.getElementById("turn-count").textContent = `턴: ${Math.ceil(
    T3.TurnCount / 2
  )}`;

  // 승리 체크
  const result = checkWinner();
  if (result) {
    endGame(result);
    return;
  }

  // 봇 턴으로 전환
  T3.Turn = "B";
  updateTurnDisplay();
  showMessage(T3.Difficulty === 5 ? "😈 Bot의 차례..." : "Bot의 차례입니다...");
  setTimeout(() => botTurn(), T3.Difficulty === 5 ? 400 : 800);
}

// 셀 페이드 아웃 효과
function fadeOutCell(index) {
  const cell = document.querySelectorAll(".cell")[index];
  cell.classList.add("fade-out");
}

// 봇 이동
function botTurn() {
  if (!T3.Start) return;

  let move;
  if (T3.Difficulty === 1) {
    move = randomMove();
  } else if (T3.Difficulty === 2) {
    move = Math.random() < 0.7 ? smartMove() : randomMove();
  } else if (T3.Difficulty === 5) {
    // HELL 모드: 미니맥스 알고리즘 (완벽한 AI)
    move = minimaxMove();
  } else {
    move = smartMove();
  }

  // 4단계+: 3개 초과 시 가장 오래된 돌 제거
  if (T3.Stage === 4 && T3.BotStones.length >= 3) {
    const removeIndex = T3.BotStones.shift();
    T3.Board[removeIndex] = EMPTY;
  }

  // 돌 놓기
  T3.Board[move] = BOT;
  T3.BotStones.push(move);
  T3.TurnCount++;

  renderBoard();
  document.getElementById("turn-count").textContent = `턴: ${Math.ceil(
    T3.TurnCount / 2
  )}`;

  // 승리 체크
  const result = checkWinner();
  if (result) {
    endGame(result);
    return;
  }

  // 플레이어 턴으로 전환
  T3.Turn = "P";
  updateTurnDisplay();
  showMessage("당신의 차례입니다!");
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

// ==================== HELL 모드 전용 ====================

// 미니맥스 알고리즘 (완벽한 AI) - HELL 모드용 강화 버전
function minimaxMove() {
  let bestScore = -Infinity;
  let bestMoves = []; // 동점인 수들을 모아서 랜덤 선택 (패턴 예측 방지)

  // 인피니티 모드에서 봇이 둘 경우 가장 오래된 돌이 사라질 위치 계산
  let willRemove = null;
  if (T3.Stage === 4 && T3.BotStones.length >= 3) {
    willRemove = T3.BotStones[0];
  }

  for (let i = 0; i < 9; i++) {
    if (T3.Board[i] === EMPTY) {
      // 시뮬레이션: 돌 놓기
      T3.Board[i] = BOT;
      const newBotStones = [...T3.BotStones, i];

      // 시뮬레이션: 오래된 돌 제거
      if (willRemove !== null) {
        T3.Board[willRemove] = EMPTY;
      }

      const score = minimax(
        T3.Board,
        0,
        false,
        -Infinity,
        Infinity,
        newBotStones,
        [...T3.PlayerStones]
      );

      // 복원
      T3.Board[i] = EMPTY;
      if (willRemove !== null) {
        T3.Board[willRemove] = BOT;
      }

      // 동점인 수들 모두 저장 (랜덤 선택으로 패턴 예측 불가능하게)
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [i];
      } else if (score === bestScore) {
        bestMoves.push(i);
      }
    }
  }

  // 동점인 수 중 랜덤 선택 - 매번 다른 패턴으로 플레이
  if (bestMoves.length > 0) {
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  return randomMove();
}

// 미니맥스 with 알파베타 가지치기 - 완벽한 탐색
function minimax(
  board,
  depth,
  isMaximizing,
  alpha,
  beta,
  botStones,
  playerStones
) {
  // 종료 조건 체크
  if (checkWinnerForStone(BOT)) return 1000 - depth; // 빠른 승리 선호
  if (checkWinnerForStone(PLAYER)) return depth - 1000; // 최대한 늦게 지기

  const emptySpots = board.filter((cell) => cell === EMPTY).length;

  // 일반 모드: 빈 칸 없으면 무승부
  if (emptySpots === 0 && T3.Stage !== 4) return 0;

  // 깊이 제한 (Hell 모드는 더 깊게 탐색해서 더 똑똑하게)
  if (T3.Stage === 4) {
    if (depth > 13) return evaluatePosition(board); // 인피니티/Hell: 깊은 탐색
  } else {
    if (depth > 9) return evaluatePosition(board); // 일반: 적당한 탐색
  }

  if (isMaximizing) {
    let maxScore = -Infinity;

    // 봇의 오래된 돌 제거 시뮬레이션
    let willRemove = null;
    if (T3.Stage === 4 && botStones.length >= 3) {
      willRemove = botStones[0];
    }

    for (let i = 0; i < 9; i++) {
      if (board[i] === EMPTY) {
        board[i] = BOT;
        const newBotStones = [
          ...botStones.slice(willRemove !== null ? 1 : 0),
          i,
        ];

        if (willRemove !== null) board[willRemove] = EMPTY;

        const score = minimax(
          board,
          depth + 1,
          false,
          alpha,
          beta,
          newBotStones,
          playerStones
        );

        board[i] = EMPTY;
        if (willRemove !== null) board[willRemove] = BOT;

        maxScore = Math.max(score, maxScore);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
    }
    return maxScore;
  } else {
    let minScore = Infinity;

    // 플레이어의 오래된 돌 제거 시뮬레이션
    let willRemove = null;
    if (T3.Stage === 4 && playerStones.length >= 3) {
      willRemove = playerStones[0];
    }

    for (let i = 0; i < 9; i++) {
      if (board[i] === EMPTY) {
        board[i] = PLAYER;
        const newPlayerStones = [
          ...playerStones.slice(willRemove !== null ? 1 : 0),
          i,
        ];

        if (willRemove !== null) board[willRemove] = EMPTY;

        const score = minimax(
          board,
          depth + 1,
          true,
          alpha,
          beta,
          botStones,
          newPlayerStones
        );

        board[i] = EMPTY;
        if (willRemove !== null) board[willRemove] = PLAYER;

        minScore = Math.min(score, minScore);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
    }
    return minScore;
  }
}

// ==================== 타이머 관련 ====================

// 플레이어 타이머 시작
function startPlayerTimer() {
  if (T3.Difficulty !== 5) return;

  T3.TimeLeft = 5.0;
  updateTimerDisplay();

  T3.Timer = setInterval(() => {
    T3.TimeLeft -= 0.1;
    updateTimerDisplay();

    if (T3.TimeLeft <= 0) {
      // 시간 초과! 랜덤 위치에 강제 배치
      stopPlayerTimer();
      forceRandomMove();
    }
  }, 100);
}

// 플레이어 타이머 정지
function stopPlayerTimer() {
  if (T3.Timer) {
    clearInterval(T3.Timer);
    T3.Timer = null;
  }
}

// 타이머 UI 업데이트
function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timer-display");
  if (!timerDisplay) return;

  const time = Math.max(0, T3.TimeLeft).toFixed(1);
  timerDisplay.textContent = `⏱️ ${time}s`;

  // 시간에 따른 색상 변경
  if (T3.TimeLeft <= 2) {
    timerDisplay.classList.add("danger");
    timerDisplay.classList.remove("warning");
  } else if (T3.TimeLeft <= 3) {
    timerDisplay.classList.add("warning");
    timerDisplay.classList.remove("danger");
  } else {
    timerDisplay.classList.remove("warning", "danger");
  }
}

// 시간 초과 시 강제 랜덤 배치
function forceRandomMove() {
  if (!T3.Start || T3.Turn !== "P") return;

  showMessage("⏰ 시간 초과! 랜덤 배치!", "warning");

  const emptySpots = [];
  for (let i = 0; i < 9; i++) {
    if (T3.Board[i] === EMPTY) {
      emptySpots.push(i);
    }
  }

  if (emptySpots.length > 0) {
    const randomIndex =
      emptySpots[Math.floor(Math.random() * emptySpots.length)];

    // 기존 playerMove 로직 실행
    if (T3.Stage === 4 && T3.PlayerStones.length >= 3) {
      const removeIndex = T3.PlayerStones.shift();
      T3.Board[removeIndex] = EMPTY;
    }

    T3.Board[randomIndex] = PLAYER;
    T3.PlayerStones.push(randomIndex);
    T3.TurnCount++;

    renderBoard();
    document.getElementById("turn-count").textContent = `턴: ${Math.ceil(
      T3.TurnCount / 2
    )}`;

    const result = checkWinner();
    if (result) {
      endGame(result);
      return;
    }

    T3.Turn = "B";
    updateTurnDisplay();
    showMessage("😈 Bot의 차례...", "");
    setTimeout(() => botTurn(), 400);
  }
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

// 포지션 평가 함수 (깊이 제한 도달 시 사용)
function evaluatePosition(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  let score = 0;

  for (const line of lines) {
    const botCount = line.filter((i) => board[i] === BOT).length;
    const playerCount = line.filter((i) => board[i] === PLAYER).length;
    const emptyCount = line.filter((i) => board[i] === EMPTY).length;

    // Bot에게 유리한 라인
    if (playerCount === 0) {
      if (botCount === 2 && emptyCount === 1) score += 50; // 승리 직전
      else if (botCount === 1 && emptyCount === 2) score += 10;
    }

    // Player에게 유리한 라인 차단
    if (botCount === 0) {
      if (playerCount === 2 && emptyCount === 1) score -= 40; // 막아야 함
      else if (playerCount === 1 && emptyCount === 2) score -= 5;
    }
  }

  // 중앙 점령 보너스
  if (board[4] === BOT) score += 15;
  else if (board[4] === PLAYER) score -= 10;

  // 코너 점령 보너스
  const corners = [0, 2, 6, 8];
  for (const c of corners) {
    if (board[c] === BOT) score += 5;
    else if (board[c] === PLAYER) score -= 3;
  }

  return score;
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
    if (
      T3.Board[a] !== EMPTY &&
      T3.Board[a] === T3.Board[b] &&
      T3.Board[a] === T3.Board[c]
    ) {
      return T3.Board[a] === PLAYER ? "P" : "B";
    }
  }

  // 4단계에서는 무승부 없음
  if (T3.Stage === 4) return null;

  // 모든 칸이 채워지면 무승부
  if (T3.Board.every((cell) => cell !== EMPTY)) {
    return "D";
  }

  return null;
}

// 게임 종료
function endGame(result) {
  T3.Start = false;
  const turnCount = Math.ceil(T3.TurnCount / 2);

  if (result === "P") {
    const scoreResult = calculateScore(true, T3.Difficulty, turnCount);
    userStats.wins++;
    userStats.totalScore += scoreResult.score;

    // HELL 모드 클리어 시 특별 메시지
    if (T3.Difficulty === 5) {
      showMessage(`🔥 HELL 클리어! +${scoreResult.score}점 🔥`, "win");
      // HELL 클리어 상태 저장
      if (typeof saveHellClearedToFirestore === "function" && currentUser) {
        saveHellClearedToFirestore();
      }
    } else {
      showMessage(`🎉 승리! +${scoreResult.score}점`, "win");
    }
  } else if (result === "B") {
    const scoreResult = calculateScore(false, T3.Difficulty, turnCount);
    userStats.losses++;
    userStats.totalScore += scoreResult.score;
    showMessage(`😢 패배! ${scoreResult.score}점`, "lose");
  } else {
    const score = T3.Difficulty;
    userStats.draws++;
    userStats.totalScore += score;
    showMessage(`🤝 무승부! +${score}점`, "draw");
  }

  // Firebase 또는 로컬 저장
  if (typeof saveUserDataToFirestore === "function" && currentUser) {
    saveUserDataToFirestore();
  } else {
    saveStats();
  }
  updateStatsDisplay();

  // 순위 새로고침
  if (typeof loadGlobalRanking === "function" && currentUser) {
    setTimeout(() => loadGlobalRanking(), 500);
  }
}

// 점수 계산
function calculateScore(isWin, difficulty, turnCount) {
  // HELL 모드는 점수 2배
  const multiplier = difficulty === 5 ? 2 : 1;
  const baseScore = difficulty * 10 * multiplier;
  let finalScore;

  if (isWin) {
    finalScore = Math.max(1, Math.round(baseScore - turnCount));
  } else {
    // 패배 시 감점
    const lossScores = {
      1: -5, // EASY
      2: -4, // NORMAL
      3: -3, // HARD
      4: -2, // INFINITE
      5: 0, // HELL
    };
    finalScore = lossScores[difficulty];
  }

  return { score: finalScore };
}

// 재시작버튼 쿨다운 상태
let restartCooldown = false;

// 게임 리셋
function resetGame() {
  if (restartCooldown) return;

  stopPlayerTimer();
  startGame(T3.Difficulty);

  // 3초 쿨다운 시작
  startRestartCooldown();
}

// 재시작버튼 쿨다운 타이머
function startRestartCooldown() {
  const restartBtn = document.getElementById("restart-btn");
  if (!restartBtn) return;

  restartCooldown = true;
  restartBtn.disabled = true;
  let timeLeft = 3;

  restartBtn.textContent = `WAIT ${timeLeft}s`;
  restartBtn.classList.add("cooldown");

  const cooldownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      restartBtn.textContent = `WAIT ${timeLeft}s`;
    } else {
      clearInterval(cooldownInterval);
      restartBtn.textContent = "RESTART";
      restartBtn.disabled = false;
      restartBtn.classList.remove("cooldown");
      restartCooldown = false;
    }
  }, 1000);
}

// 메뉴로 돌아가기
function goToMenu() {
  stopPlayerTimer();
  T3.Start = false;
  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}
