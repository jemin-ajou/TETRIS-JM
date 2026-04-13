let p1Game = null;
let p2Game = null;
let aiEngine = null;
let isAiMode = false;
let currentDifficulty = 'medium';

const mainMenu = document.getElementById('main-menu');
const gameContainer = document.getElementById('game-container');
const gameOverOverlay = document.getElementById('game-over');
const p1ModeInfoBox = document.getElementById('p1-mode-info-box');
const p1ModeInfoLabel = document.getElementById('p1-mode-info-label');
const p1ModeInfoValue = document.getElementById('p1-mode-info-value');
const p1ExtraInfoBox = document.getElementById('p1-extra-info-box');
const p1ExtraInfoLabel = document.getElementById('p1-extra-info-label');
const p1ExtraInfoValue = document.getElementById('p1-extra-info-value');
const p1TimerBox = document.getElementById('p1-timer-box');
const p1TimerValue = document.getElementById('p1-timer-value');
const app = document.getElementById('app');
const p2Area = document.getElementById('player2-area');
const p2Instr = document.getElementById('p2-instr');
const winnerText = document.getElementById('winner-text');
const rankingOverlay = document.getElementById('ranking-overlay');
const rankListContent = document.getElementById('rank-list-content');
const nameInputOverlay = document.getElementById('name-input-overlay');
const playerNameInput = document.getElementById('player-name-input');
// const app = document.getElementById('app'); // 제거: HTML에 없음

// Sensitivity Configuration
const SENSITIVITY_CONFIG = {
    high: { das: 120, arr: 30 },
    medium: { das: 180, arr: 60 },
    low: { das: 250, arr: 100 }
};

let currentSensitivity = localStorage.getItem('tetris_sensitivity') || 'medium';
let currentSkin = localStorage.getItem('tetris_skin') || 'neon';
let currentGameMode = 'standard';

const keysPressed = new Set();
const keyTimers = {};
const keyRepeatIntervals = {};

// Dynamic Scaling Logic
// Dynamic Scaling Logic
function handleResize() {
    const isMobile = window.innerWidth < 600;
    const baseWidth = isAiMode ? 1400 : (isMobile ? 450 : 850);
    const baseHeight = isMobile ? 950 : 1050; // Reduced base height for mobile
    const padding = 20;
    
    const scaleX = (window.innerWidth - padding) / baseWidth;
    const scaleY = (window.innerHeight - padding) / baseHeight;
    const scale = Math.min(isMobile ? 1.0 : 1.5, Math.min(scaleX, scaleY));
    
    app.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', handleResize);

// Navigation & Tiers
const menuMainTier = document.getElementById('menu-main-tier');
const menuSingleTier = document.getElementById('menu-single-tier');
const menuAiTier = document.getElementById('menu-ai-tier');

// document.getElementById('btn-nav-single') listener...

document.getElementById('btn-nav-single').addEventListener('click', () => {
    menuMainTier.classList.add('hidden');
    menuSingleTier.classList.remove('hidden');
});

document.getElementById('btn-nav-ai').addEventListener('click', () => {
    menuMainTier.classList.add('hidden');
    menuAiTier.classList.remove('hidden');
});

document.getElementById('btn-nav-rank').addEventListener('click', () => {
    audioManager.init();
    showRankingModal(currentGameMode);
});

// Back Buttons
document.getElementById('btn-back-single').addEventListener('click', () => {
    menuSingleTier.classList.add('hidden');
    menuMainTier.classList.remove('hidden');
});

document.getElementById('btn-back-ai').addEventListener('click', () => {
    menuAiTier.classList.add('hidden');
    menuMainTier.classList.remove('hidden');
});

document.getElementById('btn-rank-close').addEventListener('click', () => {
    rankingOverlay.classList.add('hidden');
});

function showRankingModal(mode = 'standard') {
    rankingOverlay.classList.remove('hidden');
    rankingOverlay.style.display = 'flex'; // Ensure flex is applied
    // Update tabs UI
    document.querySelectorAll('.rank-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    renderRankings(rankListContent, mode);
}

// Ranking Tab Listeners
document.querySelectorAll('.rank-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        showRankingModal(mode);
    });
});

document.getElementById('btn-save-score').addEventListener('click', saveRankAndGoHome);
document.getElementById('btn-restart').addEventListener('click', restartGame);
document.getElementById('btn-home').addEventListener('click', goHome);

// Ghost Toggles (Buttons Restored)
const p1GhostBtn = document.getElementById('p1-ghost-toggle');
const p2GhostBtn = document.getElementById('p2-ghost-toggle');

p1GhostBtn.addEventListener('click', () => toggleGhost(p1Game, p1GhostBtn));
p2GhostBtn.addEventListener('click', () => toggleGhost(p2Game, p2GhostBtn));

function toggleGhost(game, btn) {
    if (!game) return;
    game.showGhost = !game.showGhost;
    btn.classList.toggle('active', game.showGhost);
    btn.innerText = `GHOST: ${game.showGhost ? 'ON' : 'OFF'}`;
}

// In-game Skin Select Box (Sync multiple instances)
const inGameSkinSelects = document.querySelectorAll('.in-game-skin-select');
inGameSkinSelects.forEach(select => {
    select.addEventListener('change', () => {
        audioManager.init();
        changeSkin(select.value);
    });
});

// Sound Toggles (Sync multiple instances)
const sfxToggleBtns = document.querySelectorAll('.sfx-toggle-btn');

function updateSoundUI() {
    const sfxMuted = audioManager.sfxMuted;
    
    sfxToggleBtns.forEach(btn => {
        btn.classList.toggle('muted', sfxMuted);
        btn.innerText = sfxMuted ? '🔇' : '🔊';
    });
}

sfxToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        audioManager.init();
        audioManager.toggleSFX();
        updateSoundUI();
    });
});

// Global & In-game Sensitivity Logic
const inputSpeedSelects = document.querySelectorAll('.input-speed-select');
inputSpeedSelects.forEach(select => {
    select.value = currentSensitivity;
    select.addEventListener('change', () => {
        currentSensitivity = select.value;
        localStorage.setItem('tetris_sensitivity', currentSensitivity);
        // Sync ALL instances of sensitivity select
        inputSpeedSelects.forEach(s => s.value = currentSensitivity);
    });
});

const skinBtns = document.querySelectorAll('.skin-btn');
skinBtns.forEach(btn => {
    if (btn.dataset.skin === currentSkin) btn.classList.add('active');
    else btn.classList.remove('active');
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering mode card if accidentally overlapping
        const skin = btn.dataset.skin;
        changeSkin(skin);
    });
});

function changeSkin(skin) {
    currentSkin = skin;
    localStorage.setItem('tetris_skin', skin);
    document.body.classList.remove('skin-neon', 'skin-classic', 'skin-dark', 'skin-light');
    document.body.classList.add(`skin-${skin}`);
    
    // Sync Select Box
    const skinSelect = document.getElementById('skin-select');
    if (skinSelect) skinSelect.value = skin;
    
    if (p1Game) p1Game.skin = skin;
    if (p2Game) p2Game.skin = skin;
    document.querySelectorAll('.in-game-skin-select').forEach(select => select.value = skin);
}

// Initial Listener Setup for Select Boxes
const skinSelect = document.getElementById('skin-select');
if (skinSelect) {
    skinSelect.value = currentSkin;
    skinSelect.addEventListener('change', () => {
        audioManager.init();
        changeSkin(skinSelect.value);
    });
}

// Sync in-game selects
document.querySelectorAll('.in-game-skin-select').forEach(select => {
    select.addEventListener('change', () => changeSkin(select.value));
});

// Pause Logic
const pauseToggleBtns = document.querySelectorAll('.pause-toggle-btn');
pauseToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        audioManager.init();
        toggleAllPause();
    });
});

function toggleAllPause() {
    const isPaused = p1Game ? !p1Game.paused : false;
    
    if (p1Game) p1Game.togglePause();
    if (p2Game) p2Game.togglePause();

    pauseToggleBtns.forEach(btn => {
        btn.classList.toggle('active', isPaused);
        btn.innerText = isPaused ? '▶️' : '⏸️';
    });
}

// Initial UI sync
updateSoundUI();
changeSkin(currentSkin); // Apply saved skin

// AI Difficulty Selection (In-Tier Cards)
document.querySelectorAll('.diff-card').forEach(card => {
    card.addEventListener('click', () => {
        audioManager.init();
        const level = card.dataset.level;
        currentDifficulty = level;
        menuAiTier.classList.add('hidden');
        startMode('ai');
    });
});

// Mode Card Selection (within Single Tier)
const modeCards = document.querySelectorAll('.mode-card');
modeCards.forEach(card => {
    card.addEventListener('click', () => {
        audioManager.init();
        const mode = card.dataset.mode;
        startMode(mode);
    });
});

function showDifficultySelector() {
    menuAiTier.classList.remove('hidden');
}

function hideDifficultySelector() {
    menuAiTier.classList.add('hidden');
}

function startMode(mode) {
    currentGameMode = mode;
    isAiMode = (mode === 'ai');
    mainMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameOverOverlay.classList.add('hidden');
    
    // Reset menu tiers for next time
    menuSingleTier.classList.add('hidden');
    menuMainTier.classList.remove('hidden');

    if (isAiMode) {
        p2Area.classList.remove('hidden');
        p1ModeInfoBox.classList.add('hidden');
        p1ExtraInfoBox.classList.add('hidden');
        initAiMode();
    } else {
        p2Area.classList.add('hidden');
        
        // Show/Hide mode info boxes based on mode
        if (mode === 'sprint') {
            p1ModeInfoBox.classList.remove('hidden');
            p1ModeInfoLabel.innerText = 'LINES LEFT';
            p1ExtraInfoBox.classList.add('hidden');
            p1TimerBox.classList.remove('hidden');
        } else if (mode === 'rising') {
            p1ModeInfoBox.classList.remove('hidden');
            p1ModeInfoLabel.innerText = 'CLEARED';
            p1ExtraInfoBox.classList.remove('hidden');
            p1ExtraInfoLabel.innerText = 'ADDED';
            p1TimerBox.classList.add('hidden');
        } else {
            p1ModeInfoBox.classList.add('hidden');
            p1ExtraInfoBox.classList.add('hidden');
            p1TimerBox.classList.add('hidden');
        }
        
        initSingleMode(mode);
    }
    
    handleResize();
}

function initSingleMode(mode) {
    if (p1Game) p1Game.gameOver = true;
    
    p1Game = new Tetris(
        document.getElementById('p1-board'),
        document.getElementById('p1-next'),
        document.getElementById('p1-score'),
        document.getElementById('p1-level'),
        () => handleGameOver('GAME OVER'),
        null
    );
    
    p1Game.mode = mode;
    p1Game.skin = currentSkin;
    p1Game.showGhost = document.getElementById('p1-ghost-toggle').classList.contains('active');
    p1Game.comboElement = document.getElementById('p1-combo');
    
    const originalUpdateScore = p1Game.updateScore.bind(p1Game);
    p1Game.updateScore = () => {
        originalUpdateScore();
        if (p1Game.comboElement) {
            p1Game.comboElement.innerText = p1Game.combo;
            if (p1Game.combo > 0) {
                p1Game.comboElement.classList.remove('combo-pop');
                void p1Game.comboElement.offsetWidth;
                p1Game.comboElement.classList.add('combo-pop');
            }
        }
        
        // Mode specific UI updates (triggered on score change)
        if (p1Game.mode === 'sprint') {
            p1ModeInfoValue.innerText = Math.max(0, 40 - p1Game.totalLinesCleared);
        } else if (p1Game.mode === 'rising') {
            p1ModeInfoValue.innerText = p1Game.totalLinesCleared;
            p1ExtraInfoValue.innerText = p1Game.totalGarbageAdded;
        }
    };

    p1Game.update();
}

function initAiMode() {
    const skin = currentSkin;

    // Player 1
    p1Game = new Tetris(
        document.getElementById('p1-board'),
        document.getElementById('p1-next'),
        document.getElementById('p1-score'),
        document.getElementById('p1-level'),
        () => handleGameOver('AI WINS!'),
        (lines) => {
            if (lines >= 2 && p2Game) p2Game.addGarbage(lines - 1);
        }
    );
    p1Game.skin = skin;
    p1Game.showGhost = p1GhostBtn.classList.contains('active');
    p1Game.comboElement = document.getElementById('p1-combo');
    const originalUpdateScore1 = p1Game.updateScore.bind(p1Game);
    p1Game.updateScore = () => {
        originalUpdateScore1();
        if (p1Game.comboElement) {
            p1Game.comboElement.innerText = p1Game.combo;
            if (p1Game.combo > 0) {
                p1Game.comboElement.classList.remove('combo-pop');
                void p1Game.comboElement.offsetWidth;
                p1Game.comboElement.classList.add('combo-pop');
            }
        }
    };

    // AI (Player 2)
    p2Game = new Tetris(
        document.getElementById('p2-board'),
        document.getElementById('p2-next'),
        document.getElementById('p2-score'),
        document.getElementById('p2-level'),
        () => handleGameOver('PLAYER 1 WINS!'),
        (lines) => {
            if (lines >= 2 && p1Game) p1Game.addGarbage(lines - 1);
        }
    );
    p2Game.skin = skin;
    p2Game.showGhost = p2GhostBtn.classList.contains('active');
    p2Game.comboElement = document.getElementById('p2-combo');
    const originalUpdateScore2 = p2Game.updateScore.bind(p2Game);
    p2Game.updateScore = () => {
        originalUpdateScore2();
        if (p2Game.comboElement) {
            p2Game.comboElement.innerText = p2Game.combo;
            if (p2Game.combo > 0) {
                p2Game.comboElement.classList.remove('combo-pop');
                void p2Game.comboElement.offsetWidth;
                p2Game.comboElement.classList.add('combo-pop');
            }
        }
    };

    aiEngine = new TetrisAI(p2Game);
    aiEngine.setDifficulty(currentDifficulty);

    p1Game.update();
    p2Game.update();
    
    // Inject AI into the loop
    const originalUpdate = p2Game.update.bind(p2Game);
    p2Game.update = (time) => {
        aiEngine.update(time);
        originalUpdate(time);
    };
}

function handleGameOver(winner) {
    winnerText.innerText = winner;
    const finalVal = document.getElementById('final-val');
    const finalMsg = document.getElementById('final-msg');
    
    if (isAiMode) {
        finalMsg.style.display = 'none';
        gameOverOverlay.classList.remove('hidden');
    } else {
        finalMsg.style.display = 'block';
        finalVal.innerText = p1Game.score;
        
        // 랭킹 등록 가능 여부 확인 (점수와 모드 전달)
        if (checkRankingRecord(p1Game.score, p1Game.mode)) {
            setTimeout(() => {
                nameInputOverlay.classList.remove('hidden');
            }, 1000);
        } else {
            gameOverOverlay.classList.remove('hidden');
        }
    }

    if (p1Game) p1Game.gameOver = true;
    if (p2Game) p2Game.gameOver = true;
}

// Ranking Logic
function checkRankingRecord(score, mode) {
    if (score < 0) return false;
    const allRanks = getRankings();
    const modeRanks = allRanks.filter(r => r.mode === mode);
    
    if (mode === 'sprint') {
        const time = parseFloat(p1Game.timeTaken) || 999.99;
        modeRanks.sort((a, b) => a.time - b.time); // 시간은 낮을수록 좋음
        return modeRanks.length < 10 || time < modeRanks[modeRanks.length - 1].time;
    } else {
        modeRanks.sort((a, b) => b.score - a.score); // 점수는 높을수록 좋음
        return modeRanks.length < 10 || score > (modeRanks[modeRanks.length - 1].score || 0);
    }
}

function getRankings() {
    let data = localStorage.getItem('tetris_rankings');
    let ranks = data ? JSON.parse(data) : [];
    
    // 구버전 데이터(tetris_scores)가 있다면 마이그레이션 시도
    const oldData = localStorage.getItem('tetris_scores');
    if (oldData) {
        try {
            const oldRanks = JSON.parse(oldData);
            if (Array.isArray(oldRanks)) {
                oldRanks.forEach(r => {
                    // 모드가 없으면 'standard'로 부여
                    if (!r.mode) r.mode = 'standard';
                    ranks.push(r);
                });
            }
            localStorage.removeItem('tetris_scores'); // 마이그레이션 후 삭제
        } catch (e) {
            console.error("Failed to migrate old rankings");
        }
    }
    
    // 데이터 보정: 모드가 없는 기록은 기본값 부여
    ranks.forEach(r => {
        if (!r.mode) r.mode = 'standard';
    });
    
    return ranks;
}

function saveRankAndGoHome() {
    const name = playerNameInput.value.trim() || 'NONAME';
    const score = p1Game.score;
    const mode = p1Game.mode || currentGameMode || 'standard'; // 다중 안전장치
    let allRanks = getRankings();
    
    // 신규 기록 추가
    const record = { 
        name, 
        mode, 
        date: new Date().toLocaleDateString() 
    };
    
    if (mode === 'sprint') {
        record.time = parseFloat(p1Game.timeTaken) || 0;
        record.score = p1Game.score; // 점수도 참고용으로 저장
    } else {
        record.score = p1Game.score;
    }
    
    allRanks.push(record);
    
    // 전체 기록 중 각 모드별로 상위 10개만 유지하도록 정리
    const modes = ['standard', 'sprint', 'random', 'rising'];
    let finalRanks = [];
    
    modes.forEach(m => {
        let modeRanks = allRanks.filter(r => r.mode === m);
        if (m === 'sprint') {
            modeRanks.sort((a, b) => (a.time || 999) - (b.time || 999));
        } else {
            modeRanks.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        finalRanks = finalRanks.concat(modeRanks.slice(0, 10));
    });
    
    localStorage.setItem('tetris_rankings', JSON.stringify(finalRanks));
    
    nameInputOverlay.classList.add('hidden');
    goHome();
}

function renderRankings(container, mode = 'standard') {
    const allRanks = getRankings();
    container.innerHTML = '';
    
    // 해당 모드의 기록만 필터링
    const filteredRanks = allRanks.filter(r => r.mode === mode);
    
    if (filteredRanks.length === 0) {
        container.innerHTML = `<div class="empty-msg">No ${mode.toUpperCase()} records yet!</div>`;
        return;
    }

    if (mode === 'sprint') {
        filteredRanks.sort((a, b) => (a.time || 999) - (b.time || 999));
    } else {
        filteredRanks.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    filteredRanks.slice(0, 10).forEach((data, index) => {
        const item = document.createElement('div');
        item.className = 'rank-item';
        let displayValue = "";
        if (mode === 'sprint') {
            const timeVal = parseFloat(data.time) || (data.score > 0 ? 0 : 999.99); 
            displayValue = timeVal.toFixed(2) + "s";
        } else {
            displayValue = (data.score || 0).toLocaleString();
        }
        
        item.innerHTML = `
            <span class="rank-pos">${index + 1}</span>
            <span class="rank-name">${data.name}</span>
            <span class="rank-score">${displayValue}</span>
            <span class="rank-date">${data.date}</span>
        `;
        container.appendChild(item);
    });
}

function hideRankings() {
    rankingOverlay.classList.add('hidden');
}

function restartGame() {
    startMode(currentGameMode);
}

function goHome() {
    mainMenu.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    if (p1Game) p1Game.gameOver = true;
    if (p2Game) p2Game.gameOver = true;
}

// Unified Input Management
function handleAction(key) {
    if (!p1Game || p1Game.gameOver || p1Game.paused) return;

    // Player 1 Actions
    switch (key) {
        case P1_KEYS.LEFT: p1Game.move(-1); break;
        case P1_KEYS.RIGHT: p1Game.move(1); break;
        case P1_KEYS.DOWN: p1Game.drop(); break;
        case P1_KEYS.UP: p1Game.rotate(1); break;
        case P1_KEYS.HARD_DROP: p1Game.hardDrop(); break;
    }

    // Player 2 Actions (Only if NOT AI)
    if (!isAiMode && p2Game && !p2Game.gameOver && !p2Game.paused) {
        switch (key) {
            case P2_KEYS.LEFT: p2Game.move(-1); break;
            case P2_KEYS.RIGHT: p2Game.move(1); break;
            case P2_KEYS.DOWN: p2Game.drop(); break;
            case P2_KEYS.UP: p2Game.rotate(1); break;
            case P2_KEYS.HARD_DROP: p2Game.hardDrop(); break;
        }
    }
}

window.addEventListener('keydown', event => {
    const gameKeys = [...Object.values(P1_KEYS), ...Object.values(P2_KEYS)];
    if (!gameKeys.includes(event.key)) return;
    
    event.preventDefault();
    if (keysPressed.has(event.key)) return; // Already handling this key

    // Initial Trigger
    handleAction(event.key);
    keysPressed.add(event.key);

    const config = SENSITIVITY_CONFIG[currentSensitivity];
    
    // Set DAS Timer
    keyTimers[event.key] = setTimeout(() => {
        if (keysPressed.has(event.key)) {
            // Start ARR Interval
            keyRepeatIntervals[event.key] = setInterval(() => {
                handleAction(event.key);
            }, config.arr);
        }
    }, config.das);
});

// Continuous UI Update Loop (for real-time timer)
function updateRealTimeUI() {
    if (p1Game && !p1Game.gameOver && !p1Game.paused) {
        if (p1Game.mode === 'sprint') {
            const currentTime = ((Date.now() - p1Game.startTime) / 1000).toFixed(2);
            if (p1TimerValue) p1TimerValue.innerText = currentTime;
        }
    }
    requestAnimationFrame(updateRealTimeUI);
}
updateRealTimeUI();

// Mobile Touch Controls
function setupTouchControls() {
    const touchMappings = {
        'touch-left': P1_KEYS.LEFT,
        'touch-right': P1_KEYS.RIGHT,
        'touch-down': P1_KEYS.DOWN,
        'touch-rotate': P1_KEYS.UP,
        'touch-hard-drop': P1_KEYS.HARD_DROP
    };

    Object.entries(touchMappings).forEach(([id, key]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleAction(key);
            });
        }
    });
}
setupTouchControls();

window.addEventListener('keyup', event => {
    keysPressed.delete(event.key);
    if (keyTimers[event.key]) {
        clearTimeout(keyTimers[event.key]);
        delete keyTimers[event.key];
    }
    if (keyRepeatIntervals[event.key]) {
        clearInterval(keyRepeatIntervals[event.key]);
        delete keyRepeatIntervals[event.key];
    }
});
