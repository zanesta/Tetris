import { SHAPES, COLORS } from './tetrominoes.js';

const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const GAME_SPEED = 1000;

// Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = BLOCK_SIZE * BOARD_WIDTH;
canvas.height = BLOCK_SIZE * BOARD_HEIGHT;

const nextPieceCanvas = document.getElementById('next-piece');
const nextCtx = nextPieceCanvas.getContext('2d');
nextPieceCanvas.width = BLOCK_SIZE * 4;
nextPieceCanvas.height = BLOCK_SIZE * 4;

// Game state
let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let currentPiece = null;
let nextPiece = null;
let currentScore = 0;
let highScore = 0;
let ghostPiece = null;
let gameLoop = null;

class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
    }

    rotate() {
        const newShape = this.shape[0].map((_, i) => 
            this.shape.map(row => row[i]).reverse()
        );
        
        if (this.isValidMove(this.x, this.y, newShape)) {
            this.shape = newShape;
            updateGhostPiece();
        }
    }

    isValidMove(newX, newY, shape = this.shape) {
        return shape.every((row, dy) =>
            row.every((value, dx) => {
                if (!value) return true;
                const boardX = newX + dx;
                const boardY = newY + dy;
                return (
                    boardX >= 0 &&
                    boardX < BOARD_WIDTH &&
                    boardY < BOARD_HEIGHT &&
                    (boardY < 0 || !board[boardY][boardX])
                );
            })
        );
    }        

    moveDown() {
        if (this.isValidMove(this.x, this.y + 1)) {
            this.y++;
            return true;
        }
        return false;
    }

    moveLeft() {
        if (this.isValidMove(this.x - 1, this.y)) {
            this.x--;
            updateGhostPiece();
        }
    }

    moveRight() {
        if (this.isValidMove(this.x + 1, this.y)) {
            this.x++;
            updateGhostPiece();
        }
    }

    hardDrop() {
        while (this.moveDown()) {}
        lockPiece();
    }
}

function createNewPiece() {
    const shapes = Object.keys(SHAPES);
    const type = shapes[Math.floor(Math.random() * shapes.length)];
    return new Piece([...SHAPES[type]], COLORS[type]);
}

function updateGhostPiece() {
    if (!currentPiece) return;
    
    ghostPiece = new Piece([...currentPiece.shape], currentPiece.color);
    ghostPiece.x = currentPiece.x;
    ghostPiece.y = currentPiece.y;
    
    while (ghostPiece.isValidMove(ghostPiece.x, ghostPiece.y + 1)) {
        ghostPiece.y++;
    }
}

function drawBlock(ctx, x, y, color, isGhost = false) {
    const blockX = x * BLOCK_SIZE;
    const blockY = y * BLOCK_SIZE;
    const radius = BLOCK_SIZE / 6;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(blockX, blockY, BLOCK_SIZE, BLOCK_SIZE, radius);
    
    if (isGhost) {
        ctx.strokeStyle = color;
        ctx.stroke();
    } else {
        const gradient = ctx.createLinearGradient(
            blockX, blockY,
            blockX + BLOCK_SIZE, blockY + BLOCK_SIZE
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, shadeColor(color, -30));
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 3D effect
        ctx.beginPath();
        ctx.roundRect(
            blockX + BLOCK_SIZE * 0.01,
            blockY + BLOCK_SIZE * 0.01,
            BLOCK_SIZE * 0.85,
            BLOCK_SIZE * 0.85,
            radius
        );
        ctx.fillStyle = lightenColor(color, 25);
        ctx.fill();
    }
    ctx.restore();
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return `#${(1 << 24 | (R < 255 ? R < 1 ? 0 : R : 255) << 16 | (G < 255 ? G < 1 ? 0 : G : 255) << 8 | (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`;
}

function lightenColor(color, percent) {
    return shadeColor(color, Math.abs(percent));
}

function draw() {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(ctx, x, y, value);
            }
        });
    });

    // Draw ghost piece
    if (ghostPiece) {
        ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(ctx, ghostPiece.x + x, ghostPiece.y + y, ghostPiece.color, true);
                }
            });
        });
    }

    // Draw current piece
    if (currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                }
            });
        });
    }

    // Draw next piece
    nextCtx.fillStyle = '#2a2a2a';
    nextCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(nextCtx, x + offsetX, y + offsetY, nextPiece.color);
                }
            });
        });
    }
}

function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value && currentPiece.y + y >= 0) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        });
    });

    clearLines();
    currentPiece = nextPiece;
    nextPiece = createNewPiece();
    updateGhostPiece();

    if (!currentPiece.isValidMove(currentPiece.x, currentPiece.y)) {
        gameOver();
    }
}

function clearLines() {
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++;
        }
    }

    if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800][linesCleared];
        currentScore += points;
        if (currentScore > highScore) {
            highScore = currentScore;
        }
        document.getElementById('currentScore').textContent = currentScore;
        document.getElementById('highScore').textContent = highScore;
    }
}

function gameOver() {
    clearInterval(gameLoop);
    document.getElementById('game-over').style.display = 'block';
    currentPiece = null;
}

function startGame() {
    document.getElementById('game-over').style.display = 'none';
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    currentScore = 0;
    document.getElementById('currentScore').textContent = currentScore;
    
    currentPiece = createNewPiece();
    nextPiece = createNewPiece();
    updateGhostPiece();
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        if (currentPiece && !currentPiece.moveDown()) {
            lockPiece();
        }
        draw();
    }, GAME_SPEED);
}

// Controls
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !currentPiece) {
        startGame();
        return;
    }

    if (!currentPiece) return;

    switch (e.key) {
        case 'ArrowLeft':
            currentPiece.moveLeft();
            break;
        case 'ArrowRight':
            currentPiece.moveRight();
            break;
        case 'ArrowDown':
            if (!currentPiece.moveDown()) {
                lockPiece();
            }
            break;
        case 'ArrowUp':
            currentPiece.rotate();
            break;
        case ' ':
            currentPiece.hardDrop();
            break;
    }
    draw();
});

startGame();