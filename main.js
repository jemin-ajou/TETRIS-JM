let p1Game = null;
let p2Game = null;
let aiEngine = null;
let isAiMode = false;
let currentDifficulty = 'medium';

// Touch device detection
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (isTouchDevice) {
    document.body.classList.add('has-touch');
}

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

// Sensitivity Configuration
const SENSITIVITY_CONFIG = {
    high: { das: 100, arr: 25 },
    medium: { das: 150, arr: 45 },
    low: { das: 200, arr: 80 }
};

let currentSensitivity = localStorage.getItem('tetris_sensitivity') || 'medium';
let currentSkin = localStorage.getItem('tetris_skin') || 'neon';
let currentGameMode = 'standard';

// Initial Rank Reset
if (!localStorage.getItem('tetris_ranked_reset_completed')) {
    localStorage.removeItem('tetris_rankings');
    localStorage.removeItem('tetris_scores');
    localStorage.setItem('tetris_ranked_reset_completed', 'true');
}

const keysPressed = new Set();
const keyTimers = {};
const keyRepeatIntervals = {};

// Optimized Scaling Logic
function handleResize() {
    const isMobile = window.innerWidth < 600;
    
    if (isMobile) {
        if (app) {
            app.style.transform = 'none'; 
            app.style.marginTop = '0';
        }
        return;
    }

    if (!app) return;

    // Set base dimensions for scaling
    const baseWidth = isAiMode ? 1150 : 560; 
    const baseHeight = 1000; 
    const padding = 20;
    
    const scaleX = (window.innerWidth - padding) / baseWidth;
    const scaleY = (window.innerHeight - padding) / baseHeight;
    const scale = Math.min(2.5, Math.min(scaleX, scaleY)); 
    
    app.style.transformOrigin = 'top center'; 
    app.style.transform = `scale(${scale})`;
    
    // Vertical centering
    const scaledHeight = baseHeight * scale;
    const marginTop = Math.max(0, (window.innerHeight - scaledHeight) / 2);
    app.style.marginTop = `${marginTop}px`;
}

window.addEventListener('resize', handleResize);

// Navigation & Tiers
const menuMainTier = document.getElementById('menu-main-tier');
const menuSingleTier = document.getElementById('menu-single-tier');
const menuAiTier = document.getElementById('menu-ai-tier');

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

const manualOverlay = document.getElementById('manual-overlay');
document.getElementById('btn-nav-manual').addEventListener('click', () => {
    manualOverlay.classList.remove('hidden');
});
document.getElementById('btn-manual-close').addEventListener('click', () => {
    manualOverlay.classList.add('hidden');
});

function showRankingModal(mode = 'standard') {
    rankingOverlay.classList.remove('hidden');
    rankingOverlay.style.display = 'flex';
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
document.getElementById('btn-name-home').addEventListener('click', () => {
    nameInputOverlay.classList.add('hidden');
    goHome();
});
document.getElementById('btn-name-restart').addEventListener('click', () => {
    nameInputOverlay.classList.add('hidden');
    restartGame();
});

// Ghost Toggles
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

// In-game Skin Select Box
const inGameSkinSelects = document.querySelectorAll('.in-game-skin-select');
inGameSkinSelects.forEach(select => {
    select.addEventListener('change', () => {
        audioManager.init();
        changeSkin(select.value);
    });
});

// Sound Toggles
const sfxToggleBtns = document.querySelectorAll('.sfx-toggle-btn');

function updateSoundUI() {
    const sfxMuted = audioManager.sfxMuted;
    sfxToggleBtns.forEach(btn => {
        btn.classList.toggle('muted', sfxMuted);
        btn.innerText = sfxMuted ? 'SOUND: OFF' : 'SOUND: ON';
    });
}

sfxToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        audioManager.init();
        audioManager.toggleSFX();
        updateSoundUI();
    });
});

// Sensitivity Logic
const inputSpeedSelects = document.querySelectorAll('.input-speed-select');
inputSpeedSelects.forEach(select => {
    select.value = currentSensitivity;
    select.addEventListener('change', () => {
        currentSensitivity = select.value;
        localStorage.setItem('tetris_sensitivity', currentSensitivity);
        inputSpeedSelects.forEach(s => s.value = currentSensitivity);
    });
});

const skinBtns = document.querySelectorAll('.skin-btn');
skinBtns.forEach(btn => {
    if (btn.dataset.skin === currentSkin) btn.classList.add('active');
    else btn.classList.remove('active');
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skin = btn.dataset.skin;
        changeSkin(skin);
    });
});

function changeSkin(skin) {
    currentSkin = skin;
    localStorage.setItem('tetris_skin', skin);
    document.body.classList.remove('skin-neon', 'skin-classic', 'skin-dark', 'skin-light');
    document.body.classList.add(`skin-${skin}`);
    
    const skinSelect = document.getElementById('skin-select');
    if (skinSelect) skinSelect.value = skin;
    
    if (p1Game) p1Game.skin = skin;
    if (p2Game) p2Game.skin = skin;
}

function cycleSkin() {
    const skins = ['neon', 'classic', 'dark', 'light'];
    const currentIndex = skins.indexOf(currentSkin);
    const nextIndex = (currentIndex + 1) % skins.length;
    changeSkin(skins[nextIndex]);
}

function cycleSensitivity() {
    const levels = ['low', 'medium', 'high'];
    const currentIndex = levels.indexOf(currentSensitivity);
    const nextIndex = (currentIndex + 1) % levels.length;
    currentSensitivity = levels[nextIndex];
    localStorage.setItem('tetris_sensitivity', currentSensitivity);
    inputSpeedSelects.forEach(s => s.value = currentSensitivity);
}

// Initial Skin Setup
changeSkin(currentSkin);

const skinSelect = document.getElementById('skin-select');
if (skinSelect) {
    skinSelect.value = currentSkin;
    skinSelect.addEventListener('change', () => {
        audioManager.init();
        changeSkin(skinSelect.value);
    });
}

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
        btn.innerText = isPaused ? 'RESUME' : 'PAUSE';
    });
}

updateSoundUI();

// Event Delegation for Mode and Difficulty Cards
document.addEventListener('click', (e) => {
    const modeCard = e.target.closest('.mode-card');
    const diffCard = e.target.closest('.diff-card');

    if (modeCard) {
        const mode = modeCard.dataset.mode;
        if (mode) {
            try { audioManager.init(); } catch (err) {}
            startMode(mode);
        }
        return;
    }

    if (diffCard) {
        const level = diffCard.dataset.level;
        if (level) {
            try { audioManager.init(); } catch (err) {}
            currentDifficulty = level;
            menuAiTier.classList.add('hidden');
            startMode('ai');
        }
        return;
    }
});

function startMode(mode) {
    if (!mode) return;
    
    if (mainMenu) mainMenu.classList.add('hidden');
    if (gameContainer) gameContainer.classList.remove('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if (menuSingleTier) menuSingleTier.classList.add('hidden');
    if (menuMainTier) menuMainTier.classList.remove('hidden');

    currentGameMode = mode;
    isAiMode = (mode === 'ai');

    try {
        if (isAiMode) {
            if (p2Area) p2Area.classList.remove('hidden');
            if (p1ModeInfoBox) p1ModeInfoBox.classList.add('hidden');
            if (p1ExtraInfoBox) p1ExtraInfoBox.classList.add('hidden');
            if (p1TimerBox) p1TimerBox.classList.add('hidden');
            gameContainer.classList.remove('single-active');
            initAiMode();
        } else {
            if (p2Area) p2Area.classList.add('hidden');
            gameContainer.classList.add('single-active');

            const showInfo = {
                sprint: { label: 'LINES LEFT', extra: false, timer: true },
                timeattack: { label: '', extra: false, timer: true },
                rising: { label: 'CLEARED', extra: true, timer: false },
                standard: { label: '', extra: false, timer: false },
                random: { label: '', extra: false, timer: false },
                penta: { label: '', extra: false, timer: false }
            };

            const config = showInfo[mode] || showInfo.standard;
            if (p1ModeInfoBox) {
                p1ModeInfoBox.classList.toggle('hidden', !config.label);
                if (config.label && p1ModeInfoLabel) p1ModeInfoLabel.innerText = config.label;
            }
            if (p1ExtraInfoBox) {
                p1ExtraInfoBox.classList.toggle('hidden', !config.extra);
                if (config.extra && p1ExtraInfoLabel) p1ExtraInfoLabel.innerText = 'ADDED';
            }
            if (p1TimerBox) p1TimerBox.classList.toggle('hidden', !config.timer);

            initSingleMode(mode);
        }
        
        syncCanvasResolution();
        handleResize();
    } catch (err) {
        console.error('Failed to start mode:', err);
        if (mainMenu) mainMenu.classList.remove('hidden');
    }
}

function syncCanvasResolution() {
    const isMobile = window.innerWidth < 600;
    const canvases = [
        { id: 'p1-next', w: 100, h: 320 },
        { id: 'p2-next', w: 100, h: 320 },
        { id: 'p1-hold', w: 100, h: 120 },
        { id: 'p2-hold', w: 100, h: 120 }
    ];

    canvases.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) {
            const isSide = ['p1-hold', 'p2-hold', 'p1-next', 'p2-next'].includes(c.id);
            el.width = (isMobile && !isSide) ? c.w / 2 : c.w;
            el.height = (isMobile && !isSide) ? c.h / 2 : c.h;
        }
    });
}

function initSingleMode(mode) {
    if (p1Game) p1Game.gameOver = true;
    
    p1Game = new Tetris(
        document.getElementById('p1-board'),
        document.getElementById('p1-next'),
        document.getElementById('p1-hold'),
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

    p1Game = new Tetris(
        document.getElementById('p1-board'),
        document.getElementById('p1-next'),
        document.getElementById('p1-hold'),
        document.getElementById('p1-score'),
        document.getElementById('p1-level'),
        () => handleGameOver('AI WINS!'),
        (lines) => {
            if (lines >= 2 && p2Game) p2Game.addGarbage(lines - 1);
        }
    );
    p1Game.mode = 'ai';
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

    p2Game = new Tetris(
        document.getElementById('p2-board'),
        document.getElementById('p2-next'),
        document.getElementById('p2-hold'),
        document.getElementById('p2-score'),
        document.getElementById('p2-level'),
        () => handleGameOver('PLAYER 1 WINS!'),
        (lines) => {
            if (lines >= 2 && p1Game) p1Game.addGarbage(lines - 1);
        }
    );
    p2Game.mode = 'ai';
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

function checkRankingRecord(score, mode) {
    if (score < 0) return false;
    const allRanks = getRankings();
    const modeRanks = allRanks.filter(r => r.mode === mode);
    
    if (mode === 'sprint') {
        const time = parseFloat(p1Game.timeTaken) || 999.99;
        modeRanks.sort((a, b) => a.time - b.time);
        return modeRanks.length < 10 || time < (modeRanks[modeRanks.length - 1].time || 999);
    } else {
        modeRanks.sort((a, b) => b.score - a.score);
        return modeRanks.length < 10 || score > (modeRanks[modeRanks.length - 1].score || 0);
    }
}

function getRankings() {
    let data = localStorage.getItem('tetris_rankings');
    let ranks = data ? JSON.parse(data) : [];
    
    const oldData = localStorage.getItem('tetris_scores');
    if (oldData) {
        try {
            const oldRanks = JSON.parse(oldData);
            if (Array.isArray(oldRanks)) {
                oldRanks.forEach(r => {
                    if (!r.mode) r.mode = 'standard';
                    ranks.push(r);
                });
            }
            localStorage.removeItem('tetris_scores');
        } catch (e) {
            console.error("Failed to migrate old rankings");
        }
    }
    
    ranks.forEach(r => { if (!r.mode) r.mode = 'standard'; });
    return ranks;
}

function saveRankAndGoHome() {
    const name = playerNameInput.value.trim() || 'NONAME';
    const score = p1Game.score;
    const mode = p1Game.mode || currentGameMode || 'standard';
    let allRanks = getRankings();
    
    const record = { 
        name, 
        level: p1Game.level || 1,
        mode, 
        date: new Date().toLocaleDateString() 
    };
    
    if (mode === 'sprint') {
        record.time = parseFloat(p1Game.timeTaken) || 0;
        record.score = p1Game.score;
    } else {
        record.score = p1Game.score;
    }
    
    allRanks.push(record);
    
    const modes = ['standard', 'sprint', 'random', 'rising', 'timeattack', 'penta'];
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
    const filteredRanks = allRanks.filter(r => r.mode === mode);
    
    if (filteredRanks.length === 0) {
        container.innerHTML = `<div class="empty-msg">No ${mode.toUpperCase()} records yet!</div>`;
        return;
    }

    const header = document.createElement('div');
    header.className = 'rank-item rank-header';
    header.innerHTML = `
        <span class="rank-pos">#</span>
        <span class="rank-name">NAME</span>
        <span class="rank-level">LEVEL</span>
        <span class="rank-score">SCORE</span>
        ${mode === 'sprint' ? '<span class="rank-time">TIME</span>' : ''}
        <span class="rank-date">DATE</span>
    `;
    container.appendChild(header);

    if (mode === 'sprint') {
        filteredRanks.sort((a, b) => (a.time || 999) - (b.time || 999));
    } else {
        filteredRanks.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    filteredRanks.slice(0, 10).forEach((data, index) => {
        const item = document.createElement('div');
        item.className = 'rank-item';
        
        const scoreVal = (data.score || 0).toLocaleString();
        const levelVal = "LV." + (data.level || 1);
        
        let timeHTML = "";
        if (mode === 'sprint') {
            const t = parseFloat(data.time) || 0;
            timeHTML = `<span class="rank-time">${t.toFixed(2)}s</span>`;
        }

        item.innerHTML = `
            <span class="rank-pos">${index + 1}</span>
            <span class="rank-name">${data.name}</span>
            <span class="rank-level">${levelVal}</span>
            <span class="rank-score">${scoreVal}</span>
            ${timeHTML}
            <span class="rank-date">${data.date}</span>
        `;
        container.appendChild(item);
    });
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

function handleAction(key) {
    if (!p1Game || p1Game.gameOver || p1Game.paused) return;

    switch (key) {
        case P1_KEYS.LEFT: p1Game.move(-1); break;
        case P1_KEYS.RIGHT: p1Game.move(1); break;
        case P1_KEYS.DOWN: p1Game.drop(); break;
        case P1_KEYS.UP: p1Game.rotate(1); break;
        case P1_KEYS.HARD_DROP: p1Game.hardDrop(); break;
    }

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
    if (document.activeElement.tagName === 'INPUT') return;

    const key = event.key;
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'm') { audioManager.init(); audioManager.toggleSFX(); updateSoundUI(); return; }
    if (lowerKey === 'g') { toggleGhost(p1Game, p1GhostBtn); return; }
    if (lowerKey === 'k') { cycleSkin(); return; }
    if (lowerKey === 'v') { cycleSensitivity(); return; }
    
    const isGameOver = !gameOverOverlay.classList.contains('hidden') || !nameInputOverlay.classList.contains('hidden');
    if (isGameOver && lowerKey === 'r') {
        gameOverOverlay.classList.add('hidden');
        nameInputOverlay.classList.add('hidden');
        restartGame();
        return;
    }

    const isP1Key = Object.values(P1_KEYS).includes(key);
    const isP2Key = Object.values(P2_KEYS).includes(key);

    if (isP1Key || isP2Key) {
        event.preventDefault();
        if (key === P1_KEYS.HOLD) { if (p1Game) p1Game.hold(); return; }
        if (key === P2_KEYS.HOLD && !isAiMode) { if (p2Game) p2Game.hold(); return; }
        if (keysPressed.has(key)) return;

        handleAction(key);
        keysPressed.add(key);

        const config = SENSITIVITY_CONFIG[currentSensitivity];
        keyTimers[key] = setTimeout(() => {
            if (keysPressed.has(key)) {
                keyRepeatIntervals[key] = setInterval(() => handleAction(key), config.arr);
            }
        }, config.das);
    }
});

function updateRealTimeUI() {
    if (p1Game && !p1Game.gameOver && !p1Game.paused) {
        if (p1Game.mode === 'sprint' || p1Game.mode === 'timeattack') {
            let currentTime;
            if (p1Game.mode === 'timeattack') {
                currentTime = Math.max(0, 120 - (Date.now() - p1Game.startTime) / 1000).toFixed(2);
            } else {
                currentTime = ((Date.now() - p1Game.startTime) / 1000).toFixed(2);
            }
            if (p1TimerValue) p1TimerValue.innerText = currentTime;
        }
    }
    requestAnimationFrame(updateRealTimeUI);
}
updateRealTimeUI();

function setupTouchControls() {
    const touchMappings = {
        'touch-left': P1_KEYS.LEFT,
        'touch-right': P1_KEYS.RIGHT,
        'touch-down': P1_KEYS.DOWN,
        'touch-rotate': P1_KEYS.UP,
        'touch-hard-drop': P1_KEYS.HARD_DROP
    };

    const touchTimers = {};
    const touchIntervals = {};

    Object.entries(touchMappings).forEach(([id, key]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleAction(key);
                if (key === P1_KEYS.LEFT || key === P1_KEYS.RIGHT || key === P1_KEYS.DOWN) {
                    const config = SENSITIVITY_CONFIG[currentSensitivity];
                    touchTimers[id] = setTimeout(() => {
                        touchIntervals[id] = setInterval(() => handleAction(key), config.arr);
                    }, config.das);
                }
            }, { passive: false });

            const stopTouch = () => {
                if (touchTimers[id]) { clearTimeout(touchTimers[id]); delete touchTimers[id]; }
                if (touchIntervals[id]) { clearInterval(touchIntervals[id]); delete touchIntervals[id]; }
            };
            btn.addEventListener('touchend', stopTouch);
            btn.addEventListener('touchcancel', stopTouch);
        }
    });
}
setupTouchControls();

window.addEventListener('keyup', event => {
    keysPressed.delete(event.key);
    if (keyTimers[event.key]) { clearTimeout(keyTimers[event.key]); delete keyTimers[event.key]; }
    if (keyRepeatIntervals[event.key]) { clearInterval(keyRepeatIntervals[event.key]); delete keyRepeatIntervals[event.key]; }
});
