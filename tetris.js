class Tetris {
    constructor(boardCanvas, nextCanvas, scoreElement, levelElement, onGameOver, onLinesCleared) {
        this.boardCanvas = boardCanvas;
        this.nextCanvas = nextCanvas;
        this.ctx = boardCanvas.getContext('2d');
        this.nextCtx = nextCanvas.getContext('2d');
        this.scoreElement = scoreElement;
        this.levelElement = levelElement;
        this.onGameOver = onGameOver;
        this.onLinesCleared = onLinesCleared;

        // Visual Effects Properties
        this.particles = [];
        this.floatingTexts = [];
        this.shake = { x: 0, y: 0, duration: 0, intensity: 0 };
        this.lineFlash = []; // Array of line indices to flash
        this.mode = 'standard'; // 'standard', 'sprint', 'random', 'rising'
        this.startTime = Date.now();
        this.lastGarbageTime = Date.now();
        this.lastRandomShiftScore = 0;

        this.skin = 'neon';
        this.showGhost = true;
        this.combo = 0;
        this.totalLinesCleared = 0;
        this.totalGarbageAdded = 0;
        this.bag = [];
        this.reset();
    }

    // Effect: Add screen shake
    addShake(intensity, duration) {
        this.shake.duration = duration;
        this.shake.intensity = intensity;
    }

    // Effect: Create particles
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: color
            });
        }
    }

    // Effect: Add floating text
    addFloatingText(text, x, y, color, size = '30px') {
        this.floatingTexts.push({
            text: text,
            x: x,
            y: y,
            life: 1.0,
            color: color,
            size: size,
            vy: -2
        });
    }

    reset() {
        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = 0;
        this.dropInterval = 1000;
        this.gameOver = false;
        this.paused = false;
        this.nextQueue = [];
        for (let i = 0; i < 6; i++) { // Fill queue with 6 pieces
            this.nextQueue.push(this.get7BagPiece());
        }
        this.lastTime = 0;
        this.dropCounter = 0;
        this.startTime = Date.now();
        this.lastGarbageTime = Date.now();
        this.lastRandomShiftScore = 0;
        this.totalLinesCleared = 0;
        this.totalGarbageAdded = 0;

        this.updateScore();
        this.spawnPiece();
    }

    createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    get7BagPiece() {
        if (this.bag.length === 0) {
            this.bag = Object.keys(SHAPES);
            // Shuffle bag (Fisher-Yates)
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        
        const type = this.bag.pop();
        return {
            type,
            shape: JSON.parse(JSON.stringify(SHAPES[type]))
        };
    }

    spawnPiece() {
        const pieceData = this.nextQueue.shift();
        this.piece = {
            type: pieceData.type,
            shape: pieceData.shape,
            pos: { x: Math.floor(COLS / 2) - Math.floor(pieceData.shape[0].length / 2), y: 0 }
        };
        this.nextQueue.push(this.get7BagPiece());

        if (this.collide()) {
            this.gameOver = true;
            if (typeof audioManager !== 'undefined') audioManager.play('gameover');
            if (this.onGameOver) this.onGameOver();
        }

        this.drawNext();
    }

    rotate(dir = 1) { // Default to clockwise
        const pos = this.piece.pos.x;
        let offset = 1;
        this._rotateShape(this.piece.shape, dir);
        while (this.collide()) {
            this.piece.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.piece.shape[0].length) {
                this._rotateShape(this.piece.shape, -dir);
                this.piece.pos.x = pos;
                return;
            }
        }
        if (typeof audioManager !== 'undefined') audioManager.play('rotate');
    }

    _rotateShape(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        if (dir > 0) matrix.forEach(row => row.reverse());
        else matrix.reverse();
    }

    move(dir) {
        this.piece.pos.x += dir;
        if (this.collide()) {
            this.piece.pos.x -= dir;
        } else {
            if (typeof audioManager !== 'undefined') audioManager.play('move');
        }
    }

    togglePause() {
        this.paused = !this.paused;
        if (typeof audioManager !== 'undefined') {
            audioManager.play(this.paused ? 'pause' : 'resume');
        }
        if (!this.paused) {
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.update(time));
        }
    }

    drop() {
        if (this.gameOver || this.paused) return;
        this.piece.pos.y++;
        if (this.collide()) {
            this.piece.pos.y--;
            this.merge();
            if (typeof audioManager !== 'undefined') audioManager.play('land');
            this.addShake(2, 5);
            this.spawnPiece();
            this.clearLines();
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        if (this.gameOver || this.paused) return;
        while (!this.collide()) {
            this.piece.pos.y++;
        }
        this.piece.pos.y--;
        this.merge();
        if (typeof audioManager !== 'undefined') audioManager.play('harddrop');
        this.addShake(8, 10);
        this.spawnPiece();
        this.clearLines();
    }

    collide() {
        const [m, o] = [this.piece.shape, this.piece.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (this.board[y + o.y] === undefined ||
                        this.board[y + o.y][x + o.x] === undefined ||
                        this.board[y + o.y][x + o.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    merge() {
        this.piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.board[y + this.piece.pos.y][x + this.piece.pos.x] = this.piece.type;
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        outer: for (let y = ROWS - 1; y >= 0; --y) {
            for (let x = 0; x < COLS; ++x) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }
            // Create explosion particles for the cleared line
            for (let x = 0; x < COLS; x++) {
                const color = SKIN_CONFIGS[this.skin].colors[this.board[y][x]];
                for(let p=0; p<3; p++) this.createParticles(x * BLOCK_SIZE + BLOCK_SIZE/2, y * BLOCK_SIZE + BLOCK_SIZE/2, color);
            }
            
            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            ++y;
            linesCleared++;
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.totalLinesCleared += linesCleared;
            this.score += this.calculateScore(linesCleared);
            this.combo++;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.updateScore();
            
            // Visual Effects on Clear
            this.addShake(linesCleared * 4, 15);
            if (linesCleared === 4) {
                this.addFloatingText('TETRIS!', this.boardCanvas.width / 2, this.boardCanvas.height / 2, '#00f3ff', '50px');
            }
            if (this.combo > 1) {
                this.addFloatingText(`${this.combo} COMBO!`, this.boardCanvas.width / 2, this.boardCanvas.height / 2 + 60, '#ff0055', '40px');
            }

            if (typeof audioManager !== 'undefined') {
                if (linesCleared === 4) audioManager.play('tetris');
                else audioManager.play('clear');
                if (this.combo > 1) audioManager.play('combo', { combo: this.combo });
            }
            if (this.onLinesCleared) this.onLinesCleared(linesCleared);
        } else {
            this.combo = 0;
        }
    }

    calculateScore(lines) {
        let baseScore = 0;
        if (lines === 1) baseScore = SCORING.SINGLE;
        else if (lines === 2) baseScore = SCORING.DOUBLE;
        else if (lines === 3) baseScore = SCORING.TRIPLE;
        else if (lines === 4) baseScore = SCORING.TETRIS;
        
        const comboBonus = this.combo * SCORING.COMBO_BONUS;
        return baseScore + comboBonus;
    }

    addGarbage(count) {
        for (let i = 0; i < count; i++) {
            this.board.shift();
            const row = new Array(COLS).fill('G');
            const hole = Math.floor(Math.random() * COLS);
            row[hole] = 0;
            this.board.push(row);
            this.totalGarbageAdded++;
        }
        if (this.collide()) {
            this.piece.pos.y--;
            if (this.collide()) {
                this.gameOver = true;
                if (this.onGameOver) this.onGameOver('TOP OUT!');
            }
        }
    }

    randomizeField(count) {
        let added = 0;
        let attempts = 0;
        while (added < count && attempts < 100) {
            const y = Math.floor(Math.random() * (ROWS - 5)) + 5;
            const x = Math.floor(Math.random() * COLS);
            if (this.board[y][x] === 0) {
                this.board[y][x] = Object.keys(SHAPES)[Math.floor(Math.random() * 7)];
                added++;
            }
            attempts++;
        }
    }

    updateScore() {
        this.scoreElement.innerText = this.score.toString().padStart(6, '0');
        this.levelElement.innerText = this.level;
    }

    draw() {
        // Apply Shake
        if (this.shake.duration > 0) {
            const sx = (Math.random() - 0.5) * this.shake.intensity;
            const sy = (Math.random() - 0.5) * this.shake.intensity;
            this.ctx.save();
            this.ctx.translate(sx, sy);
        }

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);

        this.drawBoard();
        this.drawParticles();
        
        if (this.piece) {
            if (this.showGhost) {
                const ghostPos = this.getGhostPosition();
                this.drawGhost(this.ctx, ghostPos.x, ghostPos.y, this.piece.shape, this.piece.type);
            }
            this.drawPiece(this.ctx, this.piece.pos.x, this.piece.pos.y, this.piece.shape, this.piece.type);
        }
        
        this.drawFloatingTexts();

        // Draw PAUSED overlay
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);
            
            this.ctx.font = 'bold 40px "Orbitron"';
            this.ctx.fillStyle = '#ff0055';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff0055';
            
            // Subtle blink effect
            const alpha = 0.5 + Math.sin(Date.now() / 200) * 0.5;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillText('PAUSED', this.boardCanvas.width / 2, this.boardCanvas.height / 2);
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowBlur = 0;
        }

        if (this.shake.duration > 0) {
            this.ctx.restore();
            this.shake.duration--;
        }
    }

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(p.x, p.y, 4, 4);
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawFloatingTexts() {
        this.ctx.textAlign = 'center';
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= 0.015;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }
            this.ctx.font = `bold ${ft.size} "Rajdhani"`;
            this.ctx.fillStyle = ft.color;
            this.ctx.globalAlpha = ft.life;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            
            // Neon Glow influence
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = ft.color;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.shadowBlur = 0;
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawBoard() {
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(this.ctx, x, y, value);
                    // Create particles occasionally for aesthetic
                    if (Math.random() < 0.001) this.createParticles(x * BLOCK_SIZE + BLOCK_SIZE/2, y * BLOCK_SIZE + BLOCK_SIZE/2, SKIN_CONFIGS[this.skin].colors[value]);
                }
            });
        });

        // Grid lines with theme
        const gridColor = 'rgba(255, 255, 255, 0.1)';
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
            this.ctx.stroke();
        }
    }

    getGhostPosition() {
        const pos = { ...this.piece.pos };
        while (!this.collideAt(pos.x, pos.y + 1)) {
            pos.y++;
        }
        return pos;
    }

    collideAt(px, py) {
        const m = this.piece.shape;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (this.board[y + py] === undefined ||
                        this.board[y + py][x + px] === undefined ||
                        this.board[y + py][x + px] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    drawBlock(ctx, x, y, type, alpha = 1) {
        const config = SKIN_CONFIGS[this.skin] || SKIN_CONFIGS.neon;
        const color = config.colors[type];
        
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        
        if (config.glow && alpha > 0.5) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        // Block main body
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        
        // Border
        ctx.strokeStyle = config.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

        // Highlight for non-flat skins (subtle)
        if (this.skin === 'neon' || this.skin === 'classic') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, 2);
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 2, BLOCK_SIZE);
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    drawGhost(ctx, x, y, shape, type) {
        const config = SKIN_CONFIGS[this.skin] || SKIN_CONFIGS.neon;
        const color = config.colors[type];
        const alpha = config.ghostAlpha;

        shape.forEach((row, ry) => {
            row.forEach((value, rx) => {
                if (value !== 0) {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = alpha;
                    ctx.fillRect((x + rx) * BLOCK_SIZE, (y + ry) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = alpha * 2;
                    ctx.strokeRect((x + rx) * BLOCK_SIZE, (y + ry) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
        ctx.globalAlpha = 1;
    }

    drawPiece(ctx, x, y, shape, type) {
        shape.forEach((row, ry) => {
            row.forEach((value, rx) => {
                if (value !== 0) {
                    this.drawBlock(ctx, x + rx, y + ry, type);
                }
            });
        });
    }

    drawNext() {
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        const isHorizontal = this.nextCanvas.clientWidth > this.nextCanvas.clientHeight;
        const previewBlockSize = isHorizontal ? 12 : (this.nextCanvas.width * 0.18); 
        const spacing = isHorizontal ? 40 : (previewBlockSize * 2.2);
        
        this.nextQueue.forEach((pieceData, index) => {
            const scale = index === 0 ? 1 : 0.7; 
            const blockSize = previewBlockSize * 1.1 * scale;
            
            this.nextCtx.save();
            const matrix = pieceData.shape;
            const pieceWidth = matrix[0].length * blockSize;
            
            let startX, startY;
            if (isHorizontal) {
                startX = index * (this.nextCanvas.width / 4) + 10;
                startY = 10;
            } else {
                startX = (this.nextCanvas.width - pieceWidth) / 2;
                startY = (previewBlockSize * 1.2) + (index * spacing);
            }

            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const color = SKIN_CONFIGS[this.skin].colors[pieceData.type];
                        this.nextCtx.shadowBlur = 10;
                        this.nextCtx.shadowColor = color;
                        this.nextCtx.fillStyle = color;
                        this.nextCtx.fillRect(startX + x * blockSize, startY + y * blockSize, blockSize - 1, blockSize - 1);
                    }
                });
            });
            this.nextCtx.restore();
        });
    }

    update(time = 0) {
        if (this.paused || this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        // Mode Logic Updates
        this._handleModeLogic();

        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }

    _handleModeLogic() {
        const now = Date.now();

        // 1. Sprint Mode: Check 40 lines
        if (this.mode === 'sprint' && this.totalLinesCleared >= 40) {
            const now = Date.now();
            this.timeTaken = ((now - this.startTime) / 1000).toFixed(2);
            this.gameOver = true;
            if (this.onGameOver) this.onGameOver(`FINISH! ${this.timeTaken}s`);
            return;
        }

        // 2. Rising Garbage Mode: Add line every 10-15s based on level
        if (this.mode === 'rising') {
            const interval = Math.max(5000, 15000 - (this.level * 1000));
            if (now - this.lastGarbageTime > interval) {
                this.addGarbage(1);
                this.lastGarbageTime = now;
            }
        }

        // 3. Random Shift Mode: Every 5000 points
        if (this.mode === 'random' && this.score - this.lastRandomShiftScore >= 5000) {
            this.randomizeField(3); // Add 3 random blocks
            this.lastRandomShiftScore = this.score;
        }
    }
}
