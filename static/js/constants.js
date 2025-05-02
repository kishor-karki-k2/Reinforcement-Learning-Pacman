/**
 * Constants for Pacman AI Learning Game
 * Defines game settings, directions, and configuration parameters
 */

// General game configuration
const CELL_SIZE = 25;       // Size of each cell in pixels
const HALF_CELL = CELL_SIZE / 2;
const COLS = 22;            // Number of columns in the maze
const ROWS = 26;            // Number of rows in the maze
const FPS = 60;             // Frames per second
const Y_OFFSET = 10;        // Y-offset for positioning in canvas
const WALL_SIZE = 2;        // Wall thickness

// Game speeds
const PACMAN_SPEED = 2.5;     // Base speed for Pacman (increased from 2)
const GHOST_SPEED = 2.0;      // Base speed for ghosts (increased from 2)
const VULNERABLE_GHOST_SPEED = 1.5; // Speed for vulnerable ghosts (increased from 1.0)

// Power mode configuration
const POWER_MODE_DURATION = 7000;   // Duration of power mode in milliseconds
const BLINK_START_TIME = 5000;      // When ghosts start blinking during power mode

// Scoring values
const DOT_POINTS = 10;          // Points for eating a dot
const POWER_PELLET_POINTS = 50; // Points for eating a power pellet
const GHOST_POINTS = 200;       // Base points for eating a ghost

// Direction vectors
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
    NONE: { x: 0, y: 0 }
};

// Ghost modes
const GHOST_MODES = {
    CHASE: 'chase',
    SCATTER: 'scatter',
    FRIGHTENED: 'frightened',
    IN_HOUSE: 'in-house'
};

// Colors
const COLORS = {
    BACKGROUND: "#000000",
    WALL: "#2121DE",
    WALL_INNER: "#0000FF",
    DOT: "#FFB6C1",
    POWER_PELLET: "#FFFFFF",
    PACMAN: "#FFFF00",
    GHOST_HOUSE: "#FFB6C1",
    GHOST_RED: "#FF0000",
    GHOST_PINK: "#FFB6C1",
    GHOST_CYAN: "#00FFFF",
    GHOST_ORANGE: "#FFA500",
    GHOST_VULNERABLE: "#0000FF",
    GHOST_VULNERABLE_ENDING: "#FFFFFF",
    TEXT: "#FFFFFF",
    SCORE: "#FFFF00",
    LIVES: "#FFFF00"
};

// Default maze layout
// 1 = Wall (blue blocks)
// 2 = Dot (small white/pink dots Pacman eats)
// 3 = Power Pellet (larger dots that make ghosts vulnerable)
// 4 = Empty space inside ghost house
// 5 = Pacman spawn marker
// 0 = Empty space (no dots)
const DEFAULT_MAZE = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Row 0: All walls
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 1: Walls with dots inside
    [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1], // Row 2: Maze pattern with dots
    [1, 3, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 3, 1], // Row 3: Power pellet (left side)
    [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1], // Row 4: Maze pattern with dots
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 5: Horizontal passage with dots
    [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // Row 6: Maze pattern with dots
    [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // Row 7: Maze pattern with dots
    [1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1], // Row 8: Horizontal passage with dots
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1], // Row 9: Mostly walls with path
    [1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 0, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1], // Row 10: Ghost house area - exit point
    [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 4, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // Row 11: Ghost house top wall
    [1, 2, 1, 1, 1, 2, 1, 2, 1, 4, 4, 4, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // Row 12: Ghost house - 4 means inside house
    [1, 2, 2, 2, 2, 2, 2, 2, 1, 4, 4, 4, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 13: Tunnel row with ghost house
    [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 0, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // Row 14: Ghost house bottom wall
    [1, 2, 1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 1, 1, 1, 2, 1], // Row 15: Below ghost house
    [1, 2, 2, 2, 2, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 1], // Row 16: Maze pattern with paths
    [1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1], // Row 17: Maze pattern with paths
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 18: Horizontal passage with dots
    [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1], // Row 19: Maze pattern with dots
    [1, 3, 2, 2, 1, 2, 2, 2, 2, 2, 5, 2, 2, 2, 2, 2, 1, 2, 2, 2, 3, 1], // Row 20: Power pellets and Pacman start (5)
    [1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1], // Row 21: Maze pattern with dots
    [1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1], // Row 22: Horizontal passage with dots
    [1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1], // Row 23: Maze pattern with dots
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 24: Bottom row of dots
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Row 25: All walls (bottom)
];

// Initial positions
const PACMAN_START_POSITION = {
    x: 10 * CELL_SIZE + CELL_SIZE / 2,  // Column 10 (matches the '5' in row 20), centered
    y: 20 * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET  // Row 20, centered
};

// Ghost house coordinates
const GHOST_HOUSE = {
    centerX: 10 * CELL_SIZE + CELL_SIZE / 2,  // Center of ghost house horizontally
    centerY: 12 * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET,  // Center of ghost house vertically
    exitX: 11 * CELL_SIZE + CELL_SIZE / 2,  // Ghost house exit X position
    exitY: 10 * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET  // Ghost house exit Y position
};

// Ghost configurations with standardized positions
const GHOST_CONFIGS = [
    {
        color: '#FF0000', // Red ghost (Blinky)
        startPosition: { 
            x: GHOST_HOUSE.centerX - CELL_SIZE, 
            y: GHOST_HOUSE.centerY 
        },
        personalityFactor: 0.8, // Very direct in chasing
        name: "Blinky"
    },
    {
        color: '#FFB8FF', // Pink ghost (Pinky)
        startPosition: { 
            x: GHOST_HOUSE.centerX, 
            y: GHOST_HOUSE.centerY - CELL_SIZE 
        },
        personalityFactor: 0.7, // Tries to get ahead of Pacman
        name: "Pinky"
    },
    {
        color: '#00FFFF', // Cyan ghost (Inky)
        startPosition: { 
            x: GHOST_HOUSE.centerX + CELL_SIZE, 
            y: GHOST_HOUSE.centerY 
        },
        personalityFactor: 0.6, // Takes more unexpected routes
        name: "Inky"
    },
    {
        color: '#FFB852', // Orange ghost (Clyde)
        startPosition: { 
            x: GHOST_HOUSE.centerX, 
            y: GHOST_HOUSE.centerY + CELL_SIZE 
        },
        personalityFactor: 0.5, // More random movement
        name: "Clyde"
    }
];

// Game message durations
const MESSAGE_DURATION = 2000;      // Duration of game messages like "Ready!" in milliseconds
const GAME_OVER_DELAY = 3000;       // Delay before restarting after game over

// Helper functions that both games might need
function lightenColor(color, amount) {
    return adjustColor(color, amount);
}

function darkenColor(color, amount) {
    return adjustColor(color, -amount);
}

function adjustColor(color, amount) {
    let r, g, b;
    
    if (color.startsWith('#')) {
        color = color.substring(1);
        r = parseInt(color.substring(0, 2), 16);
        g = parseInt(color.substring(2, 4), 16);
        b = parseInt(color.substring(4, 6), 16);
    } else if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        } else {
            return color;
        }
    } else {
        return color;
    }
    
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Export constants so they're available globally
window.CELL_SIZE = CELL_SIZE;
window.ROWS = ROWS;
window.COLS = COLS;
window.WALL_SIZE = WALL_SIZE;
window.Y_OFFSET = Y_OFFSET;
window.PACMAN_SPEED = PACMAN_SPEED;
window.GHOST_SPEED = GHOST_SPEED;
window.VULNERABLE_GHOST_SPEED = VULNERABLE_GHOST_SPEED;
window.POWER_MODE_DURATION = POWER_MODE_DURATION;
window.PACMAN_START_POSITION = PACMAN_START_POSITION;
window.GHOST_HOUSE = GHOST_HOUSE;
window.GHOST_MODES = GHOST_MODES;
window.GHOST_CONFIGS = GHOST_CONFIGS;
window.DIRECTIONS = DIRECTIONS;
window.DEFAULT_MAZE = DEFAULT_MAZE; 