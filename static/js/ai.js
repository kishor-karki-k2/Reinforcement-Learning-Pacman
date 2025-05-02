/**
 * Pacman AI using Reinforcement Learning (Q-learning)
 * The AI learns from player gameplay and then applies the learned strategies
 */

class PacmanAI {
    constructor() {
        this.qTable = {};
        this.learningRate = 0.1;
        this.discountFactor = 0.9;
        this.explorationRate = 0.2;
        this.trainingData = [];
        this.currentGame = null;
        this.generation = 0;
        this.learningProgress = 0;
    }
    
    /**
     * Initialize a new game for the AI
     * @param {string} canvasId - Canvas element ID
     * @returns {PacmanGame} - The initialized game instance
     */
    initGame(canvasId) {
        this.currentGame = new PacmanGame(canvasId, true);
        return this.currentGame;
    }
    
    /**
     * Start the AI game
     */
    start() {
        if (!this.currentGame) return;
        
        // Start the game
        this.currentGame.start();
        
        // Set up the AI decision-making process
        this.runAI();
        
        console.log("AI game started");
    }
    
    /**
     * Reset the AI game
     */
    reset() {
        if (this.currentGame) {
            this.currentGame.reset();
        }
        
        // Reset learning progress display
        this.updateProgressDisplay();
    }
    
    /**
     * Train the AI from player gameplay data
     * @param {PacmanGame} playerGame - The player's game instance
     */
    trainFromPlayerData(playerGame) {
        // Get player game data
        const playerData = playerGame.getGameData();
        
        if (!playerData || playerData.length < 10) {
            console.warn("Not enough player data to train AI");
            return;
        }
        
        console.log(`Training AI with ${playerData.length} data points from player`);
        
        // Extract training examples from player data
        this.trainingData = this.processPlayerData(playerData);
        
        // Train Q-learning model
        this.trainQTable();
        
        // Update UI
        this.generation = 1;
        this.learningProgress = 100;
        this.updateProgressDisplay();
        
        console.log("AI training complete");
    }
    
    /**
     * Process player data into training examples
     * @param {Array} playerData - Raw player gameplay data
     * @returns {Array} - Processed training examples
     */
    processPlayerData(playerData) {
        const examples = [];
        
        // Skip the last entry as we need the next state for Q-learning
        for (let i = 0; i < playerData.length - 1; i++) {
            const currentState = playerData[i];
            const nextState = playerData[i + 1];
            
            // Extract the state features
            const state = this.extractStateFeatures(currentState);
            
            // Extract the action (direction) that was taken
            let action = this.getActionFromStates(currentState, nextState);
            
            // Calculate reward
            const reward = this.calculateReward(currentState, nextState);
            
            // Extract next state features
            const nextStateFeatures = this.extractStateFeatures(nextState);
            
            // Add to training examples
            examples.push({
                state,
                action,
                reward,
                nextState: nextStateFeatures,
                isDone: nextState.gameOver || nextState.gameWon
            });
        }
        
        return examples;
    }
    
    /**
     * Extract state features for Q-learning
     * @param {Object} state - Game state
     * @returns {Object} - Extracted features
     */
    extractStateFeatures(state) {
        // Simplified state representation
        const pacmanPos = state.position;
        
        // Determine pacman's grid position
        const gridX = Math.floor(pacmanPos.x / CELL_SIZE);
        const gridY = Math.floor((pacmanPos.y - 10) / CELL_SIZE);
        
        // Find nearest ghost and its direction
        let nearestGhostDist = Infinity;
        let nearestGhostDir = { x: 0, y: 0 };
        
        state.ghosts.forEach(ghost => {
            const dist = Math.sqrt(
                Math.pow(ghost.x - pacmanPos.x, 2) + 
                Math.pow(ghost.y - pacmanPos.y, 2)
            );
            
            if (dist < nearestGhostDist) {
                nearestGhostDist = dist;
                nearestGhostDir = {
                    x: Math.sign(ghost.x - pacmanPos.x),
                    y: Math.sign(ghost.y - pacmanPos.y)
                };
            }
        });
        
        // Normalize distance to cells
        nearestGhostDist = Math.floor(nearestGhostDist / CELL_SIZE);
        
        return {
            gridX,
            gridY,
            direction: state.direction,
            ghostDistance: nearestGhostDist,
            ghostDirection: nearestGhostDir,
            powerMode: state.powerMode
        };
    }
    
    /**
     * Determine action from state changes
     * @param {Object} currentState - Current game state
     * @param {Object} nextState - Next game state
     * @returns {Object} - Direction object (action)
     */
    getActionFromStates(currentState, nextState) {
        const currPos = currentState.position;
        const nextPos = nextState.position;
        
        // Calculate direction vector
        const dx = nextPos.x - currPos.x;
        const dy = nextPos.y - currPos.y;
        
        // Convert to unit direction
        let action = { x: 0, y: 0 };
        
        if (Math.abs(dx) > Math.abs(dy)) {
            action.x = Math.sign(dx);
        } else {
            action.y = Math.sign(dy);
        }
        
        // Map to DIRECTIONS constants
        if (action.x === 1) return DIRECTIONS.RIGHT;
        if (action.x === -1) return DIRECTIONS.LEFT;
        if (action.y === 1) return DIRECTIONS.DOWN;
        if (action.y === -1) return DIRECTIONS.UP;
        
        return currentState.direction;
    }
    
    /**
     * Calculate reward for Q-learning
     * @param {Object} currentState - Current game state
     * @param {Object} nextState - Next game state
     * @returns {number} - Calculated reward
     */
    calculateReward(currentState, nextState) {
        let reward = 0;
        
        // Reward for eating dots
        if (nextState.score > currentState.score) {
            reward += (nextState.score - currentState.score) / 10;
        }
        
        // Large penalty for dying
        if (!currentState.gameOver && nextState.gameOver && !nextState.gameWon) {
            reward -= 100;
        }
        
        // Huge reward for winning
        if (nextState.gameWon) {
            reward += 500;
        }
        
        // Small reward for staying alive
        reward += 0.1;
        
        return reward;
    }
    
    /**
     * Train the Q-table using the collected data
     */
    trainQTable() {
        if (this.trainingData.length === 0) return;
        
        // Perform Q-learning updates
        for (let i = 0; i < 10; i++) { // Multiple passes for better learning
            for (const example of this.trainingData) {
                const { state, action, reward, nextState, isDone } = example;
                
                // Get state key
                const stateKey = this.getStateKey(state);
                
                // Get action key
                const actionKey = this.getActionKey(action);
                
                // Initialize state in Q-table if not exists
                if (!this.qTable[stateKey]) {
                    this.qTable[stateKey] = {
                        [this.getActionKey(DIRECTIONS.UP)]: 0,
                        [this.getActionKey(DIRECTIONS.DOWN)]: 0,
                        [this.getActionKey(DIRECTIONS.LEFT)]: 0,
                        [this.getActionKey(DIRECTIONS.RIGHT)]: 0
                    };
                }
                
                // Get current Q-value
                const currentQ = this.qTable[stateKey][actionKey] || 0;
                
                // Calculate the next max Q-value
                let nextMaxQ = 0;
                if (!isDone) {
                    const nextStateKey = this.getStateKey(nextState);
                    
                    // Initialize next state in Q-table if not exists
                    if (!this.qTable[nextStateKey]) {
                        this.qTable[nextStateKey] = {
                            [this.getActionKey(DIRECTIONS.UP)]: 0,
                            [this.getActionKey(DIRECTIONS.DOWN)]: 0,
                            [this.getActionKey(DIRECTIONS.LEFT)]: 0,
                            [this.getActionKey(DIRECTIONS.RIGHT)]: 0
                        };
                    }
                    
                    // Find max Q-value in next state
                    nextMaxQ = Math.max(
                        ...Object.values(this.qTable[nextStateKey])
                    );
                }
                
                // Update Q-value using Q-learning formula
                const newQ = currentQ + this.learningRate * (
                    reward + this.discountFactor * nextMaxQ - currentQ
                );
                
                // Update Q-table
                this.qTable[stateKey][actionKey] = newQ;
            }
        }
        
        console.log(`Q-table has ${Object.keys(this.qTable).length} states`);
    }
    
    /**
     * Get a unique key for a state
     * @param {Object} state - Game state
     * @returns {string} - Unique key
     */
    getStateKey(state) {
        // Simplify ghost distance to nearby/medium/far
        let ghostDistClass = 'far';
        if (state.ghostDistance < 3) ghostDistClass = 'nearby';
        else if (state.ghostDistance < 8) ghostDistClass = 'medium';
        
        // Create a unique key
        return `${state.gridX},${state.gridY},${ghostDistClass},${state.powerMode ? 1 : 0}`;
    }
    
    /**
     * Get a unique key for an action
     * @param {Object} action - Direction object
     * @returns {string} - Unique key
     */
    getActionKey(action) {
        if (action.x === 1) return 'right';
        if (action.x === -1) return 'left';
        if (action.y === 1) return 'down';
        if (action.y === -1) return 'up';
        return 'none';
    }
    
    /**
     * Run the AI decision-making process
     */
    runAI() {
        if (!this.currentGame || this.currentGame.gameOver) return;
        
        // Make a decision and apply it
        const direction = this.makeDecision();
        this.currentGame.makeAIMove(direction);
        
        // Schedule next decision
        setTimeout(() => this.runAI(), 100);
    }
    
    /**
     * Make a decision for the next move
     * @returns {Object} - Direction to move
     */
    makeDecision() {
        if (!this.currentGame || !this.currentGame.pacman || !this.currentGame.ghosts) {
            return DIRECTIONS.RIGHT;
        }
        
        // Extract current state
        const currentState = this.extractStateFeatures({
            position: this.currentGame.pacman,
            direction: this.currentGame.currentDirection,
            ghosts: this.currentGame.ghosts,
            score: this.currentGame.score,
            powerMode: this.currentGame.powerMode,
            gameOver: this.currentGame.gameOver,
            gameWon: this.currentGame.gameWon
        });
        
        // Get state key
        const stateKey = this.getStateKey(currentState);
        
        // Exploration vs. exploitation
        if (Math.random() < this.explorationRate) {
            // Explore - choose random action
            const directions = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
            const validDirections = directions.filter(dir => 
                !this.currentGame.isWall(
                    this.currentGame.pacman.x + dir.x * CELL_SIZE / 2,
                    this.currentGame.pacman.y + dir.y * CELL_SIZE / 2
                )
            );
            
            if (validDirections.length > 0) {
                return validDirections[Math.floor(Math.random() * validDirections.length)];
            }
            return this.currentGame.currentDirection;
        }
        
        // Exploit - choose best action from Q-table
        if (this.qTable[stateKey]) {
            // Find action with highest Q-value
            let bestAction = null;
            let bestValue = -Infinity;
            
            // Check all directions
            for (const [actionKey, qValue] of Object.entries(this.qTable[stateKey])) {
                // Skip invalid moves
                const dir = this.getDirectionFromKey(actionKey);
                if (this.currentGame.isWall(
                    this.currentGame.pacman.x + dir.x * CELL_SIZE / 2,
                    this.currentGame.pacman.y + dir.y * CELL_SIZE / 2
                )) {
                    continue;
                }
                
                if (qValue > bestValue) {
                    bestValue = qValue;
                    bestAction = actionKey;
                }
            }
            
            if (bestAction) {
                return this.getDirectionFromKey(bestAction);
            }
        }
        
        // Default behavior if no valid learned action
        return this.getDefaultMove();
    }
    
    /**
     * Get direction object from action key
     * @param {string} actionKey - Action key
     * @returns {Object} - Direction object
     */
    getDirectionFromKey(actionKey) {
        switch (actionKey) {
            case 'up': return DIRECTIONS.UP;
            case 'down': return DIRECTIONS.DOWN;
            case 'left': return DIRECTIONS.LEFT;
            case 'right': return DIRECTIONS.RIGHT;
            default: return DIRECTIONS.RIGHT;
        }
    }
    
    /**
     * Fallback default move logic (simple heuristic)
     * @returns {Object} - Direction to move
     */
    getDefaultMove() {
        if (!this.currentGame || !this.currentGame.pacman) {
            return DIRECTIONS.RIGHT;
        }
        
        const pacman = this.currentGame.pacman;
        
        // Find nearest dot
        let nearestDotX = -1;
        let nearestDotY = -1;
        let nearestDotDist = Infinity;
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (this.currentGame.maze[row][col] === 2 || this.currentGame.maze[row][col] === 3) {
                    const dotX = col * CELL_SIZE + CELL_SIZE / 2;
                    const dotY = row * CELL_SIZE + CELL_SIZE / 2 + 10;
                    
                    const dist = Math.sqrt(
                        Math.pow(dotX - pacman.x, 2) + 
                        Math.pow(dotY - pacman.y, 2)
                    );
                    
                    if (dist < nearestDotDist) {
                        nearestDotDist = dist;
                        nearestDotX = dotX;
                        nearestDotY = dotY;
                    }
                }
            }
        }
        
        // If found a dot, move towards it
        if (nearestDotX >= 0 && nearestDotY >= 0) {
            // Choose direction with highest component towards dot
            const dx = nearestDotX - pacman.x;
            const dy = nearestDotY - pacman.y;
            
            const possibleDirections = [];
            
            // Check if we can move horizontally
            if (Math.abs(dx) > 1) {
                const dir = dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
                if (!this.currentGame.isWall(
                    pacman.x + dir.x * CELL_SIZE / 2,
                    pacman.y + dir.y * CELL_SIZE / 2
                )) {
                    possibleDirections.push({ dir, priority: Math.abs(dx) });
                }
            }
            
            // Check if we can move vertically
            if (Math.abs(dy) > 1) {
                const dir = dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
                if (!this.currentGame.isWall(
                    pacman.x + dir.x * CELL_SIZE / 2,
                    pacman.y + dir.y * CELL_SIZE / 2
                )) {
                    possibleDirections.push({ dir, priority: Math.abs(dy) });
                }
            }
            
            // Choose direction with highest priority
            if (possibleDirections.length > 0) {
                possibleDirections.sort((a, b) => b.priority - a.priority);
                return possibleDirections[0].dir;
            }
        }
        
        // If we can't move towards a dot, try random valid direction
        const directions = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
        const validDirections = directions.filter(dir => 
            !this.currentGame.isWall(
                pacman.x + dir.x * CELL_SIZE / 2,
                pacman.y + dir.y * CELL_SIZE / 2
            )
        );
        
        if (validDirections.length > 0) {
            return validDirections[Math.floor(Math.random() * validDirections.length)];
        }
        
        // Default to current direction if nothing else works
        return this.currentGame.currentDirection;
    }
    
    /**
     * Update the learning progress display
     */
    updateProgressDisplay() {
        // Update generation counter
        const genElement = document.getElementById('ai-generation');
        if (genElement) {
            genElement.textContent = this.generation;
        }
        
        // Update learning progress
        const learningElement = document.getElementById('ai-learning');
        if (learningElement) {
            learningElement.textContent = Math.round(this.learningProgress);
        }
    }
}

// Make the class available globally
window.PacmanAI = PacmanAI; 