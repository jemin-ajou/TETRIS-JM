class TetrisAI {
    constructor(game) {
        this.game = game;
        this.difficulty = 'medium';
        this.targetX = 0;
        this.targetRotation = 0;
        this.lastActionTime = 0;
        this.actionInterval = 500; // ms per move
        this.isMoving = false;
        
        this.settings = {
            easy: { delay: 600, mistakeRatio: 0.3, speed: 400, reaction: 800 },
            medium: { delay: 400, mistakeRatio: 0.1, speed: 200, reaction: 500 },
            hard: { delay: 150, mistakeRatio: 0.05, speed: 80, reaction: 200 },
            boss: { delay: 50, mistakeRatio: 0, speed: 20, reaction: 50 }
        };

        this.reactionTimer = 0;
        this.isThinking = false;
        this.lastTime = 0;
    }

    setDifficulty(level) {
        this.difficulty = level;
        this.actionInterval = this.settings[level].speed;
    }

    // Heuristic Weights
    // Height, Lines, Holes, Bumpiness
    getWeights() {
        return {
            height: -0.51,
            lines: 0.76,
            holes: -0.35,
            bumpiness: -0.18
        };
    }

    update(time) {
        if (this.game.gameOver || this.game.paused) return;

        if (this.lastTime === 0) this.lastTime = time;
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        if (!this.isMoving && !this.isThinking) {
            // 원거리에서 생각하는 시간 (Thinking time at spawn)
            this.isThinking = true;
            this.reactionTimer = this.settings[this.difficulty].reaction + (Math.random() * 200);
            return;
        }

        if (this.isThinking) {
            this.reactionTimer -= deltaTime;
            if (this.reactionTimer <= 0) {
                this.calculateBestMove();
                this.isThinking = false;
                this.isMoving = true;
            }
            return;
        }

        // 높이에 따른 긴급도 가중치 (Urgency based on height)
        let urgencyModifier = 1.0;
        const stackHeight = this.getColumnHeights(this.game.board).reduce((a, b) => Math.max(a, b), 0);
        if (stackHeight > ROWS * 0.6) urgencyModifier = 0.5; // 2배 빠름 (2x faster)

        if (time - this.lastActionTime > (this.actionInterval * urgencyModifier)) {
            this.executeNextAction();
            this.lastActionTime = time;
        }
    }

    calculateBestMove() {
        const piece = this.game.piece;
        const nextPiece = this.game.nextQueue[0]; // Lookahead 1
        
        let bestScore = -Infinity;
        let bestMove = { x: piece.pos.x, rotation: 0 };

        // 1단계: 현재 피스 탐색 (Step 1: Search current piece)
        for (let r = 0; r < 4; r++) {
            const shape = this.getRotatedShape(piece.shape, r);
            for (let x = -2; x < COLS + 2; x++) {
                if (this.isValidMove(x, 0, shape)) {
                    const finalY = this.getFinalY(x, shape);
                    
                    // 가상 보드 생성 (Create virtual board)
                    const tempBoard = this.getVirtualBoard(this.game.board, x, finalY, shape);
                    let score = this.evaluateBoard(tempBoard);

                    // 2단계: 넥스트 피스 탐색 (Step 2: Lookahead with next piece)
                    if (nextPiece) {
                        let bestNextScore = -Infinity;
                        for (let nr = 0; nr < 4; nr++) {
                            const nShape = this.getRotatedShape(nextPiece.shape, nr);
                            for (let nx = -2; nx < COLS + 2; nx++) {
                                if (this.isValidMoveAt(tempBoard, nx, 0, nShape)) {
                                    const nFinalY = this.getFinalYAt(tempBoard, nx, nShape);
                                    const nNextBoard = this.getVirtualBoard(tempBoard, nx, nFinalY, nShape);
                                    const nScore = this.evaluateBoard(nNextBoard);
                                    if (nScore > bestNextScore) bestNextScore = nScore;
                                }
                            }
                        }
                        score += bestNextScore * 0.5; // 넥스트 피스 영향력 (Next piece influence)
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x, rotation: r };
                    }
                }
            }
        }

        // 인간적인 실수 (Human mistakes)
        if (Math.random() < this.settings[this.difficulty].mistakeRatio) {
            const mistake = Math.random();
            if (mistake < 0.5) bestMove.x += (Math.random() > 0.5 ? 1 : -1);
            else bestMove.rotation = (bestMove.rotation + 1) % 4;
        }

        this.targetX = bestMove.x;
        this.targetRotation = bestMove.rotation;
    }

    getVirtualBoard(board, px, py, shape) {
        const tempBoard = JSON.parse(JSON.stringify(board));
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (tempBoard[y + py]) tempBoard[y + py][x + px] = 1;
                }
            });
        });
        return tempBoard;
    }

    isValidMoveAt(board, px, py, shape) {
        for (let y = 0; y < shape.length; ++y) {
            for (let x = 0; x < shape[y].length; ++x) {
                if (shape[y][x] !== 0 &&
                    (board[y + py] === undefined ||
                        board[y + py][x + px] === undefined ||
                        board[y + py][x + px] !== 0)) {
                    return false;
                }
            }
        }
        return true;
    }

    getFinalYAt(board, px, shape) {
        let py = 0;
        while (this.isValidMoveAt(board, px, py + 1, shape)) {
            py++;
        }
        return py;
    }

    getRotatedShape(shape, times) {
        let rotated = JSON.parse(JSON.stringify(shape));
        for (let i = 0; i < times; i++) {
            // Clockwise rotate
            for (let y = 0; y < rotated.length; ++y) {
                for (let x = 0; x < y; ++x) {
                    [rotated[x][y], rotated[y][x]] = [rotated[y][x], rotated[x][y]];
                }
            }
            rotated.forEach(row => row.reverse());
        }
        return rotated;
    }

    isValidMove(px, py, shape) {
        for (let y = 0; y < shape.length; ++y) {
            for (let x = 0; x < shape[y].length; ++x) {
                if (shape[y][x] !== 0 &&
                    (this.game.board[y + py] === undefined ||
                        this.game.board[y + py][x + px] === undefined ||
                        this.game.board[y + py][x + px] !== 0)) {
                    return false;
                }
            }
        }
        return true;
    }

    getFinalY(px, shape) {
        let py = 0;
        while (this.isValidMove(px, py + 1, shape)) {
            py++;
        }
        return py;
    }

    evaluateBoard(tempBoard) {
        // Heuristics
        const weights = this.getWeights();
        let aggregateHeight = 0;
        let completeLines = 0;
        let holes = 0;
        let bumpiness = 0;

        const columnHeights = this.getColumnHeights(tempBoard);
        aggregateHeight = columnHeights.reduce((a, b) => a + b, 0);

        for (let y = 0; y < ROWS; y++) {
            if (tempBoard[y].every(v => v !== 0)) completeLines++;
        }

        for (let x = 0; x < COLS; x++) {
            let foundBlock = false;
            for (let y = 0; y < ROWS; y++) {
                if (tempBoard[y][x] !== 0) foundBlock = true;
                else if (foundBlock && tempBoard[y][x] === 0) holes++;
            }
        }

        for (let x = 0; x < COLS - 1; x++) {
            bumpiness += Math.abs(columnHeights[x] - columnHeights[x+1]);
        }

        return (weights.height * aggregateHeight) +
               (weights.lines * Math.pow(completeLines, 2)) + // 여러 줄 클리어 선호 (Prefer multi-line clears)
               (weights.holes * holes) +
               (weights.bumpiness * bumpiness);
    }

    getColumnHeights(board) {
        const columnHeights = new Array(COLS).fill(0);
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (board[y][x] !== 0) {
                    columnHeights[x] = ROWS - y;
                    break;
                }
            }
        }
        return columnHeights;
    }

    executeNextAction() {
        const piece = this.game.piece;
        
        // 인간은 이동과 회전을 아주 동시에 하지는 않지만 번갈아가며 빠르게 수행함
        // (Humans don't move and rotate simultaneously but alternate quickly)
        
        // 1. 회전이 필요하면 수행 (Perform rotation if needed)
        if (this.targetRotation > 0) {
            this.game.rotate(1);
            this.targetRotation--;
            // 가끔 회전 후에 바로 이동하지 않고 약간의 지연을 줌 (Slight delay after rotation)
            if (Math.random() > 0.8) return; 
        }

        // 2. 수평 이동 (Horizontal movement)
        if (piece.pos.x < this.targetX) {
            this.game.move(1);
        } else if (piece.pos.x > this.targetX) {
            this.game.move(-1);
        } else if (this.targetRotation === 0) {
            // 3. 목표 도착 시 하드 드롭 전 망설임 (Hesitation before hard drop)
            if (Math.random() > 0.7) {
                this.game.hardDrop();
                this.isMoving = false;
            } else {
                // 망설이는 동안 부드럽게 한 칸 더 아래로 (Drop one step while hesitating)
                this.game.drop();
            }
        }
    }
}
