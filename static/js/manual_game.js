/**
 * Manual Pacman Game
 * For player-controlled gameplay
 */

class ManualGame {
    constructor(canvasId) {
        // Canvas setup
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with ID ${canvasId} not found!`);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = COLS * CELL_SIZE + 10;
        this.canvas.height = ROWS * CELL_SIZE + 20;
        
        // Game state
        this.gameStarted = false;
        this.paused = true;
        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.lives = 3;
        this.powerMode = false;
        this.powerModeTimer = null;
        this.animationFrame = null;
        this.gameData = [];
        
        // Direction state
        this.currentDirection = {...DIRECTIONS.RIGHT};
        this.nextDirection = {...DIRECTIONS.RIGHT};
        
        // Initialize game
        this.reset();
        
        // Setup input handlers
        this.setupKeyListeners();
        
        // Initial render
        this.render();
        
        console.log("Manual game initialized with canvas", canvasId);
    }
    
    // Setup keyboard controls
    setupKeyListeners() {
        document.addEventListener('keydown', (event) => {
            if (!this.gameStarted) return;
            
            switch (event.key) {
                case 'ArrowUp':
                    this.nextDirection = {...DIRECTIONS.UP};
                    break;
                case 'ArrowDown':
                    this.nextDirection = {...DIRECTIONS.DOWN};
                    break;
                case 'ArrowLeft':
                    this.nextDirection = {...DIRECTIONS.LEFT};
                    break;
                case 'ArrowRight':
                    this.nextDirection = {...DIRECTIONS.RIGHT};
                    break;
                case ' ':
                    // Space toggles pause
                    this.togglePause();
                    break;
                case 'r':
                case 'R':
                    // R key restarts the game
                    if (this.gameOver) {
                        this.reset();
                        this.start();
                    }
                    break;
            }
        });
    }
    
    // Start the game
    start() {
        if (this.gameStarted && !this.paused) return;
        
        console.log("Starting game...");
        this.gameStarted = true;
        this.paused = false;
        this.runGameLoop();
        
        // Set timer to unlock AI game after 5 seconds of gameplay
        if (window.unlockAIGame) {
            console.log("Setting timer to unlock AI game after 5 seconds");
            setTimeout(() => {
                console.log("Unlocking AI game");
                window.unlockAIGame();
            }, 5000);
        }
    }
    
    // Reset the game
    reset() {
        console.log("Resetting game");
        
        // Reset game state
        this.gameStarted = false;
        this.paused = true;
        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.lives = 3;
        this.powerMode = false;
        this.gameData = [];
        
        // Cancel any animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear timers
        if (this.powerModeTimer) {
            clearTimeout(this.powerModeTimer);
            this.powerModeTimer = null;
        }
        
        // Initialize maze, counting dots
        this.maze = JSON.parse(JSON.stringify(DEFAULT_MAZE));
        this.dotsRemaining = 0;
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (this.maze[row][col] === 2 || this.maze[row][col] === 3) {
                    this.dotsRemaining++;
                }
            }
        }
        this.totalDots = this.dotsRemaining;
        
        // Reset characters
        this.initPacman();
        this.initGhosts();
        
        // Reset directions
        this.currentDirection = {...DIRECTIONS.RIGHT};
        this.nextDirection = {...DIRECTIONS.RIGHT};
        
        // Update UI
        this.updateScore();
        this.updateLives();
        
        console.log("Game reset complete");
    }
    
    // Run the game loop
    runGameLoop() {
        if (this.paused || this.gameOver) return;
        
        this.update();
        this.render();
        
        // Schedule next frame
        this.animationFrame = requestAnimationFrame(() => this.runGameLoop());
    }
    
    // Toggle pause state
    togglePause() {
        if (!this.gameStarted || this.gameOver) return;
        
        this.paused = !this.paused;
        
        if (!this.paused) {
            // Resume game
            this.runGameLoop();
        }
    }
    
    // Update game state
    update() {
        if (this.paused || this.gameOver) return;
        
        // Check win condition
        if (this.dotsRemaining <= 0) {
            this.gameWon = true;
            this.gameOver = true;
            console.log("All dots eaten - You win!");
            return;
        }
        
        // Move characters
        this.movePacman();
        this.moveGhosts();
        
        // Check for collisions
        this.checkDotCollision();
        this.checkCollisions();
        
        // Record data for AI learning
        this.recordGameData();
    }
    
    // Render the game
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game elements
        this.drawMaze();
        this.drawPacman();
        this.drawGhosts();
        
        // Draw game over or win message if game is over
        if (this.gameOver) {
            if (this.gameWon) {
                this.drawGameMessage("YOU WIN!", "#FFD700");
            } else {
                this.drawGameMessage("GAME OVER", "#FF0000");
            }
        }
    }
    
    // Draw a centered message on the screen
    drawGameMessage(message, color) {
        this.ctx.save();
        
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Text settings
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw main message
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        // Draw score
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        // Press any key message
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 60);
        
        this.ctx.restore();
    }
    
    // Update the score display
    updateScore() {
        const scoreElement = document.getElementById('player-score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }
    
    // Update the lives display
    updateLives() {
        const livesElement = document.getElementById('player-lives');
        if (livesElement) {
            livesElement.textContent = this.lives;
        }
    }
    
    // Record game data for AI learning
    recordGameData() {
        // Only record if the game is active
        if (!this.gameStarted || this.paused || this.gameOver) return;
        
        const gameState = {
            pacmanPos: { x: this.pacman.x, y: this.pacman.y },
            pacmanDir: this.currentDirection,
            ghostPositions: this.ghosts.map(ghost => ({ x: ghost.x, y: ghost.y })),
            score: this.score,
            powerMode: this.powerMode,
            dotsEaten: this.totalDots - this.dotsRemaining
        };
        
        this.gameData.push(gameState);
        
        // Limit size to prevent memory issues
        if (this.gameData.length > 10000) {
            this.gameData.splice(0, 1000);
        }
    }
    
    // Initialize Pacman
    initPacman() {
        // Use the centralized Pacman start position from constants.js
        console.log("Initializing manual Pacman at position:", PACMAN_START_POSITION.x, PACMAN_START_POSITION.y);
        
        this.pacman = {
            x: PACMAN_START_POSITION.x,
            y: PACMAN_START_POSITION.y,
            radius: CELL_SIZE / 2 - 2,
            speed: PACMAN_SPEED,
            animation: 0,
            mouthAngle: 0.2,
        };
    }
    
    // Initialize ghosts
    initGhosts() {
        this.ghosts = [];
        
        // Create ghosts using the centralized configurations
        for (let i = 0; i < GHOST_CONFIGS.length; i++) {
            const config = GHOST_CONFIGS[i];
            
            this.ghosts.push({
                x: config.startPosition.x,
                y: config.startPosition.y,
                color: config.color,
                speed: GHOST_SPEED,
                isVulnerable: false,
                exitingHouse: true, // All ghosts start in exiting mode
                direction: {...DIRECTIONS.UP},
                personality: {
                    directness: config.personalityFactor,
                    lookAhead: 4 - i, // How far ahead to target
                    randomness: 0.3 * (4 - i) // More randomness for later ghosts
                },
                stuck: 0
            });
        }
        
        console.log("Manual ghosts initialized at ghost house");
    }
    
    // Move Pacman
    movePacman() {
        if (!this.pacman) return;
        
        // Check if trying to change direction
        if (this.nextDirection && (this.nextDirection.x !== this.currentDirection.x || this.nextDirection.y !== this.currentDirection.y)) {
            // Calculate center of current cell
            const col = Math.floor(this.pacman.x / CELL_SIZE);
            const row = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
            const cellCenterX = col * CELL_SIZE + CELL_SIZE / 2;
            const cellCenterY = row * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
            
            // Calculate distance from center
            const distFromCenterX = Math.abs(this.pacman.x - cellCenterX);
            const distFromCenterY = Math.abs(this.pacman.y - cellCenterY);
            
            // Near enough to center to turn (smaller value = more responsive turns)
            const turnThreshold = CELL_SIZE * 0.35;
            const canTurn = distFromCenterX <= turnThreshold && distFromCenterY <= turnThreshold;
            
            if (canTurn) {
                // Test if the next direction is valid
                const testX = this.pacman.x + this.nextDirection.x * CELL_SIZE * 0.6;
                const testY = this.pacman.y + this.nextDirection.y * CELL_SIZE * 0.6;
                
                if (!this.isWall(testX, testY)) {
                    // Snap to grid for cleaner turns
                    if (this.nextDirection.x !== 0) {
                        this.pacman.y = cellCenterY; // Align Y when turning horizontally
                    } else if (this.nextDirection.y !== 0) {
                        this.pacman.x = cellCenterX; // Align X when turning vertically
                    }
                    
                    this.currentDirection = {...this.nextDirection};
                }
            }
        }
        
        // Calculate next position
        const nextPosX = this.pacman.x + this.currentDirection.x * this.pacman.speed;
        const nextPosY = this.pacman.y + this.currentDirection.y * this.pacman.speed;
        
        // Check if next position is valid (not a wall)
        if (!this.isWall(nextPosX, nextPosY)) {
            this.pacman.x = nextPosX;
            this.pacman.y = nextPosY;
            
            // Handle screen wrapping for tunnels
            this.handleScreenWrapping(this.pacman);
        } else {
            // Align with grid when hitting a wall
            this.alignWithGrid();
        }
        
        // Update mouth animation
        this.pacman.animation += 0.2;
        this.pacman.mouthAngle = 0.1 + Math.abs(Math.sin(this.pacman.animation)) * 0.4;
    }
    
    // Align Pacman with the grid when hitting a wall
    alignWithGrid() {
        if (!this.pacman) return;
        
        const col = Math.floor(this.pacman.x / CELL_SIZE);
        const row = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // Calculate center of current cell
        const cellCenterX = col * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = row * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
        
        // Align based on movement direction
        if (this.currentDirection.x !== 0) { // Moving horizontally
            this.pacman.y = cellCenterY; // Align Y
            
            // Stop at the wall
            if (this.currentDirection.x > 0) { // Moving right
                this.pacman.x = Math.min(this.pacman.x, col * CELL_SIZE + CELL_SIZE - this.pacman.radius);
            } else { // Moving left
                this.pacman.x = Math.max(this.pacman.x, col * CELL_SIZE + this.pacman.radius);
            }
        } 
        else if (this.currentDirection.y !== 0) { // Moving vertically
            this.pacman.x = cellCenterX; // Align X
            
            // Stop at the wall
            if (this.currentDirection.y > 0) { // Moving down
                this.pacman.y = Math.min(this.pacman.y, row * CELL_SIZE + CELL_SIZE + Y_OFFSET - this.pacman.radius);
            } else { // Moving up
                this.pacman.y = Math.max(this.pacman.y, row * CELL_SIZE + Y_OFFSET + this.pacman.radius);
            }
        }
    }
    
    // Check if a position is a wall
    isWall(x, y) {
        // Get grid coordinates
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor((y - Y_OFFSET) / CELL_SIZE);
        
        // Check bounds
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
            // Allow horizontal wrapping for tunnels
            if (row >= 0 && row < ROWS && (col < 0 || col >= COLS)) {
                return false;
            }
            return true;
        }
        
        // Check if position is a wall
        return this.maze[row][col] === 1;
    }
    
    // Handle screen wrapping
    handleScreenWrapping(entity) {
        if (!entity) return;
        
        const mazeWidth = COLS * CELL_SIZE;
        
        // Wrap horizontally (tunnels)
        if (entity.x < -CELL_SIZE) {
            entity.x = mazeWidth + CELL_SIZE / 2;
        } else if (entity.x > mazeWidth + CELL_SIZE) {
            entity.x = -CELL_SIZE / 2;
        }
        
        // Constrain vertically
        const yMin = Y_OFFSET;
        const yMax = ROWS * CELL_SIZE + Y_OFFSET;
        
        if (entity.y < yMin) {
            entity.y = yMin;
        } else if (entity.y > yMax) {
            entity.y = yMax;
        }
    }
    
    // Get game data for AI learning
    getGameData() {
        return this.gameData;
    }
    
    // Draw the maze
    drawMaze() {
        const yOffset = Y_OFFSET;
        
        // Draw the maze elements
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE + yOffset;
                
                // Get the cell type
                const cell = this.maze[row][col];
                
                // Draw different elements based on cell type
                switch (cell) {
                    case 1: // Wall
                        this.drawWall(x, y, CELL_SIZE, CELL_SIZE);
                        break;
                    case 2: // Dot
                        this.drawDot(x, y);
                        break;
                    case 3: // Power pellet
                        this.drawPowerPellet(x, y);
                        break;
                    case 4: // Ghost house
                        this.drawGhostHouse(x, y);
                        break;
                }
            }
        }
    }
    
    // Draw wall
    drawWall(x, y, width, height) {
        // Wall color for manual game
        const baseColor = '#00695C';
        
        // Fill wall
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(x, y, width, height);
        
        // Add 3D effect with highlights and shadows
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x + width, y);
        this.ctx.strokeStyle = lightenColor(baseColor, 50);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x + width, y);
        this.ctx.strokeStyle = darkenColor(baseColor, 50);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Add black border around each block
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    // Draw dot
    drawDot(x, y) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(
            x + CELL_SIZE / 2, 
            y + CELL_SIZE / 2, 
            CELL_SIZE / 10, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
    }
    
    // Draw power pellet
    drawPowerPellet(x, y) {
        // Pulsating effect
        const pulseSize = 1 + 0.2 * Math.sin(Date.now() / 200);
        
        // Glow effect
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 8;
        
        // Draw pellet
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(
            x + CELL_SIZE / 2, 
            y + CELL_SIZE / 2, 
            CELL_SIZE / 4 * pulseSize, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
    }
    
    // Draw ghost house
    drawGhostHouse(x, y) {
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.1)';
        this.ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
    
    // Draw Pacman
    drawPacman() {
        if (!this.pacman) return;
        
        this.ctx.save();
        
        // Translate to Pacman's position
        this.ctx.translate(this.pacman.x, this.pacman.y);
        
        // Rotate based on direction
        let rotation = 0;
        if (this.currentDirection.x === 1) rotation = 0;
        else if (this.currentDirection.x === -1) rotation = Math.PI;
        else if (this.currentDirection.y === -1) rotation = -Math.PI/2;
        else if (this.currentDirection.y === 1) rotation = Math.PI/2;
        
        this.ctx.rotate(rotation);
        
        // Draw Pacman body
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.beginPath();
        
        // Dynamic mouth angle for chomping animation
        const mouthAngle = this.pacman.mouthAngle;
        
        this.ctx.arc(
            0, 
            0, 
            this.pacman.radius, 
            mouthAngle, 
            Math.PI * 2 - mouthAngle
        );
        
        this.ctx.lineTo(0, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    // Draw ghosts
    drawGhosts() {
        if (!this.ghosts) return;
        
        for (const ghost of this.ghosts) {
            if (!ghost) continue;
            
            this.ctx.save();
            
            // Draw body
            this.ctx.fillStyle = ghost.isVulnerable ? 
                (Date.now() % 1000 < 500 ? '#2121FF' : '#FFFFFF') : 
                ghost.color;
                
            // Ghost body (circle for top and rectangle for bottom)
            this.ctx.beginPath();
            
            // Make the ghost slightly larger to avoid cut-off
            const ghostRadius = CELL_SIZE / 2;
            
            // Top semi-circle
            this.ctx.arc(
                ghost.x, 
                ghost.y - CELL_SIZE / 6, // Raised center point for a better ghost shape
                ghostRadius, 
                Math.PI, 
                0
            );
            
            // Bottom part with wavy edge - ensure it extends to form a complete body
            const waveHeight = 4;
            const segments = 4;
            const width = ghostRadius * 2;
            const height = ghostRadius + 4; // Increased height to prevent cut-off
            
            // Right side down
            this.ctx.lineTo(ghost.x + width / 2, ghost.y + height - waveHeight);
            
            // Wavy bottom - carefully positioned to complete the ghost shape
            for (let i = 0; i < segments; i++) {
                const waveDirection = i % 2 === 0 ? -1 : 1;
                const waveX = ghost.x + width / 2 - ((i + 1) / segments) * width;
                
                this.ctx.lineTo(
                    waveX,
                    ghost.y + height + waveDirection * waveHeight
                );
            }
            
            // Left side up
            this.ctx.lineTo(ghost.x - width / 2, ghost.y - CELL_SIZE / 6);
            
            this.ctx.closePath();
            this.ctx.fill();
            
            // Eyes - adjust position based on new ghost dimensions
            if (!ghost.isVulnerable) {
                // Eye whites
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(ghost.x - 5, ghost.y - 7, 4, 0, Math.PI * 2);
                this.ctx.arc(ghost.x + 5, ghost.y - 7, 4, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Eye direction - look where moving or at pacman if vulnerable
                let eyeX = ghost.direction.x;
                let eyeY = ghost.direction.y;
                
                // Pupils
                this.ctx.fillStyle = 'blue';
                this.ctx.beginPath();
                this.ctx.arc(ghost.x - 5 + eyeX * 2, ghost.y - 7 + eyeY * 2, 2, 0, Math.PI * 2);
                this.ctx.arc(ghost.x + 5 + eyeX * 2, ghost.y - 7 + eyeY * 2, 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Vulnerable ghost eyes
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                
                // Eyes (smaller dots) - adjust position
                this.ctx.arc(ghost.x - 5, ghost.y - 5, 2, 0, Math.PI * 2);
                this.ctx.arc(ghost.x + 5, ghost.y - 5, 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Mouth (flipped semi-circle) - adjust position
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.arc(ghost.x, ghost.y + 3, 4, 0, Math.PI, true);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }
    }
    
    // Move ghosts
    moveGhosts() {
        if (!this.ghosts) return;
        
        for (const ghost of this.ghosts) {
            if (!ghost) continue;
            
            // Handle ghost house exit logic
            if (ghost.exitingHouse) {
                // Use the centralized ghost house exit position from constants.js
                const exitX = GHOST_HOUSE.exitX;
                const exitY = GHOST_HOUSE.exitY;
                
                // First move up to the top of the ghost house
                if (ghost.y > exitY) {
                    ghost.y -= ghost.speed * 1.5; // Move slightly faster to exit
                    
                    // Ensure it doesn't overshoot
                    if (ghost.y < exitY) {
                        ghost.y = exitY;
                    }
                } 
                // Then move to the exit position
                else {
                    if (ghost.x < exitX) {
                        ghost.x += ghost.speed * 1.5;
                        if (ghost.x > exitX) ghost.x = exitX;
                    } else if (ghost.x > exitX) {
                        ghost.x -= ghost.speed * 1.5;
                        if (ghost.x < exitX) ghost.x = exitX;
                    }
                    
                    // When ghost reaches exit position, set it as no longer exiting
                    if (Math.abs(ghost.x - exitX) < 2 && Math.abs(ghost.y - exitY) < 2) {
                        ghost.exitingHouse = false;
                        ghost.direction = {...DIRECTIONS.LEFT}; // Start moving left when exiting
                        console.log("Ghost exited house:", ghost.color);
                    }
                }
                
                continue; // Skip rest of movement logic
            }
            
            // Adjust ghost speed based on vulnerability
            const currentSpeed = ghost.isVulnerable ? VULNERABLE_GHOST_SPEED : ghost.speed;
            
            // Calculate next position based on current direction
            const nextPosX = ghost.x + ghost.direction.x * currentSpeed;
            const nextPosY = ghost.y + ghost.direction.y * currentSpeed;
            
            // Check if next position is valid (not a wall)
            if (!this.isWall(nextPosX, nextPosY)) {
                ghost.x = nextPosX;
                ghost.y = nextPosY;
                ghost.stuck = 0;
                
                // Handle screen wrapping
                this.handleScreenWrapping(ghost);
                
                // Check if at an intersection to possibly change direction
                if (this.isAtIntersection(ghost.x, ghost.y)) {
                    this.decideGhostDirection(ghost);
                }
            } else {
                // If hitting a wall, align with grid and choose new direction
                const col = Math.floor(ghost.x / CELL_SIZE);
                const row = Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE);
                
                // Align with grid for clean turns
                const cellCenterX = col * CELL_SIZE + CELL_SIZE / 2;
                const cellCenterY = row * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
                
                ghost.x = cellCenterX;
                ghost.y = cellCenterY;
                
                // Choose a new direction
                this.decideGhostDirection(ghost);
            }
        }
    }
    
    // Check if entity is at an intersection (multiple possible directions)
    isAtIntersection(x, y) {
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor((y - Y_OFFSET) / CELL_SIZE);
        
        // Check if close to cell center
        const cellCenterX = col * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = row * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
        
        const distFromCenterX = Math.abs(x - cellCenterX);
        const distFromCenterY = Math.abs(y - cellCenterY);
        
        // Only check for intersections when close to center of a cell
        if (distFromCenterX < 2 && distFromCenterY < 2) {
            // Count available directions
            let availableDirections = 0;
            
            // Check each cardinal direction
            if (!this.isWall(x + CELL_SIZE, y)) availableDirections++;
            if (!this.isWall(x - CELL_SIZE, y)) availableDirections++;
            if (!this.isWall(x, y + CELL_SIZE)) availableDirections++;
            if (!this.isWall(x, y - CELL_SIZE)) availableDirections++;
            
            // It's an intersection if more than 2 directions are available (not just a corridor)
            return availableDirections > 2;
        }
        
        return false;
    }
    
    // Decide new direction for ghost
    decideGhostDirection(ghost) {
        // Get all possible directions excluding the opposite of current direction
        const directions = this.getValidDirectionsForGhost(ghost);
        
        if (directions.length === 0) return; // No valid directions
        
        if (this.pacman && !ghost.isVulnerable && Math.random() < ghost.personality.directness) {
            // Chase mode - target Pacman
            this.chaseMode(ghost, directions);
        } else if (ghost.isVulnerable) {
            // Frightened mode - move away from Pacman or randomly
            this.frightenedMode(ghost, directions);
        } else {
            // Scatter mode - move randomly
            ghost.direction = directions[Math.floor(Math.random() * directions.length)];
        }
    }
    
    // Get all valid directions for a ghost (excluding reversing direction unless necessary)
    getValidDirectionsForGhost(ghost) {
        const x = ghost.x;
        const y = ghost.y;
        
        const validDirections = [];
        const oppositeDir = { 
            x: -ghost.direction.x, 
            y: -ghost.direction.y 
        };
        
        // Check each cardinal direction
        for (const dir of Object.values(DIRECTIONS)) {
            // Skip NONE direction
            if (dir.x === 0 && dir.y === 0) continue;
            
            // Skip opposite direction unless it's the only option
            if (dir.x === oppositeDir.x && dir.y === oppositeDir.y) continue;
            
            // Test position
            const testX = x + dir.x * CELL_SIZE * 0.6;
            const testY = y + dir.y * CELL_SIZE * 0.6;
            
            if (!this.isWall(testX, testY)) {
                validDirections.push({...dir});
            }
        }
        
        // If no valid directions (trapped), allow reversing
        if (validDirections.length === 0) {
            const testX = x + oppositeDir.x * CELL_SIZE * 0.6;
            const testY = y + oppositeDir.y * CELL_SIZE * 0.6;
            
            if (!this.isWall(testX, testY)) {
                validDirections.push({...oppositeDir});
            }
        }
        
        return validDirections;
    }
    
    // Chase mode - ghost tries to target Pacman intelligently
    chaseMode(ghost, directions) {
        if (!this.pacman || directions.length === 0) return;
        
        // Some ghosts target ahead of Pacman, others directly
        let targetX = this.pacman.x;
        let targetY = this.pacman.y;
        
        // Blinky (red) - targets Pacman directly
        if (ghost.color === COLORS.GHOST_RED) {
            // No modification to target
        } 
        // Pinky (pink) - targets 4 tiles ahead of Pacman
        else if (ghost.color === COLORS.GHOST_PINK) {
            targetX += this.currentDirection.x * CELL_SIZE * 4;
            targetY += this.currentDirection.y * CELL_SIZE * 4;
        }
        // Inky (blue) - targets position calculated from Blinky and Pacman
        else if (ghost.color === COLORS.GHOST_CYAN) {
            // Find Blinky (red ghost)
            const blinky = this.ghosts.find(g => g && g.color === COLORS.GHOST_RED);
            if (blinky) {
                // Target is twice the vector from Blinky to 2 tiles ahead of Pacman
                const aheadX = this.pacman.x + this.currentDirection.x * CELL_SIZE * 2;
                const aheadY = this.pacman.y + this.currentDirection.y * CELL_SIZE * 2;
                
                targetX = aheadX + (aheadX - blinky.x);
                targetY = aheadY + (aheadY - blinky.y);
            }
        }
        // Clyde (orange) - targets Pacman when far, bottom-left when close
        else if (ghost.color === COLORS.GHOST_ORANGE) {
            // Calculate distance to Pacman
            const distToPacman = Math.sqrt(
                Math.pow(ghost.x - this.pacman.x, 2) + 
                Math.pow(ghost.y - this.pacman.y, 2)
            );
            
            // If close to Pacman, target bottom-left corner
            if (distToPacman < CELL_SIZE * 8) {
                targetX = CELL_SIZE * 2;
                targetY = ROWS * CELL_SIZE - CELL_SIZE * 2;
            }
        }
        
        // Sort directions by how well they align with target
        directions.sort((a, b) => {
            const distA = Math.pow(ghost.x + a.x * CELL_SIZE - targetX, 2) + 
                           Math.pow(ghost.y + a.y * CELL_SIZE - targetY, 2);
            const distB = Math.pow(ghost.x + b.x * CELL_SIZE - targetX, 2) + 
                           Math.pow(ghost.y + b.y * CELL_SIZE - targetY, 2);
            
            return distA - distB; // Closest first
        });
        
        // Choose best direction with some randomness based on personality
        const randomFactor = Math.min(1 - ghost.personality.directness, 0.3);
        const randomIndex = Math.random() < randomFactor ? 
                            Math.floor(Math.random() * directions.length) : 0;
        
        ghost.direction = directions[randomIndex];
    }
    
    // Frightened mode - ghost tries to move away from Pacman
    frightenedMode(ghost, directions) {
        if (!this.pacman || directions.length === 0) return;
        
        // Sort directions by how far they are from Pacman
        directions.sort((a, b) => {
            const distA = Math.pow(ghost.x + a.x * CELL_SIZE - this.pacman.x, 2) + 
                           Math.pow(ghost.y + a.y * CELL_SIZE - this.pacman.y, 2);
            const distB = Math.pow(ghost.x + b.x * CELL_SIZE - this.pacman.x, 2) + 
                           Math.pow(ghost.y + b.y * CELL_SIZE - this.pacman.y, 2);
            
            return distB - distA; // Furthest first
        });
        
        // Add more randomness in frightened mode
        const randomIndex = Math.floor(Math.random() * Math.min(directions.length, 2));
        ghost.direction = directions[randomIndex];
    }
    
    // Check for dot collection
    checkDotCollision() {
        if (!this.pacman) return;
        
        // Get Pacman's grid position
        const col = Math.floor(this.pacman.x / CELL_SIZE);
        const row = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // Check bounds
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
        
        // Check distance to dot center for more accurate collision
        const cellCenterX = col * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = row * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
        const distance = Math.sqrt(
            Math.pow(this.pacman.x - cellCenterX, 2) + 
            Math.pow(this.pacman.y - cellCenterY, 2)
        );
        
        // If close enough to center
        if (distance < CELL_SIZE / 3) {
            if (this.maze[row][col] === 2) {
                // Regular dot
                this.maze[row][col] = 0;
                this.score += DOT_POINTS;
                this.updateScore();
                this.dotsRemaining--;
            } else if (this.maze[row][col] === 3) {
                // Power pellet
                this.maze[row][col] = 0;
                this.score += POWER_PELLET_POINTS;
                this.updateScore();
                this.dotsRemaining--;
                
                // Activate power mode
                this.activatePowerMode();
            }
        }
    }
    
    // Activate power mode
    activatePowerMode() {
        this.powerMode = true;
        
        // Make ghosts vulnerable
        if (this.ghosts) {
            this.ghosts.forEach(ghost => {
                if (ghost) ghost.isVulnerable = true;
            });
        }
        
        // Clear existing timer
        if (this.powerModeTimer) {
            clearTimeout(this.powerModeTimer);
        }
        
        // Set power mode duration
        this.powerModeTimer = setTimeout(() => {
            this.powerMode = false;
            
            // Make ghosts normal again
            if (this.ghosts) {
                this.ghosts.forEach(ghost => {
                    if (ghost) ghost.isVulnerable = false;
                });
            }
            
            this.powerModeTimer = null;
        }, POWER_MODE_DURATION);
    }
    
    // Check for collisions between Pacman and ghosts
    checkCollisions() {
        if (!this.pacman || !this.ghosts) return;
        
        for (const ghost of this.ghosts) {
            if (!ghost) continue;
            
            // Calculate distance between Pacman and ghost
            const distance = Math.sqrt(
                Math.pow(this.pacman.x - ghost.x, 2) + 
                Math.pow(this.pacman.y - ghost.y, 2)
            );
            
            // Collision threshold (sum of radii)
            const collisionThreshold = this.pacman.radius + (CELL_SIZE / 2 - 4);
            
            if (distance < collisionThreshold) {
                if (ghost.isVulnerable) {
                    // Eat the ghost
                    this.score += GHOST_POINTS;
                    this.updateScore();
                    
                    // Reset ghost position
                    ghost.exitingHouse = true;
                    ghost.x = 11 * CELL_SIZE + CELL_SIZE / 2;
                    ghost.y = 13 * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
                    ghost.isVulnerable = false;
                } else {
                    // Lose a life
                    this.lives--;
                    this.updateLives();
                    
                    if (this.lives <= 0) {
                        this.gameOver = true;
                    } else {
                        // Reset positions but keep the game state
                        this.initPacman();
                        
                        // Reset ghost positions
                        this.ghosts.forEach(g => {
                            if (!g) return;
                            g.exitingHouse = true;
                            g.x = 11 * CELL_SIZE + CELL_SIZE / 2;
                            g.y = 13 * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
                        });
                    }
                }
            }
        }
    }
}

// Export the class
window.ManualGame = ManualGame; 