const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 35;

const COLORS = {
    'I': '#00f2ff',
    'J': '#0044ff',
    'L': '#ff9500',
    'O': '#ffea00',
    'S': '#00ff44',
    'T': '#7000ff',
    'Z': '#ff0055',
    'G': '#444444' // Garbage
};

const SKIN_CONFIGS = {
    neon: {
        colors: { ...COLORS },
        glow: true,
        border: 'rgba(255, 255, 255, 0.3)',
        ghostAlpha: 0.3
    },
    classic: {
        colors: {
            'I': '#00ffff',
            'J': '#0000ff',
            'L': '#ff7f00',
            'O': '#ffff00',
            'S': '#00ff00',
            'T': '#a000f0',
            'Z': '#ff0000',
            'G': '#888888'
        },
        glow: false,
        border: '#000',
        ghostAlpha: 0.2
    },
    dark: {
        colors: {
            'I': '#4a9eff',
            'J': '#3d5afe',
            'L': '#ff9100',
            'O': '#ffea00',
            'S': '#00e676',
            'T': '#d500f9',
            'Z': '#ff1744',
            'G': '#333333'
        },
        glow: false,
        border: 'rgba(255, 255, 255, 0.1)',
        ghostAlpha: 0.15
    },
    light: {
        colors: {
            'I': '#00bcd4',
            'J': '#3f51b5',
            'L': '#f57c00',
            'O': '#fbc02d',
            'S': '#4caf50',
            'T': '#9c27b0',
            'Z': '#e91e63',
            'G': '#bdbdbd'
        },
        glow: false,
        border: 'rgba(0, 0, 0, 0.1)',
        ghostAlpha: 0.2
    }
};

const SHAPES = {
    'I': [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    'J': [[1,0,0],[1,1,1],[0,0,0]],
    'L': [[0,0,1],[1,1,1],[0,0,0]],
    'O': [[1,1],[1,1]],
    'S': [[0,1,1],[1,1,0],[0,0,0]],
    'T': [[0,1,0],[1,1,1],[0,0,0]],
    'Z': [[1,1,0],[0,1,1],[0,0,0]]
};

const SCORING = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    COMBO_BONUS: 50
};

const P1_KEYS = {
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    DOWN: 'ArrowDown',
    UP: 'ArrowUp',
    HARD_DROP: ' '
};

const P2_KEYS = {
    LEFT: 'a',
    RIGHT: 'd',
    DOWN: 's',
    UP: 'w',
    HARD_DROP: 'Shift'
};
