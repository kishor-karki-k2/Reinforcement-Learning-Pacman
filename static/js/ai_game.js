/**
 * AI Pacman Game
 * For AI-controlled evolutionary gameplay
 */

class AIGame {
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
        this.isAI = true;
        this.gameStarted = false;
        this.paused = true;
        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.lives = 1; // AI has only one life per generation - dies immediately on ghost contact
        this.powerMode = false;
        this.powerModeTimer = null;
        this.animationFrame = null;
        this.gameData = [];
        this.generationCount = 1;
        this.agentNumber = 1;
        this.ghostExitCheckDone = false;
        this.powerPelletCount = 0;
        this.ghostsEaten = 0;
        this.lastPosition = null;
        this.speedFactor = 1.0; // Default speed factor of 1.0 (normal speed)
        
        // Frame timing variables
        this.lastFrameTime = performance.now();
        this.frameAccumulator = 0;
        this.frameTimeTarget = 1000 / 60; // Target 60 FPS (time in ms per frame)
        
        // Direction state
        this.currentDirection = {...DIRECTIONS.RIGHT};
        this.nextDirection = {...DIRECTIONS.RIGHT};
        
        // AI parameters (will be set by main.js)
        this.aiParameters = {
            dotWeight: 10,
            powerPelletWeight: 20,
            ghostWeight: -10,
            vulnerableGhostWeight: 8,
            explorationWeight: 2
        };
        
        // Q-learning parameters
        this.qTable = {};
        this.learningRate = 0.1;
        this.discountFactor = 0.9;
        this.explorationRate = 0.3;
        
        this.lastState = null;
        this.lastAction = null;
        this.currentReward = 0;
        this.episodeReward = 0;
        this.previousDots = 0;
        this.previousScore = 0;
        
        // Initialize game
        this.reset();
        
        // Initial render
        this.render();
        
        console.log("AI game initialized with canvas", canvasId);
    }
    
    // Start the game
    start() {
        if (this.gameStarted) return;
        
        console.log("Starting AI game");
        this.gameStarted = true;
        this.paused = false;
        this.gameOver = false;
        this.gameWon = false;
        
        // Reset frame timing variables
        this.lastFrameTime = performance.now();
        this.frameAccumulator = 0;
        
        // Start the game loop
        this.animationFrame = requestAnimationFrame(() => this.runGameLoop());
        
        this.gameData = [];
        this.episodeReward = 0;
        
        // Reset tracking variables
        this.previousDots = 0;
        this.previousScore = 0;
        
        // Initialize state
        this.lastState = null;
        this.lastAction = null;
    }
    
    // Reset the game
    reset() {
        console.log("Resetting AI game");
        
        // Reset game state
        this.gameStarted = false;
        this.paused = true;
        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.lives = 1;
        this.powerMode = false;
        this.powerModeTime = 0;
        this.gameData = [];
        this.ghostExitCheckDone = false;
        this.powerPelletCount = 0;
        this.ghostsEaten = 0;
        this.lastPosition = null;
        
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
        this.totalDots = 0;
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (this.maze[row][col] === 2 || this.maze[row][col] === 3) {
                    this.totalDots++;
                    this.dotsRemaining++;
                }
            }
        }
        
        // Reset characters
        this.initPacman();
        this.initGhosts();
        
        // Reset directions
        this.currentDirection = {...DIRECTIONS.RIGHT};
        this.nextDirection = {...DIRECTIONS.RIGHT};
        
        // Update UI
        this.updateScore();
        
        console.log("AI game reset complete");
    }
    
    // Run the game loop
    runGameLoop() {
        if (this.paused || this.gameOver) {
            return;
        }
        
        // Delta time calculation for frame rate independence
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Apply the speed factor
        const speedAdjustedDelta = deltaTime * this.speedFactor;
        
        // Only update based on target frame rate (60 FPS)
        this.frameAccumulator += speedAdjustedDelta;
        while (this.frameAccumulator >= this.frameTimeTarget) {
            this.update();
            this.frameAccumulator -= this.frameTimeTarget;
        }
        
        // Always render
        this.render();
        
        // Make an AI decision every few frames
        if (Math.random() < 0.1) {
            this.makeAIDecision();
        }
        
        // Force ghosts to exit if they're still in house after 5 seconds
        if (this.gameStarted && !this.ghostExitCheckDone && this.gameData.length > 50) {
            this.ghostExitCheckDone = true;
            let anyGhostsInHouse = false;
            
            for (const ghost of this.ghosts) {
                if (ghost.exitingHouse) {
                    // Force ghost out of house
                    ghost.exitingHouse = false;
                    ghost.x = GHOST_HOUSE.exitX;
                    ghost.y = GHOST_HOUSE.exitY;
                    ghost.direction = {...DIRECTIONS.LEFT};
                    anyGhostsInHouse = true;
                }
            }
            
            if (anyGhostsInHouse) {
                console.log("Forced ghosts out of house after timeout");
            }
        }
        
        // Schedule next frame
        this.animationFrame = requestAnimationFrame(() => this.runGameLoop());
    }
    
    // Update game state
    update() {
        if (this.paused || this.gameOver) return;
        
        // Record data if game is running
        if (this.pacman) {
            // Save current state for learning
            this.recordGameData();
            
            // Make AI decision
            this.makeQLearningDecision();
        }
        
        // Update game elements
        this.movePacman();
        this.moveGhosts();
        this.checkDotCollision();
        this.checkCollisions();
        this.checkWin();
        
        // Handle power mode timing
        if (this.powerMode && !this.powerModeTimer) {
            this.powerModeTimer = setTimeout(() => {
                this.powerMode = false;
                this.powerModeTimer = null;
                
                // Reset ghost vulnerability
                for (const ghost of this.ghosts) {
                    ghost.isVulnerable = false;
                }
            }, POWER_MODE_DURATION);
        }
    }
    
    // Render the game
    render() {
        // Ensure canvas is ready
        if (!this.canvas || !this.ctx) {
            console.error("Cannot render: Canvas or context is not available");
            return;
        }
        
        // Clear canvas with a solid background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game elements
        this.drawMaze();
        
        // Ensure pacman exists before drawing
        if (!this.pacman) {
            console.warn("Pacman not initialized, creating now...");
            this.initPacman();
        }
        
        // Draw characters
        this.drawGhosts();
        this.drawPacman();
        
        // Draw score info
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 20);
        
        // Draw game over message if won
        if (this.gameOver && this.gameWon) {
            this.drawGameMessage("LEVEL COMPLETE!", "#FFD700");
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
        
        // Draw dots eaten
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Dots eaten: ${this.totalDots - this.dotsRemaining}/${this.totalDots}`, 
            this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.restore();
    }
    
    // Move Pacman
    movePacman() {
        if (!this.pacman) return;
        
        // Calculate the current grid cell
        const cellX = Math.floor(this.pacman.x / CELL_SIZE);
        const cellY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // If we're near the center of a cell, check if we can change direction
        if (this.isNearCellCenter(this.pacman.x, this.pacman.y)) {
            // Get the next cell in the desired direction
            const nextCellX = cellX + this.pacman.nextDirection.x;
            const nextCellY = cellY + this.pacman.nextDirection.y;
            
            // If the next cell is valid (not a wall), change direction
            if (nextCellY >= 0 && nextCellY < ROWS && 
                nextCellX >= 0 && nextCellX < COLS && 
                this.maze[nextCellY][nextCellX] !== 1) {
                // Snap to grid center for clean turns
                if (Math.abs(this.pacman.nextDirection.x) > 0) {
                    this.pacman.y = cellY * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
                } else {
                    this.pacman.x = cellX * CELL_SIZE + CELL_SIZE / 2;
                }
                
                // Change direction
                this.pacman.direction = {...this.pacman.nextDirection};
            }
        }
        
        // Calculate next position
        const nextX = this.pacman.x + this.pacman.direction.x * this.pacman.speed;
        const nextY = this.pacman.y + this.pacman.direction.y * this.pacman.speed;
        
        // Check if the next position is a wall
        const nextCellX = Math.floor(nextX / CELL_SIZE);
        const nextCellY = Math.floor((nextY - Y_OFFSET) / CELL_SIZE);
        
        // Move if not hitting a wall
        if (nextCellY >= 0 && nextCellY < ROWS && 
            nextCellX >= 0 && nextCellX < COLS && 
            this.maze[nextCellY][nextCellX] !== 1) {
            this.pacman.x = nextX;
            this.pacman.y = nextY;
        }
        
        // Handle screen wrapping for Pacman
        this.handleScreenWrapping(this.pacman);
    }
    
    // Check if near cell center
    isNearCellCenter(x, y) {
        const cellX = Math.floor(x / CELL_SIZE);
        const cellY = Math.floor((y - Y_OFFSET) / CELL_SIZE);
        
        const centerX = cellX * CELL_SIZE + CELL_SIZE / 2;
        const centerY = cellY * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
        
        // Check if we're close to a cell center
        const distance = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        
        return distance < 5; // Within 5 pixels of center
    }
    
    // Get available directions from a grid position
    getAvailableDirections(x, y) {
        const availableDirections = [];
        
        // Check each direction
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        
        for (const dir of directions) {
            const dirVector = DIRECTIONS[dir];
            
            // Skip NONE
            if (dirVector.x === 0 && dirVector.y === 0) continue;
            
            // Calculate new position
            const newX = x + dirVector.x;
            const newY = y + dirVector.y;
            
            // Check bounds and if not a wall
            if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS && 
                this.maze[newY][newX] !== 1) {
                availableDirections.push(dir);
            }
        }
        
        return availableDirections;
    }
    
    // Handle screen wrapping
    handleScreenWrapping(object) {
        // Screen wrapping (tunnel)
        if (object.x < 0) {
            object.x = COLS * CELL_SIZE - 1;
        } else if (object.x >= COLS * CELL_SIZE) {
            object.x = 0;
        }
        
        // No vertical wrapping for typical Pacman mazes
    }
    
    // Check if a position is a wall
    isWall(x, y) {
        // Get the row and column in the maze
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor((y - Y_OFFSET) / CELL_SIZE);
        
        // Check if out of bounds
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
            return false; // Allow movement off-screen for wrapping
        }
        
        // Check if it's a wall (code 1) or ghost house wall (code 5)
        return this.maze[row][col] === 1 || this.maze[row][col] === 5;
    }
    
    // Check if a position is inside the ghost house
    isInGhostHouse(x, y) {
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor((y - Y_OFFSET) / CELL_SIZE);
        
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
            return false;
        }
        
        return this.maze[row][col] === 6; // Ghost house
    }
    
    // Check collision with dots and power pellets
    checkDotCollision() {
        if (!this.pacman) return;
        
        // Get Pacman's grid position
        const gridX = Math.floor(this.pacman.x / CELL_SIZE);
        const gridY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // Check bounds
        if (gridY < 0 || gridY >= ROWS || gridX < 0 || gridX >= COLS) return;
        
        // Get the cell type
        const cellType = this.maze[gridY][gridX];
        
        // Check for dot
        if (cellType === 2) {
            // Regular dot
            this.score += 10;
            this.maze[gridY][gridX] = 0; // Remove dot
            this.dotsRemaining--;
            this.updateScore();
        } 
        // Check for power pellet
        else if (cellType === 3) {
            // Power pellet
            this.score += 50;
            this.maze[gridY][gridX] = 0; // Remove power pellet
            this.dotsRemaining--;
            this.powerPelletCount++; // Increment power pellet count
            this.updateScore();
            
            // Activate power mode
            this.powerMode = true;
            this.powerModeTime = POWER_MODE_DURATION;
            
            // Reset any existing timer
            if (this.powerModeTimer) {
                clearTimeout(this.powerModeTimer);
                this.powerModeTimer = null;
            }
            
            // Make ghosts vulnerable
            for (const ghost of this.ghosts) {
                ghost.isVulnerable = true;
            }
            
            // Set a new timer to end power mode
            this.powerModeTimer = setTimeout(() => {
                this.powerMode = false;
                this.powerModeTime = 0;
                this.powerModeTimer = null;
                
                // Reset ghost vulnerability
                for (const ghost of this.ghosts) {
                    ghost.isVulnerable = false;
                }
            }, POWER_MODE_DURATION);
            
            console.log("Power mode activated!");
        }
    }
    
    // Check collisions between Pacman and ghosts
    checkCollisions() {
        if (this.gameOver) return;
        
        // For each ghost
        for (let i = 0; i < this.ghosts.length; i++) {
            const ghost = this.ghosts[i];
            
            // Skip if ghost is in "eaten" state
            if (ghost.state === 'eaten') continue;
            
            // Check for collision between Pacman and this ghost
            if (this.checkCollision(this.pacman, ghost)) {
                // If ghost is vulnerable, eat it
                if (ghost.vulnerable) {
                    this.eatGhost(ghost);
                    continue;
                }
                
                // Otherwise, Pacman gets caught
                console.log("Ghost caught Pacman! Generation ended");
                
                // Add negative reward for death
                this.currentReward -= 50;
                this.episodeReward -= 50;
                
                // Game over
                this.displayGameOver("New Generation!");
                this.gameOver = true;
                
                // Get data for the episode
                const dotsEaten = this.totalDots - this.dotsRemaining;
                
                // Call finishEpisode directly with error handling, passing isCollision=true
                try {
                    if (typeof window.finishEpisode === 'function') {
                        window.finishEpisode(
                            this.episodeReward, 
                            dotsEaten || 0,  // Ensure dotsEaten is not undefined
                            this.score || 0,  // Ensure score is not undefined
                            true // Mark as collision to trigger generation increment
                        );
                    } else {
                        console.error("finishEpisode function not found in window object");
                        // Try to recover by resetting the game
                        setTimeout(() => this.reset(), 500);
                    }
                } catch (error) {
                    console.error("Error calling finishEpisode:", error);
                    // Try to recover by resetting the game
                    setTimeout(() => {
                        try {
                            this.reset();
                            this.start();
                        } catch (resetError) {
                            console.error("Failed to recover from error:", resetError);
                        }
                    }, 500);
                }
                
                return; // Exit after handling collision
            }
        }
    }
    
    // Handle completion of level
    checkWin() {
        if (this.dotsRemaining === 0 && !this.gameOver) {
            console.log("All dots eaten! Level completed successfully!");
            
            // Display win message
            this.displayGameOver("Level Complete!");
            
            // Add significant positive reward for completing the level
            this.currentReward += 50;
            this.episodeReward += 50;
            
            // Learn from final state-action before ending
            if (this.lastState && this.lastAction !== null) {
                this.learnFromExperience(this.lastState, this.lastAction, this.currentReward);
            }
            
            // Set game over flag
            this.gameOver = true;
            
            // Get level completion data
            const dotsEaten = this.totalDots || 0;
            
            // Call finishEpisode directly with error handling
            try {
                if (typeof window.finishEpisode === 'function') {
                    window.finishEpisode(
                        this.episodeReward || 0, 
                        dotsEaten || 0, 
                        this.score || 0, 
                        true  // Consider level completion as collision to start new generation
                    );
                } else {
                    console.error("finishEpisode function not found in window object");
                    // Try to recover by resetting the game
                    setTimeout(() => this.reset(), 500);
                }
            } catch (error) {
                console.error("Error in finishEpisode during win:", error);
                // Try to recover by resetting the game
                setTimeout(() => {
                    try {
                        this.reset();
                        this.start();
                    } catch (resetError) {
                        console.error("Failed to recover from error:", resetError);
                    }
                }, 500);
            }
        }
    }
    
    // Update the score display
    updateScore() {
        const aiScoreElement = document.getElementById('ai-score');
        if (aiScoreElement) {
            aiScoreElement.textContent = this.score;
        }
    }
    
    // Record game data for AI evaluation
    recordGameData() {
        if (!this.pacman) return;
        
        // Add current state to game data
        this.gameData.push({
            position: {
                x: this.pacman.x,
                y: this.pacman.y
            },
            direction: this.pacman.direction,
            dots: this.totalDots - this.dotsRemaining,
            score: this.score,
            time: this.gameTime
        });
        
        // Check for new rewards since last frame
        const dotsEaten = (this.totalDots - this.dotsRemaining) - this.previousDots;
        const scoreDelta = this.score - this.previousScore;
        
        // Calculate immediate reward
        let reward = 0;
        
        // Reward for eating dots (primary goal)
        if (dotsEaten > 0) {
            reward += dotsEaten * 1.0;
        }
        
        // Reward for score increase (includes ghost eating, etc.)
        if (scoreDelta > 0) {
            reward += scoreDelta * 0.01;
        }
        
        // Small penalty for time passing (encourages efficiency)
        reward -= 0.01;
        
        // Update current reward
        this.currentReward = reward;
        this.episodeReward += reward;
        
        // Update previous metrics
        this.previousDots = this.totalDots - this.dotsRemaining;
        this.previousScore = this.score;
        
        // Learn from previous state-action if available
        if (this.lastState && this.lastAction !== null) {
            this.learnFromExperience(this.lastState, this.lastAction, reward);
        }
    }
    
    // Draw message overlay - removed or simplified messages
    drawMessage(message) {
        // Removed messages
    }
    
    // Draw generation info - removed
    drawGenerationInfo() {
        // Removed generation info
    }
    
    // Draw the maze
    drawMaze() {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cellType = this.maze[row][col];
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE + Y_OFFSET;
                
                if (cellType === 1) { // Wall
                    this.drawWall(x, y, CELL_SIZE, CELL_SIZE);
                } else if (cellType === 2) { // Dot
                    this.drawDot(x + CELL_SIZE/2, y + CELL_SIZE/2);
                } else if (cellType === 3) { // Power pellet
                    this.drawPowerPellet(x + CELL_SIZE/2, y + CELL_SIZE/2);
                } else if (cellType === 5) { // Ghost house wall
                    this.drawGhostHouseWall(x, y, CELL_SIZE, CELL_SIZE);
                } else if (cellType === 6) { // Ghost house
                    this.drawGhostHouse(x, y, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }
    
    // Draw a wall cell
    drawWall(x, y, width, height) {
        // Main wall color - slightly darker purple
        this.ctx.fillStyle = '#9a7cbc'; // Darker purple but not too dark
        this.ctx.fillRect(x, y, width, height);
        
        // 3D effect with slightly darker color
        this.ctx.fillStyle = '#8469a8'; // Darker shade for 3D effect
        this.ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
        
        // Add black border around each block
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    // Draw a ghost house wall
    drawGhostHouseWall(x, y, width, height) {
        this.ctx.fillStyle = '#FF756C'; // Pink for ghost house walls
        this.ctx.fillRect(x, y, width, height);
        
        // Add a 3D effect
        this.ctx.fillStyle = '#FF5349'; // Darker pink for 3D effect
        this.ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
    }
    
    // Draw the ghost house
    drawGhostHouse(x, y, width, height) {
        this.ctx.fillStyle = 'rgba(255, 182, 193, 0.2)'; // Light pink, semi-transparent
        this.ctx.fillRect(x, y, width, height);
    }
    
    // Draw a dot
    drawDot(x, y) {
        this.ctx.fillStyle = '#FFB8AE'; // Light pink dots
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    // Draw a power pellet
    drawPowerPellet(x, y) {
        // Add pulsating effect
        const pulseSize = 4 + Math.sin(Date.now() / 200) * 2;
        
        this.ctx.fillStyle = '#FFD700'; // Gold color
        this.ctx.beginPath();
        this.ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add glow effect
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(x, y, pulseSize - 1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset shadow
    }
    
    // Draw Pacman
    drawPacman() {
        if (!this.pacman) return;
        
        const ctx = this.ctx;
        
        // Calculate mouth opening angle based on animation frame
        const frame = Math.floor(Date.now() / 100) % 10;
        const mouthAngle = Math.PI / 4 * (frame < 5 ? frame : 10 - frame) / 5;
        
        // Calculate rotation based on direction
        let rotation = 0;
        if (this.pacman.direction.x === -1) rotation = Math.PI;
        if (this.pacman.direction.y === -1) rotation = Math.PI * 1.5;
        if (this.pacman.direction.y === 1) rotation = Math.PI / 2;
        
        // Save context for rotation
        ctx.save();
        ctx.translate(this.pacman.x, this.pacman.y);
        ctx.rotate(rotation);
        
        // Draw Pacman body
        ctx.beginPath();
        ctx.fillStyle = "#FFFF00"; // Bright yellow for Pacman
        ctx.arc(0, 0, CELL_SIZE / 2 - 2, mouthAngle, Math.PI * 2 - mouthAngle);
        ctx.lineTo(0, 0);
        ctx.fill();
        
        // Restore context after rotation
        ctx.restore();
    }
    
    // Draw ghosts
    drawGhosts() {
        // Draw each ghost
        for (let i = 0; i < this.ghosts.length; i++) {
            const ghost = this.ghosts[i];
            const {x, y, color} = ghost;
            
            // Consistent ghost size
            const radius = CELL_SIZE / 2;
            
            this.ctx.save();
            
            // Use different colors for vulnerable ghosts (flashing near end of vulnerability)
            if (ghost.isVulnerable) {
                // Flashing effect near end of vulnerability
                const isBlinking = this.powerMode && (this.powerModeTime > 0) && 
                                 (this.powerModeTime < 2000) && (Math.floor(Date.now() / 250) % 2 === 0);
                this.ctx.fillStyle = isBlinking ? '#FFF' : '#2121DE';
            } else {
                this.ctx.fillStyle = color;
            }
            
            // Draw ghost body - improved shape to prevent cut-off
            this.ctx.beginPath();
            
            // Top arc (semi-circle)
            this.ctx.arc(x, y - radius/3, radius, Math.PI, 0, false);
            
            // Draw the wavy bottom of the ghost - extended to ensure complete shape
            const waveHeight = 4;
            const segments = 4;
            const width = radius * 2;
            const height = radius + 4; // Increased height to prevent cut-off
            
            this.ctx.lineTo(x + radius, y + height - waveHeight);
            
            // Draw waves at the bottom more carefully
            for (let i = 0; i < segments; i++) {
                const waveDirection = i % 2 === 0 ? -1 : 1;
                const waveX = x + radius - ((i + 1) / segments) * width;
                
                this.ctx.lineTo(
                    waveX,
                    y + height + waveDirection * waveHeight
                );
            }
            
            this.ctx.lineTo(x - radius, y - radius/3);
            this.ctx.fill();
            
            // Draw eyes in the adjusted position
            this.drawGhostEyes(x, y - 4, ghost.direction);
            
            this.ctx.restore();
        }
    }
    
    // Draw ghost eyes
    drawGhostEyes(x, y, direction) {
        const eyeRadius = 4;
        const pupilRadius = 2;
        const eyeOffset = 5;
        
        // White part of eyes
        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffset, y - 2, eyeRadius, 0, Math.PI * 2);
        this.ctx.arc(x + eyeOffset, y - 2, eyeRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Calculate pupil offset based on direction
        let pupilOffsetX = 0;
        let pupilOffsetY = 0;
        
        if (direction.x > 0) pupilOffsetX = 1;
        if (direction.x < 0) pupilOffsetX = -1;
        if (direction.y > 0) pupilOffsetY = 1;
        if (direction.y < 0) pupilOffsetY = -1;
        
        // Pupils
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffset + pupilOffsetX, y - 2 + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
        this.ctx.arc(x + eyeOffset + pupilOffsetX, y - 2 + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    // Move ghosts
    moveGhosts() {
        for (let i = 0; i < this.ghosts.length; i++) {
            const ghost = this.ghosts[i];
            
            // Handle ghosts exiting the house
            if (ghost.exitingHouse) {
                this.moveGhostOutOfHouse(ghost);
                continue;
            }
            
            // Move ghost based on current direction
            ghost.x += ghost.direction.x * ghost.speed;
            ghost.y += ghost.direction.y * ghost.speed;
            
            // Handle screen wrapping
            this.handleScreenWrapping(ghost);
            
            // Change direction at intersections
            if (this.isAtIntersection(ghost.x, ghost.y)) {
                this.decideGhostDirection(ghost);
            }
            
            // If ghost gets stuck, force a new direction
            if (this.isGhostStuck(ghost)) {
                const availableDirections = this.getAvailableDirections(
                    Math.floor(ghost.x / CELL_SIZE),
                    Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE)
                );
                
                if (availableDirections.length > 0) {
                    const newDir = availableDirections[Math.floor(Math.random() * availableDirections.length)];
                    ghost.direction = {...DIRECTIONS[newDir]};
                    
                    // Adjust position slightly to prevent getting stuck in walls
                    ghost.x = Math.floor(ghost.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
                    ghost.y = Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
                }
            }
        }
    }
    
    // Move ghost out of the ghost house
    moveGhostOutOfHouse(ghost) {
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
        // Then move to the exit position horizontally if needed
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
                ghost.direction = {...DIRECTIONS.LEFT}; // Start moving left
                console.log("Ghost exited house:", ghost.color);
            }
        }
    }
    
    // Check if ghost is stuck
    isGhostStuck(ghost) {
        // If ghost was already marked as stuck, decrement counter
        if (ghost.stuck > 0) {
            ghost.stuck--;
            return ghost.stuck === 0;
        }
        
        // Check if ghost is at a valid position but can't move in current direction
        const nextX = ghost.x + ghost.direction.x * ghost.speed;
        const nextY = ghost.y + ghost.direction.y * ghost.speed;
        
        const gridX = Math.floor(nextX / CELL_SIZE);
        const gridY = Math.floor((nextY - Y_OFFSET) / CELL_SIZE);
        
        // Check if next position is a wall
        if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            if (this.maze[gridY][gridX] === 1) {
                ghost.stuck = 3; // Set stuck counter
                return true;
            }
        }
        
        return false;
    }
    
    // Check if at an intersection
    isAtIntersection(x, y) {
        // Check if position is in the center of a cell
        const cellX = Math.floor(x / CELL_SIZE);
        const cellY = Math.floor((y - Y_OFFSET) / CELL_SIZE);
        const centerX = cellX * CELL_SIZE + CELL_SIZE / 2;
        const centerY = cellY * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET;
        
        const distance = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        
        // Must be near center of cell and at an intersection
        if (distance < 5) {
            const availableDirections = this.getAvailableDirections(cellX, cellY);
            return availableDirections.length > 2; // More than 2 possible ways to go
        }
        
        return false;
    }
    
    // Decide ghost direction
    decideGhostDirection(ghost) {
        const cellX = Math.floor(ghost.x / CELL_SIZE);
        const cellY = Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE);
        
        // Get available directions from current position
        const availableDirections = this.getAvailableDirections(cellX, cellY);
        
        // Filter out reverse direction (unless that's the only option)
        const nonReverseDirections = availableDirections.filter(dir => {
            const dirVector = DIRECTIONS[dir];
            return !(dirVector.x === -ghost.direction.x && dirVector.y === -ghost.direction.y);
        });
        
        const directions = nonReverseDirections.length > 0 ? nonReverseDirections : availableDirections;
        
        if (directions.length === 0) return; // No valid directions
        
        // Different behavior based on ghost vulnerability
        if (ghost.isVulnerable) {
            // Run away from Pacman
            this.chooseFleeingDirection(ghost, directions);
        } else {
            // Chase Pacman based on personality
            this.chooseChaseDirection(ghost, directions);
        }
    }
    
    // Choose direction to flee from Pacman
    chooseFleeingDirection(ghost, availableDirections) {
        // Get direction away from Pacman
        const dx = ghost.x - this.pacman.x;
        const dy = ghost.y - this.pacman.y;
        
        // Choose the direction that maximizes distance from Pacman
        let bestDirection = availableDirections[0];
        let bestDistance = -Infinity;
        
        for (const dir of availableDirections) {
            const dirVector = DIRECTIONS[dir];
            const newDistance = dirVector.x * dx + dirVector.y * dy; // Dot product
            
            // Add randomness to prevent predictable movement
            const randomFactor = Math.random() * 10;
            
            if (newDistance + randomFactor > bestDistance) {
                bestDistance = newDistance + randomFactor;
                bestDirection = dir;
            }
        }
        
        ghost.direction = {...DIRECTIONS[bestDirection]};
    }
    
    // Choose direction to chase Pacman
    chooseChaseDirection(ghost, availableDirections) {
        // Target position is ahead of Pacman based on personality
        const targetX = this.pacman.x + (this.pacman.direction.x * CELL_SIZE * ghost.personality.lookAhead);
        const targetY = this.pacman.y + (this.pacman.direction.y * CELL_SIZE * ghost.personality.lookAhead);
        
        // Choose the direction that minimizes distance to target
        let bestDirection = availableDirections[0];
        let bestDistance = Infinity;
        
        for (const dir of availableDirections) {
            const dirVector = DIRECTIONS[dir];
            const newX = ghost.x + dirVector.x * CELL_SIZE;
            const newY = ghost.y + dirVector.y * CELL_SIZE;
            
            const distance = Math.sqrt(
                Math.pow(newX - targetX, 2) + Math.pow(newY - targetY, 2)
            );
            
            // Add randomness based on ghost personality
            const randomFactor = Math.random() * ghost.personality.randomness * 100;
            
            // Apply directness - smaller distance is better but balanced by randomness
            const adjustedDistance = distance * (1 - ghost.personality.directness) + randomFactor;
            
            if (adjustedDistance < bestDistance) {
                bestDistance = adjustedDistance;
                bestDirection = dir;
            }
        }
        
        ghost.direction = {...DIRECTIONS[bestDirection]};
    }
    
    // Initialize Pacman
    initPacman() {
        // Use the centralized Pacman start position from constants.js
        console.log("Initializing AI Pacman at position:", PACMAN_START_POSITION.x, PACMAN_START_POSITION.y);
        
        this.pacman = {
            x: PACMAN_START_POSITION.x,
            y: PACMAN_START_POSITION.y,
            radius: CELL_SIZE / 2 - 2,
            speed: PACMAN_SPEED,
            direction: {...DIRECTIONS.RIGHT},
            nextDirection: {...DIRECTIONS.RIGHT}
        };
    }
    
    // Initialize ghosts
    initGhosts() {
        this.ghosts = [];
        
        // Create ghosts using the centralized configurations
        for (let i = 0; i < GHOST_CONFIGS.length; i++) {
            const config = GHOST_CONFIGS[i];
            
            // All ghosts start in the ghost house and are ready to exit
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
        
        console.log("AI Ghosts initialized:", this.ghosts.length);
    }
    
    // Set the AI parameters
    setAIParameters(params) {
        this.aiParameters = {...params};
        console.log("AI parameters set:", this.aiParameters);
    }
    
    // Set the generation and agent info
    setGeneration(generation, agent) {
        this.generationCount = generation;
        this.agentNumber = agent;
    }
    
    // Make an AI decision
    makeAIDecision() {
        if (!this.pacman || this.paused || this.gameOver) return;
        
        // Get current position
        const currentX = Math.floor(this.pacman.x / CELL_SIZE);
        const currentY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // Get available directions from current position
        const availableDirections = this.getAvailableDirections(currentX, currentY);
        
        // Check if Pacman has been in the same area for too long
        let isStuck = false;
        if (this.gameData.length > 60) {
            // Check the last 60 frames for movement diversity
            const positions = this.gameData.slice(-60).map(data => 
                `${Math.floor(data.position.x / CELL_SIZE)},${Math.floor((data.position.y - Y_OFFSET) / CELL_SIZE)}`
            );
            const uniquePositions = new Set(positions);
            
            // If Pacman has been in very few positions recently, consider it stuck
            if (uniquePositions.size < 6) {
                isStuck = true;
                console.log(`Pacman appears to be stuck in a loop (${uniquePositions.size} cells). Taking randomized action.`);
            }
        }
        
        // If we're near a cell center, consider changing direction
        if (this.isNearCellCenter(this.pacman.x, this.pacman.y) && availableDirections.length > 0) {
            // Filter out the reverse direction (unless it's the only option)
            const reversalDirection = this.getReverseDirection(this.pacman.direction);
            const forwardDirections = availableDirections.filter(dir => 
                dir !== this.getDirectionName(reversalDirection)
            );
            
            // Use forward directions if available, otherwise use all directions
            const directions = forwardDirections.length > 0 ? forwardDirections : availableDirections;
            
            // Score each available direction based on AI parameters
            const directionScores = this.scoreDirections(directions, currentX, currentY);
            
            // Add random noise to break out of loops if we detect we're stuck
            if (isStuck) {
                for (const dir in directionScores) {
                    // Add significant random noise to break pattern
                    directionScores[dir] += (Math.random() * 50) - 25;
                    
                    // If there's a direction we haven't taken recently, strongly favor it
                    if (this.hasntMovedInDirection(dir)) {
                        directionScores[dir] += 30; // Strong bias towards unexplored directions
                        console.log(`Adding bias towards unexplored direction: ${dir}`);
                    }
                }
            }
            
            // Get the best direction
            let bestDirection = this.getBestDirection(directionScores);
            
            // Set next direction
            this.pacman.nextDirection = {...DIRECTIONS[bestDirection]};
            
            // If Pacman is already at a center point, change direction immediately
            if (Math.abs(this.pacman.x - (currentX * CELL_SIZE + CELL_SIZE / 2)) < 2 &&
                Math.abs(this.pacman.y - (currentY * CELL_SIZE + CELL_SIZE / 2 + Y_OFFSET)) < 2) {
                this.pacman.direction = {...this.pacman.nextDirection};
                
                // Record the direction we took for anti-stuck measures
                this.recordDirectionTaken(bestDirection);
                
                // Log the decision
                console.log("AI decided to move:", bestDirection);
            }
        }
    }
    
    // Check if we haven't moved in a specific direction recently (to break out of loops)
    hasntMovedInDirection(direction) {
        if (!this.recentDirections) {
            this.recentDirections = [];
        }
        
        // If we have no recent history, consider it a direction we haven't taken
        if (this.recentDirections.length === 0) {
            return true;
        }
        
        // Check if this direction appears in recent history
        return !this.recentDirections.includes(direction);
    }
    
    // Record the direction taken for anti-stuck measures
    recordDirectionTaken(direction) {
        // Initialize if needed
        if (!this.recentDirections) {
            this.recentDirections = [];
        }
        
        // Add this direction to recent history
        this.recentDirections.push(direction);
        
        // Keep only the last 8 directions
        if (this.recentDirections.length > 8) {
            this.recentDirections.shift();
        }
    }
    
    // Score available directions for AI decision making
    scoreDirections(directions, currentX, currentY) {
        const scores = {};
        
        // For each direction, calculate a score
        for (const direction of directions) {
            // Convert direction string to vector
            const dirVector = DIRECTIONS[direction];
            
            // Get the next position
            const nextX = currentX + dirVector.x;
            const nextY = currentY + dirVector.y;
            
            // Start with a base score
            let score = 0;
            
            // Check valid position
            if (nextY >= 0 && nextY < ROWS && nextX >= 0 && nextX < COLS) {
                // Check for dots (REWARD: Strongly prioritize eating dots)
                if (this.maze[nextY][nextX] === 2) {
                    score += this.aiParameters.dotWeight * 3.0; // Further increased weight for dots
                }
                
                // Check for power pellets (REWARD: Very high value for power pellets)
                if (this.maze[nextY][nextX] === 3) {
                    score += this.aiParameters.powerPelletWeight * 2.0; // Further increased weight for power pellets
                }
                
                // Look ahead feature - check for dots and power pellets in nearby cells
                score = this.addLookAheadScore(nextX, nextY, direction, score);
                
                // Ghost avoidance with distance consideration
                score += this.evaluateGhostInteractions(nextX, nextY);
                
                // Add exploration incentive with advanced path analysis
                score += this.getEnhancedExplorationScore(direction, currentX, currentY);
                
                // Strongly encourage forward movement when nothing interesting nearby
                if (Math.abs(score) < 3) {
                    // Add more incentive to move forward when no better options
                    const pacmanDir = this.getDirectionName(this.pacman.direction);
                    if (direction === pacmanDir) {
                        score += 3;  // Higher value to maintain momentum
                    }
                }
                
                // Penalize reversals unless necessary (to prevent oscillation)
                const reversalDir = this.getDirectionName(this.getReverseDirection(this.pacman.direction));
                if (direction === reversalDir && directions.length > 1) {
                    score -= 5;
                }
            } else {
                // Invalid direction, give it a very low score
                score = -1000;
            }
            
            scores[direction] = score;
        }
        
        return scores;
    }
    
    // Add look-ahead scoring for dots and power pellets
    addLookAheadScore(startX, startY, initialDirection, score) {
        // Look ahead up to 3 cells in the current direction
        const dirVector = DIRECTIONS[initialDirection];
        let lookAheadX = startX;
        let lookAheadY = startY;
        
        for (let i = 1; i <= 3; i++) {
            lookAheadX += dirVector.x;
            lookAheadY += dirVector.y;
            
            // Check bounds
            if (lookAheadY < 0 || lookAheadY >= ROWS || lookAheadX < 0 || lookAheadX >= COLS) {
                break;
            }
            
            // Check for wall
            if (this.maze[lookAheadY][lookAheadX] === 1) {
                break;
            }
            
            // Check for dot with diminishing returns based on distance
            if (this.maze[lookAheadY][lookAheadX] === 2) {
                score += (this.aiParameters.dotWeight * (1.0 / i)) * 0.7;
            }
            
            // Check for power pellet with diminishing returns
            if (this.maze[lookAheadY][lookAheadX] === 3) {
                score += (this.aiParameters.powerPelletWeight * (1.2 / i)) * 0.8;
            }
        }
        
        return score;
    }
    
    // Evaluate ghost interactions considering distance, vulnerability, and power mode
    evaluateGhostInteractions(nextX, nextY) {
        let score = 0;
        let nearestGhostDistance = Infinity;
        let nearestVulnerableGhostDistance = Infinity;
        
        for (const ghost of this.ghosts) {
            // Skip ghosts in the house
            if (ghost.exitingHouse) continue;
            
            // Ghost position in grid
            const ghostX = Math.floor(ghost.x / CELL_SIZE);
            const ghostY = Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE);
            
            // Distance to this ghost
            const distance = Math.sqrt(
                Math.pow(nextX - ghostX, 2) + 
                Math.pow(nextY - ghostY, 2)
            );
            
            // Track nearest ghost
            if (distance < nearestGhostDistance && !ghost.isVulnerable) {
                nearestGhostDistance = distance;
            }
            
            // Track nearest vulnerable ghost
            if (distance < nearestVulnerableGhostDistance && ghost.isVulnerable) {
                nearestVulnerableGhostDistance = distance;
            }
            
            // Different behavior depending on ghost vulnerability
            if (ghost.isVulnerable) {
                // Chase vulnerable ghosts based on distance
                if (distance < 6) {
                    // More reward for closer vulnerable ghosts, but with safety check
                    score += this.aiParameters.vulnerableGhostWeight * (8 - distance) / Math.max(1, distance);
                }
            } else {
                // Avoid normal ghosts with exponential penalty and larger detection range
                if (distance < 6) {
                    // Critical danger zone - immediate danger
                    if (distance < 2) {
                        score += this.aiParameters.ghostWeight * 3; // Extreme danger
                    } else {
                        // Exponential penalty that gets worse as distance decreases
                        score += this.aiParameters.ghostWeight * Math.pow(6 - distance, 2.5) / Math.max(1, distance);
                    }
                }
            }
        }
        
        // Bonus for power mode strategy - chase ghosts when powered up
        if (this.powerMode && nearestVulnerableGhostDistance < Infinity) {
            // Extra incentive to chase vulnerable ghosts, especially when power time is running out
            const powerTimeBonus = (this.powerModeTime > 3000) ? 1.5 : 2.5;
            score += this.aiParameters.vulnerableGhostWeight * powerTimeBonus;
        }
        
        return score;
    }
    
    // Enhanced exploration score based on available paths and dot density
    getEnhancedExplorationScore(direction, currentX, currentY) {
        const dirVector = DIRECTIONS[direction];
        let score = 0;
        let nextX = currentX + dirVector.x;
        let nextY = currentY + dirVector.y;
        
        // Don't explore outside the maze
        if (nextY < 0 || nextY >= ROWS || nextX < 0 || nextX >= COLS) {
            return 0;
        }
        
        // If next cell is a wall, no exploration possible
        if (this.maze[nextY][nextX] === 1) {
            return 0;
        }
        
        // Check if we've been in this position recently - if so, reduce the score
        if (this.gameData.length > 30) {
            const recentPositions = this.gameData.slice(-30).map(data => 
                `${Math.floor(data.position.x / CELL_SIZE)},${Math.floor((data.position.y - Y_OFFSET) / CELL_SIZE)}`
            );
            
            const nextPosKey = `${nextX},${nextY}`;
            const visitCount = recentPositions.filter(pos => pos === nextPosKey).length;
            
            // Apply a penalty for revisiting the same cells
            if (visitCount > 3) {
                score -= visitCount * 2; // Increased penalty for repeatedly visiting the same cell
            }
        }
        
        // Breadth-first search to find the number of cells and dots that can be reached
        const visited = new Set();
        const queue = [[nextX, nextY, 1]]; // x, y, depth
        let dotCount = 0;
        let powerPelletCount = 0;
        
        while (queue.length > 0 && visited.size < 30) { // Expanded search radius
            const [x, y, depth] = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check if this cell has a dot or power pellet
            if (this.maze[y][x] === 2) {
                dotCount++;
                // Dots contribute more to score if they're closer
                score += (this.aiParameters.explorationWeight * 0.5) / depth;
            }
            
            if (this.maze[y][x] === 3) {
                powerPelletCount++;
                // Power pellets contribute significantly more
                score += (this.aiParameters.explorationWeight * 2) / depth;
            }
            
            // Add to exploration score (farther cells add less)
            score += this.aiParameters.explorationWeight / (depth * 2);
            
            // Check all four directions
            for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
                const v = DIRECTIONS[dir];
                const nx = x + v.x;
                const ny = y + v.y;
                
                // Skip if out of bounds
                if (ny < 0 || ny >= ROWS || nx < 0 || nx >= COLS) {
                    continue;
                }
                
                // Skip walls
                if (this.maze[ny][nx] === 1) {
                    continue;
                }
                
                // Add to queue if not visited
                if (!visited.has(`${nx},${ny}`)) {
                    queue.push([nx, ny, depth + 1]);
                }
            }
        }
        
        // Extra bonus for paths with more dots (encouraging efficient dot collection)
        if (dotCount > 0) {
            score += dotCount * 0.8; // Increased from 0.5
        }
        
        // Major bonus for directions leading to power pellets
        if (powerPelletCount > 0) {
            score += powerPelletCount * 5; // Increased from 3
        }
        
        // Bonus for paths with more open spaces (better maneuverability)
        score += Math.min(8, visited.size / 4); // Increased from 5
        
        return score;
    }
    
    // Get the best direction based on scores
    getBestDirection(scores) {
        let bestDirection = null;
        let bestScore = -Infinity;
        
        for (const direction in scores) {
            if (scores[direction] > bestScore) {
                bestScore = scores[direction];
                bestDirection = direction;
            }
        }
        
        return bestDirection;
    }
    
    // Get the reverse direction
    getReverseDirection(direction) {
        if (direction.x === 0 && direction.y === 0) return DIRECTIONS.NONE;
        return {
            x: -direction.x,
            y: -direction.y
        };
    }
    
    // Get name of a direction from vector
    getDirectionName(dirVector) {
        for (const [name, vector] of Object.entries(DIRECTIONS)) {
            if (vector.x === dirVector.x && vector.y === dirVector.y) {
                return name;
            }
        }
        return 'NONE';
    }
    
    // Get game data for evaluation
    getGameData() {
        return this.gameData;
    }
    
    // Calculate fitness based on game performance
    calculateFitness() {
        // Extract relevant game data
        const { dotsEaten, powerPelletsEaten, ghostsEaten, score } = this.gameData;
        const totalMovements = this.gameData.length;
        const totalTime = totalMovements / 60; // Approximate time in seconds
        
        // Calculate progress metrics
        const dotPercentage = dotsEaten / this.totalDots;
        
        // BASE REWARDS
        // 1. Dots eaten - primary objective
        const dotReward = dotsEaten * 20; // Increased reward per dot
        
        // 2. Power pellets - strategic items
        const powerPelletReward = powerPelletsEaten * 125; // Significant boost for power pellets
        
        // 3. Ghosts eaten - opportunistic points
        const ghostsEatenReward = ghostsEaten * 200; // Major reward for eating ghosts
        
        // ADVANCED METRICS
        // 4. Exploration bonus - reward for covering more of the maze
        let explorationBonus = 0;
        const uniquePositions = new Set();
        
        for (const data of this.gameData) {
            const posKey = `${data.pacmanX},${data.pacmanY}`;
            uniquePositions.add(posKey);
        }
        
        // Significant reward for exploring more of the maze
        explorationBonus = uniquePositions.size * 2;
        
        // 5. Efficiency factor - reward for doing more with fewer moves
        let efficiencyFactor = 1.0;
        
        if (totalMovements > 0) {
            // Reward high dot eating efficiency
            const dotsPerMove = dotsEaten / totalMovements;
            efficiencyFactor = 1.0 + (dotsPerMove * 50);
            
            // Extra efficiency bonus for eating a high percentage of dots
            if (dotPercentage > 0.5) {
                efficiencyFactor *= 1 + (dotPercentage - 0.5);
            }
        }
        
        // Calculate base fitness with the dot consumption as the primary metric
        let fitness = (dotReward + powerPelletReward + ghostsEatenReward + explorationBonus) 
                      * efficiencyFactor;
        
        // SURVIVAL TIME BONUS - reward for staying alive longer
        // But only if making progress with dots
        if (dotsEaten > 5) {
            const survivalBonus = Math.min(300, totalTime * 2);
            fitness += survivalBonus;
        }
        
        // PENALTIES
        // Movement penalty to discourage excessive wandering without eating dots
        const movementPenalty = totalMovements * 0.5;
        fitness -= movementPenalty;
        
        // PUNISHMENT: Major penalty if no dots were eaten
        if (dotsEaten === 0) {
            fitness = Math.max(5, fitness / 50); // Increased penalty for not eating dots
        }
        
        // PUNISHMENT: Penalty for extremely low progress
        if (dotPercentage < 0.15 && this.gameData.length > 120) {
            fitness *= 0.4; // Stronger penalty for time-wasting behavior
        }
        
        // PUNISHMENT: Penalty for getting stuck in patterns
        if (this.detectRepetitivePatterns()) {
            fitness *= 0.7; // Penalize repetitive movement patterns
        }
        
        // REWARD: Major bonus for winning (eating all dots)
        if (dotsEaten === this.totalDots) {
            fitness *= 20; // Massive bonus for winning
        }
        
        // REWARD: Progress-based bonus to create a smoother learning curve
        // This helps bridge the gap between no dots and winning
        if (dotsEaten > 0 && dotsEaten < this.totalDots) {
            // Progressive bonus that scales with completion percentage
            // Uses a cubic curve to create stronger incentive for higher completion
            const progressBonus = Math.pow(dotPercentage, 1.8) * 2000;
            fitness += progressBonus;
        }
        
        // REWARD: Ghost-eating efficiency bonus
        if (powerPelletsEaten > 0 && ghostsEaten > 0) {
            const ghostEfficiency = ghostsEaten / powerPelletsEaten;
            const ghostEfficiencyBonus = ghostEfficiency * 200;
            fitness += ghostEfficiencyBonus;
        }
        
        console.log(`Fitness breakdown: Dots=${dotReward.toFixed(1)}, PowerPellets=${powerPelletReward}, GhostsEaten=${ghostsEatenReward}, Exploration=${explorationBonus}, Efficiency=${efficiencyFactor.toFixed(2)}`);
        
        return Math.max(1, fitness);
    }
    
    // Detect if Pacman is stuck in repetitive movement patterns
    detectRepetitivePatterns() {
        // Not enough moves to detect patterns
        if (this.gameData.length < 20) return false;
        
        // Look at the last 20 positions
        const recentPositions = this.gameData.slice(-20).map(data => {
            return { x: data.pacmanX, y: data.pacmanY };
        });
        
        // Check for simple oscillation between positions
        let oscillationCount = 0;
        for (let i = 0; i < recentPositions.length - 2; i++) {
            const pos1 = recentPositions[i];
            const pos2 = recentPositions[i + 2];
            
            if (pos1.x === pos2.x && pos1.y === pos2.y) {
                oscillationCount++;
            }
        }
        
        // If more than 50% of moves are oscillating back and forth
        return oscillationCount > 8;
    }
    
    // Set the game speed (called from outside)
    setGameSpeed(speedFactor) {
        this.speedFactor = speedFactor;
        console.log(`AI Game speed set to ${speedFactor}x`);
    }
    
    // Set Q-learning parameters
    setQLearningParameters(params) {
        this.qTable = params.qTable;
        this.learningRate = params.learningRate;
        this.discountFactor = params.discountFactor;
        this.explorationRate = params.explorationRate;
    }
    
    // Encode the game state into a string representation
    getStateRepresentation() {
        if (!this.pacman) return null;
        
        // Get pacman's grid position
        const pacmanX = Math.floor(this.pacman.x / CELL_SIZE);
        const pacmanY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // Get pacman's current direction
        const pacmanDir = this.getDirectionName(this.pacman.direction);
        
        // Create a relative ghost position encoding (simpler state space)
        const ghostPositions = [];
        for (const ghost of this.ghosts) {
            if (ghost.exitingHouse) continue; // Skip ghosts in the house
            
            const ghostX = Math.floor(ghost.x / CELL_SIZE);
            const ghostY = Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE);
            
            // Calculate ghost quadrant relative to Pacman (NE, NW, SE, SW)
            // This reduces state space compared to exact positions
            const quadrantX = ghostX >= pacmanX ? 'E' : 'W';
            const quadrantY = ghostY >= pacmanY ? 'S' : 'N';
            
            // Calculate Manhattan distance
            const distance = Math.abs(ghostX - pacmanX) + Math.abs(ghostY - pacmanY);
            
            // Simplify distance into zones: 'near' (<=3), 'medium' (<=8), 'far' (>8)
            let distanceZone = 'far';
            if (distance <= 3) distanceZone = 'near';
            else if (distance <= 8) distanceZone = 'medium';
            
            // Add vulnerability information
            const vulnerability = ghost.isVulnerable ? 'V' : 'N';
            
            ghostPositions.push(`${quadrantY}${quadrantX}-${distanceZone}-${vulnerability}`);
        }
        
        // Check for dots or power pellets in adjacent cells
        const adjacentCells = {};
        for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
            const dirVector = DIRECTIONS[dir];
            const checkX = pacmanX + dirVector.x;
            const checkY = pacmanY + dirVector.y;
            
            // Skip if out of bounds
            if (checkY < 0 || checkY >= ROWS || checkX < 0 || checkX >= COLS) {
                adjacentCells[dir] = 'W'; // Wall
                continue;
            }
            
            // Check cell content
            switch (this.maze[checkY][checkX]) {
                case 0: adjacentCells[dir] = 'E'; break; // Empty
                case 1: adjacentCells[dir] = 'W'; break; // Wall
                case 2: adjacentCells[dir] = 'D'; break; // Dot
                case 3: adjacentCells[dir] = 'P'; break; // Power pellet
                default: adjacentCells[dir] = 'E'; // Default empty
            }
        }
        
        // Combine information into a state representation
        // Format: direction-UP-RIGHT-DOWN-LEFT-ghost1-ghost2...
        const stateKey = `${pacmanDir}-${adjacentCells.UP}${adjacentCells.RIGHT}${adjacentCells.DOWN}${adjacentCells.LEFT}-${ghostPositions.join('_')}`;
        
        return stateKey;
    }
    
    // Select an action using Q-learning (epsilon-greedy policy)
    selectAction(stateKey) {
        // Get available directions from current position
        const pacmanX = Math.floor(this.pacman.x / CELL_SIZE);
        const pacmanY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        const availableDirections = this.getAvailableDirections(pacmanX, pacmanY);
        
        // Initialize Q-values for this state if not yet in the table
        if (!this.qTable[stateKey]) {
            this.qTable[stateKey] = {};
            for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
                this.qTable[stateKey][dir] = 0;
            }
        }
        
        // Filter to only include valid directions
        const validDirections = availableDirections.filter(dir => 
            this.isValidDirection(dir, pacmanX, pacmanY)
        );
        
        // If no valid directions, return null
        if (validDirections.length === 0) {
            return null;
        }
        
        // Epsilon-greedy selection
        if (Math.random() < this.explorationRate) {
            // Exploration: choose a random valid direction
            const randomIndex = Math.floor(Math.random() * validDirections.length);
            return validDirections[randomIndex];
        } else {
            // Exploitation: choose best Q-value among valid directions
            let bestDirection = validDirections[0];
            let bestQValue = this.qTable[stateKey][bestDirection] || 0;
            
            for (const dir of validDirections) {
                const qValue = this.qTable[stateKey][dir] || 0;
                if (qValue > bestQValue) {
                    bestQValue = qValue;
                    bestDirection = dir;
                }
            }
            
            return bestDirection;
        }
    }
    
    // Check if a direction is valid at the current position
    isValidDirection(direction, x, y) {
        const dirVector = DIRECTIONS[direction];
        const nextX = x + dirVector.x;
        const nextY = y + dirVector.y;
        
        // Check if out of bounds
        if (nextY < 0 || nextY >= ROWS || nextX < 0 || nextX >= COLS) {
            return false;
        }
        
        // Check if a wall
        if (this.maze[nextY][nextX] === 1) {
            return false;
        }
        
        return true;
    }
    
    // Learn from the experience (Q-learning update rule)
    learnFromExperience(state, action, reward) {
        // Get current state representation
        const currentState = this.getStateRepresentation();
        
        // If game is over or we couldn't get current state, use terminal update
        if (this.gameOver || !currentState) {
            // Terminal state update (no future reward)
            if (this.qTable[state] && this.qTable[state][action] !== undefined) {
                const oldQValue = this.qTable[state][action];
                const newQValue = oldQValue + this.learningRate * (reward - oldQValue);
                this.qTable[state][action] = newQValue;
            }
            return;
        }
        
        // Get max future Q-value from current state
        let maxFutureQValue = 0;
        if (this.qTable[currentState]) {
            maxFutureQValue = Math.max(
                ...Object.values(this.qTable[currentState])
            );
        }
        
        // Q-learning update formula: Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
        if (this.qTable[state] && this.qTable[state][action] !== undefined) {
            const oldQValue = this.qTable[state][action];
            const temporalDifference = reward + (this.discountFactor * maxFutureQValue) - oldQValue;
            const newQValue = oldQValue + (this.learningRate * temporalDifference);
            this.qTable[state][action] = newQValue;
        }
    }
    
    // Make a decision using Q-learning algorithm
    makeQLearningDecision() {
        // Get current state
        const stateKey = this.getStateRepresentation();
        if (!stateKey) return null;
        
        // Select action using the Q-table
        const action = this.selectAction(stateKey);
        
        // If we have a valid action, and we're in a state we can learn from
        if (action && this.lastState && this.lastAction) {
            // Calculate reward based on game events
            let reward = 0;
            
            // Reward for eating dots (strong positive reward)
            if (this.justAteDot) {
                reward += 10;
                
                // Extra reward for eating dots efficiently (multiple dots in succession)
                if (this.consecutiveDotsEaten > 1) {
                    reward += Math.min(20, this.consecutiveDotsEaten * 2);
                }
            } else {
                // Small penalty for not eating dots (encourages seeking food)
                reward -= 0.2;
                
                // Check if stuck in repetitive patterns
                const pacmanX = Math.floor(this.pacman.x / CELL_SIZE);
                const pacmanY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
                const posKey = `${pacmanX},${pacmanY}`;
                
                if (this.pacmanPositionHistory && this.pacmanPositionHistory.includes(posKey)) {
                    // Penalty for revisiting the same position too frequently
                    reward -= 1.0;
                }
                
                // Update position history (last 10 positions)
                if (!this.pacmanPositionHistory) {
                    this.pacmanPositionHistory = [];
                }
                this.pacmanPositionHistory.push(posKey);
                if (this.pacmanPositionHistory.length > 10) {
                    this.pacmanPositionHistory.shift();
                }
            }
            
            // Major reward for eating power pellets (strategic advantage)
            if (this.justAtePowerPellet) {
                reward += 25;
            }
            
            // Significant reward for eating vulnerable ghosts
            if (this.justAteGhost) {
                reward += 50;
                this.justAteGhost = false;
            }
            
            // Reward for being near powerup when ghosts are nearby
            if (this.isNearPowerPellet && this.isGhostNearby) {
                reward += 5; // Encourage strategic powerup collection
            }
            
            // Major penalty for getting caught by a ghost
            if (this.ghostCollision && !this.ghostEaten) {
                reward -= 100;
            }
            
            // Reward for winning the game
            if (this.dotsRemaining === 0) {
                reward += 200;
            }
            
            // Reward for staying alive
            reward += 0.1;
            
            // Apply Q-learning update
            this.learnFromExperience(this.lastState, this.lastAction, reward);
        }
        
        // Store current state and action for next learning update
        this.lastState = stateKey;
        this.lastAction = action;
        
        // Reset flags after processing
        this.justAteDot = false;
        this.justAtePowerPellet = false;
        this.ghostCollision = false;
        this.ghostEaten = false;
        
        return action;
    }
    
    // Enhance the state representation to better capture game state
    getStateRepresentation() {
        if (!this.pacman) return null;
        
        // Get pacman's grid position
        const pacmanX = Math.floor(this.pacman.x / CELL_SIZE);
        const pacmanY = Math.floor((this.pacman.y - Y_OFFSET) / CELL_SIZE);
        
        // Get pacman's current direction
        const pacmanDir = this.getDirectionName(this.pacman.direction);
        
        // Find closest dots in each direction
        const dotDistances = this.findClosestDots(pacmanX, pacmanY);
        
        // Find closest vulnerable and normal ghosts
        const ghostInfo = this.findClosestGhosts(pacmanX, pacmanY);
        
        // Combine all information into a compact state representation
        // Format: direction-dotUp-dotRight-dotDown-dotLeft-closestNormalGhost-closestVulnerableGhost
        const stateKey = `${pacmanDir}-${dotDistances.join('')}-${ghostInfo.normal}-${ghostInfo.vulnerable}`;
        
        return stateKey;
    }
    
    // Find closest dots in each direction (up, right, down, left)
    findClosestDots(pacmanX, pacmanY) {
        const directions = [
            {dx: 0, dy: -1, name: 'up'},    // Up
            {dx: 1, dy: 0, name: 'right'},  // Right
            {dx: 0, dy: 1, name: 'down'},   // Down
            {dx: -1, dy: 0, name: 'left'}   // Left
        ];
        
        const results = [];
        
        // Check each direction
        for (const dir of directions) {
            let distance = 'X'; // X means no dot found or wall
            
            // Search up to 5 cells in each direction
            for (let step = 1; step <= 5; step++) {
                const checkX = pacmanX + (dir.dx * step);
                const checkY = pacmanY + (dir.dy * step);
                
                // Check if out of bounds
                if (checkY < 0 || checkY >= ROWS || checkX < 0 || checkX >= COLS) {
                    break;
                }
                
                // Check if we hit a wall
                if (this.maze[checkY][checkX] === 1) {
                    break;
                }
                
                // Check if we found a dot
                if (this.maze[checkY][checkX] === 2) {
                    distance = step.toString();
                    break;
                }
                
                // Check if we found a power pellet (treat as special case)
                if (this.maze[checkY][checkX] === 3) {
                    distance = 'P' + step.toString(); // P for power pellet
                    break;
                }
            }
            
            results.push(distance);
        }
        
        return results;
    }
    
    // Find closest normal and vulnerable ghosts
    findClosestGhosts(pacmanX, pacmanY) {
        let closestNormalDistance = Infinity;
        let closestVulnerableDistance = Infinity;
        let closestNormalDirection = 'X';
        let closestVulnerableDirection = 'X';
        
        for (const ghost of this.ghosts) {
            if (ghost.isDead) continue;
            
            const ghostX = Math.floor(ghost.x / CELL_SIZE);
            const ghostY = Math.floor((ghost.y - Y_OFFSET) / CELL_SIZE);
            
            // Calculate Manhattan distance
            const distance = Math.abs(ghostX - pacmanX) + Math.abs(ghostY - pacmanY);
            
            // Calculate approximate direction
            let direction = 'X';
            if (Math.abs(ghostX - pacmanX) > Math.abs(ghostY - pacmanY)) {
                direction = ghostX > pacmanX ? 'R' : 'L';
            } else {
                direction = ghostY > pacmanY ? 'D' : 'U';
            }
            
            // Update closest distances based on vulnerability
            if (ghost.isVulnerable) {
                if (distance < closestVulnerableDistance) {
                    closestVulnerableDistance = distance;
                    closestVulnerableDirection = direction + (distance <= 10 ? distance : 'F');
                    
                    // Update flag for reward calculation
                    this.isGhostNearby = distance <= 5;
                }
            } else {
                if (distance < closestNormalDistance) {
                    closestNormalDistance = distance;
                    closestNormalDirection = direction + (distance <= 10 ? distance : 'F');
                    
                    // Update flag for reward calculation
                    this.isGhostNearby = distance <= 5;
                }
            }
        }
        
        return {
            normal: closestNormalDirection,
            vulnerable: closestVulnerableDirection
        };
    }
    
    // Check if pacman is near a power pellet
    isNearPowerPellet(pacmanX, pacmanY) {
        // Search in a 3x3 grid around Pacman
        for (let y = -3; y <= 3; y++) {
            for (let x = -3; x <= 3; x++) {
                const checkX = pacmanX + x;
                const checkY = pacmanY + y;
                
                // Skip if out of bounds
                if (checkY < 0 || checkY >= ROWS || checkX < 0 || checkX >= COLS) {
                    continue;
                }
                
                // Check if cell contains a power pellet
                if (this.maze[checkY][checkX] === 3) {
                    this.isNearPowerPellet = true;
                    return;
                }
            }
        }
        
        this.isNearPowerPellet = false;
    }

    // Check collision between two entities (pacman and ghost)
    checkCollision(entity1, entity2) {
        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(entity1.x - entity2.x, 2) + 
            Math.pow(entity1.y - entity2.y, 2)
        );
        
        // Collision threshold (sum of radii)
        const collisionThreshold = entity1.radius + (CELL_SIZE / 2 - 4);
        
        // Return true if collision detected
        return distance < collisionThreshold;
    }

    // When Pacman eats a ghost
    eatGhost(ghost) {
        // Add points
        this.score += GHOST_POINTS;
        this.ghostsEaten++;
        this.updateScore();
        
        // Reset ghost to the ghost house
        ghost.x = GHOST_HOUSE.exitX;
        ghost.y = GHOST_HOUSE.exitY;
        ghost.exitingHouse = true;
        ghost.isVulnerable = false;
        
        console.log("Ghost eaten! Total eaten: " + this.ghostsEaten);
    }

    // Display game over message
    displayGameOver(message) {
        this.gameOver = true;
        this.drawGameMessage(message, "#FF0000");
    }
}

// Export the class
window.AIGame = AIGame; 