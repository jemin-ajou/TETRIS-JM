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
            easy: { delay: 600, mistakeRatio: 0.3, speed: 400 },
            medium: { delay: 400, mistakeRatio: 0.1, speed: 200 },
            hard: { delay: 150, mistakeRatio: 0, speed: 80 },
            boss: { delay: 50, mistakeRatio: 0, speed: 20 }
        };
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

        if (!this.isMoving) {
            this.calculateBestMove();
            this.isMoving = true;
        }

        if (time - this.lastActionTime > this.actionInterval) {
            this.executeNextAction();
            this.lastActionTime = time;
        }
    }

    calculateBestMove() {
        const piece = this.game.piece;
        let bestScore = -Infinity;
        let bestMove = { x: piece.pos.x, rotation: 0 };

        // Test all rotations
        for (let r = 0; r < 4; r++) {
            const shape = this.getRotatedShape(piece.shape, r);
            
            // Test all horizontal positions
            for (let x = -2; x < COLS + 2; x++) {
                if (this.isValidMove(x, 0, shape)) {
                    const finalY = this.getFinalY(x, shape);
                    const score = this.evaluateBoard(x, finalY, shape);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x, rotation: r };
                    }
                }
            }
        }

        // Add some mistake chance based on difficulty
        if (Math.random() < this.settings[this.difficulty].mistakeRatio) {
            bestMove.x += (Math.random() > 0.5 ? 1 : -1);
        }

        this.targetX = bestMove.x;
        this.targetRotation = bestMove.rotation;
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

    evaluateBoard(px, py, shape) {
        // Clone board and merge piece
        const tempBoard = JSON.parse(JSON.stringify(this.game.board));
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (tempBoard[y + py]) tempBoard[y + py][x + px] = 1;
                }
            });
        });

        // Heuristics
        const weights = this.getWeights();
        let aggregateHeight = 0;
        let completeLines = 0;
        let holes = 0;
        let bumpiness = 0;

        const columnHeights = new Array(COLS).fill(0);
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (tempBoard[y][x] !== 0) {
                    columnHeights[x] = ROWS - y;
                    break;
                }
            }
        }

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
               (weights.lines * completeLines) +
               (weights.holes * holes) +
               (weights.bumpiness * bumpiness);
    }

    executeNextAction() {
        const piece = this.game.piece;
        
        // 1. Rotation first (to match target shape)
        if (this.targetRotation > 0) {
            this.game.rotate(1);
            this.targetRotation--;
            return;
        }

        // 2. Horizontal movement
        if (piece.pos.x < this.targetX) {
            this.game.move(1);
        } else if (piece.pos.x > this.targetX) {
            this.game.move(-1);
        } else {
            // 3. Already at target position and rotation -> Hard Drop
            this.game.hardDrop();
            this.isMoving = false;
        }
    }
}
