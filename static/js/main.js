/**
 * Main.js - Entry point for Pacman game
 * Handles initialization of both manual and AI gameplay
 */

// Game instances
let manualGame = null;
let aiGame = null;

// Player information
let playerName = null;
let playerClass = null;

// Evolution parameters
const GENERATION_SIZE = 20;
const MUTATION_RATE = 0.4;         // Increased from 0.3 for more exploration
const ELITE_PERCENTAGE = 0.2;      // Decreased to focus on the very best performers
const MAX_GENERATIONS = 200;
const PARAMETER_RANGE = {
    dotWeight: { min: 10, max: 65 },         // Increased to value dots more highly
    powerPelletWeight: { min: 40, max: 120 }, // Significantly increased power pellet importance
    ghostWeight: { min: -100, max: -30 },     // Stronger ghost avoidance
    vulnerableGhostWeight: { min: 30, max: 80 }, // Greater reward for eating vulnerable ghosts
    explorationWeight: { min: 2, max: 15 }    // Increased exploration to find dots more efficiently
};

// Evolution state
let generation = 1;
let currentAgent = 0;
let agents = [];
let bestAgents = [];
let evolutionInProgress = false;

// Q-learning variables
let qTable = {}; // State-action pairs and Q-values
let currentState = null;
let currentAction = null;
let learningRate = 0.1; // Alpha - how much to update Q-values
let discountFactor = 0.9; // Gamma - importance of future rewards
let explorationRate = 0.3; // Epsilon - exploration vs exploitation
let maxExplorationRate = 0.3;
let minExplorationRate = 0.01;
let cumulativeReward = 0;
let totalEpisodes = 0; // Track total episodes

// Track Q-learning data for visualization
let episodeRewards = [];
let episodeScores = [];
let episodeQTableSizes = [];
let episodeExplorationRates = [];
let learningChart = null;

// Create ghost SVG image data URLs
function createGhostImages() {
    // Generate data URLs for each ghost color
    const ghostColors = {
        'red': '#FF0000',
        'pink': '#FFB8FF',
        'blue': '#00FFFF',
        'orange': '#FFB852',
        'vulnerable': '#2121FF'
    };
    
    // Base ghost SVG template
    const ghostSVG = (color) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50">
        <path d="M 25 2 C 15.5 2 8 9.5 8 19 L 8 27.3125 C 8 28.9125 8.5 30.3 9.5 31.5 L 12.6875 35.5 C 13.3875 36.4 13.3125 38.0125 12.3125 38.8125 L 6.6875 43.1875 C 5.7875 43.9875 5.7 45.5125 6.5 46.3125 C 7.2 47.0125 8.7125 47.0875 9.8125 46.1875 L 16.5 41.3125 C 18.1 40.0125 20.3 40.5125 21.5 42.3125 L 23.8125 46.5 C 24.4125 47.8 26.6 47.8 27.1 46.5 L 29.5 42.3125 C 30.7 40.5125 32.9 40.0125 34.5 41.3125 L 41.1875 46.1875 C 42.2875 47.0875 43.8 47.0125 44.5 46.3125 C 45.3 45.5125 45.2125 43.9875 44.3125 43.1875 L 38.6875 38.8125 C 37.7875 38.0125 37.7125 36.4 38.3125 35.5 L 41.5 31.5 C 42.5 30.3 43 28.9125 43 27.3125 L 43 19 C 43 9.5 35.5 2 26 2 L 25 2 z" fill="${color}"/>
        <circle cx="17" cy="19" r="5" fill="white"/>
        <circle cx="17" cy="19" r="2" fill="black"/>
        <circle cx="33" cy="19" r="5" fill="white"/>
        <circle cx="33" cy="19" r="2" fill="black"/>
    </svg>`;
    
    // Convert SVGs to data URLs
    for (const [name, color] of Object.entries(ghostColors)) {
        const svg = ghostSVG(color);
        const dataURL = 'data:image/svg+xml;base64,' + btoa(svg);
        
        // Create CSS rules for each ghost type
        const style = document.createElement('style');
        style.textContent = `.ghost-${name} { background-image: url("${dataURL}"); }`;
        document.head.appendChild(style);
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Pacman game...');
    
    // Create ghost images
    createGhostImages();
    
    // Get player information from localStorage
    playerName = localStorage.getItem('pacman_player_name');
    playerClass = localStorage.getItem('pacman_player_class');
    
    // Redirect to login if no player info
    if (!playerName || !playerClass) {
        window.location.href = '/login';
        return;
    }
    
    // Check for required constants
    if (!checkRequiredConstants()) return;
    
    // Initialize games
    initializeGames();
    
    // Set up UI and game elements
    setupUIControls();
    initializeAIPopulation();
    makeAllPanelsVisible();
    
    // Initialize floating ghosts
    initFloatingGhosts();
    
    // Show ready status
    updateAIStatus("Ready to start AI learning");
});

// Check if required constants are loaded
function checkRequiredConstants() {
    if (typeof CELL_SIZE === 'undefined' || typeof COLS === 'undefined' || typeof ROWS === 'undefined') {
        console.error('Game constants not loaded! Make sure constants.js is loaded first.');
        alert('Game initialization failed. Please check the console for details.');
        return false;
    }
    return true;
}

// Initialize both game instances
function initializeGames() {
    try {
        // Initialize manual game
        manualGame = new ManualGame('player-game');
        console.log('Manual game initialized successfully');
        
        // Initialize AI game
        aiGame = new AIGame('ai-game');
        console.log('AI game initialized successfully');
        
        // Style the canvases
        styleGameCanvases();
        
        // Force initial render
        manualGame.render();
        
        if (aiGame) {
            aiGame.initPacman(); // Ensure Pacman is created
            aiGame.render();
        }
    } catch (error) {
        console.error('Failed to initialize games:', error);
    }
}

// Apply styles to game canvases
function styleGameCanvases() {
    const playerCanvas = document.getElementById('player-game');
    const aiCanvas = document.getElementById('ai-game');
    
    // Apply common styles to player canvas
    if (playerCanvas) {
        playerCanvas.style.display = 'block';
        playerCanvas.style.border = '2px solid #00BCA9';
        playerCanvas.style.borderRadius = '5px';
        playerCanvas.style.boxShadow = '0 0 15px rgba(0, 188, 170, 0.7)';
        playerCanvas.style.imageRendering = 'pixelated';
        playerCanvas.style.margin = '0 auto';
        playerCanvas.style.position = 'relative';
        playerCanvas.style.zIndex = '10';
    }
    
    // Apply styles to AI canvas
    if (aiCanvas) {
        aiCanvas.style.display = 'block';
        aiCanvas.style.border = '2px solid rgba(132, 0, 255, 0.95)';
        aiCanvas.style.borderRadius = '5px';
        aiCanvas.style.boxShadow = '0 0 15px rgba(123, 6, 218, 0.7)';
        aiCanvas.style.imageRendering = 'pixelated';
        aiCanvas.style.margin = '0 auto';
        aiCanvas.style.background = '#9a7cbc'; // Slightly darker purple
        aiCanvas.style.position = 'relative';
        aiCanvas.style.zIndex = '10'; // Ensure it's above ghost elements
    }
    }
    
    // Set up UI controls
function setupUIControls() {
    // Set cursor style for panel headings
    const gamePanelHeadings = document.querySelectorAll('.game-panel h2');
    gamePanelHeadings.forEach(heading => {
        if (heading) heading.style.cursor = 'pointer';
    });
    
    // Get control buttons
    const buttons = {
        startGame: document.getElementById('start-game'),
        resetGame: document.getElementById('reset-game'),
        startAI: document.getElementById('start-ai'),
        resetAI: document.getElementById('reset-ai')
    };
    
    // Set up button event listeners
    if (buttons.startGame) {
        buttons.startGame.addEventListener('click', () => manualGame?.start());
    }
    
    if (buttons.resetGame) {
        buttons.resetGame.addEventListener('click', () => manualGame?.reset());
    }
    
    if (buttons.startAI) {
        buttons.startAI.addEventListener('click', startAIGame);
    }
    
    if (buttons.resetAI) {
        buttons.resetAI.addEventListener('click', () => {
            // Reset the AI game and Q-learning
            aiGame?.reset();
            
            // Reset Q-learning variables
            qTable = {};
            explorationRate = maxExplorationRate;
            generation = 1;
            totalEpisodes = 0;
            
            // Reset visualization data
            episodeRewards = [];
            episodeScores = [];
            episodeQTableSizes = [];
            episodeExplorationRates = [];
            
            // Update UI with proper generation format
            const genCounter = document.getElementById("gen-counter");
            if (genCounter) genCounter.textContent = `${generation}/200`;
            
            updateAIStatus("AI learning reset. Ready to start.");
        });
    }
    
    // Set up Show Learning button
    const showLearningBtn = document.getElementById('show-learning');
    if (showLearningBtn) {
        showLearningBtn.addEventListener('click', showLearningGraph);
    }
    
    // Set up modal close button
    const closeModal = document.getElementsByClassName('close')[0];
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const modal = document.getElementById('learning-modal');
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('learning-modal');
            if (event.target === modal) {
                modal.style.display = 'none';
        }
    });
    
    // Set up speed control dropdown
    const speedSelector = document.getElementById('speed-selector');
    if (speedSelector) {
        speedSelector.addEventListener('change', function() {
            const speedValue = parseFloat(this.value);
            if (aiGame) {
                aiGame.setGameSpeed(speedValue);
                console.log(`Speed set to ${speedValue}x`);
            }
        });
    }
    
    // Remove loading overlay once everything is initialized
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    }
}

// Make all game panels visible
function makeAllPanelsVisible() {
    const panels = document.querySelectorAll('.game-panel-container');
    
    // Apply styles to manual panel
    if (panels[0]) {
        panels[0].style.opacity = '1';
        const canvasContainer = panels[0].querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.style.border = '2px solid rgba(0, 188, 170, 0.7)';
        }
    }
    
    // Apply styles to AI panel
    if (panels[1]) {
        panels[1].style.opacity = '1';
        const canvasContainer = panels[1].querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.style.border = '2px solid rgba(132, 0, 255, 0.7)';
        }
    }
    
    // Force render both games
    manualGame?.render();
    aiGame?.render();
}

// Initialize AI population
function initializeAIPopulation() {
    agents = [];
    
    // Create initial random agents
    for (let i = 0; i < GENERATION_SIZE; i++) {
        agents.push({
            id: i,
            parameters: {
                dotWeight: randomInRange(PARAMETER_RANGE.dotWeight.min, PARAMETER_RANGE.dotWeight.max),
                powerPelletWeight: randomInRange(PARAMETER_RANGE.powerPelletWeight.min, PARAMETER_RANGE.powerPelletWeight.max),
                ghostWeight: randomInRange(PARAMETER_RANGE.ghostWeight.min, PARAMETER_RANGE.ghostWeight.max),
                vulnerableGhostWeight: randomInRange(PARAMETER_RANGE.vulnerableGhostWeight.min, PARAMETER_RANGE.vulnerableGhostWeight.max),
                explorationWeight: randomInRange(PARAMETER_RANGE.explorationWeight.min, PARAMETER_RANGE.explorationWeight.max)
            },
            fitness: 0,
            gameData: [],
            dotsEaten: 0,
            score: 0
        });
    }
    
    console.log(`Initialized ${agents.length} AI agents for generation 1`);
    updateGenerationInfo();
}

// Run a specific agent
function runAgent(agentIndex) {
    if (agentIndex >= agents.length) return;
    
    const agent = agents[agentIndex];
    console.log(`Running agent ${agentIndex + 1}/${agents.length} in generation ${generation}`);
    
    // Reset the AI game
    if (!aiGame) return;
    
    aiGame.reset();
    
    // Set the AI parameters
    aiGame.setAIParameters(agent.parameters);
    
    // Set generation info
    aiGame.setGeneration(generation, agentIndex + 1);
    
    // Start the game - the AI game will call nextAgent when finished via event
    aiGame.start();
    
    // Note: We removed the checkInterval as it's redundant
    // The AI game should trigger events when completed instead
}

// Move to the next agent
function nextAgent() {
    if (!evolutionInProgress) return;
    
    // Move to next agent
    currentAgent++;
    
    // Check if we've completed a generation
    if (currentAgent >= agents.length) {
        finishGeneration();
    } else {
        // Still have agents to run in this generation
        setTimeout(() => runAgent(currentAgent), 500); // Reduced delay to speed up evolution
    }
}

// Finish the current generation and start a new one
function finishGeneration() {
    console.log(`Generation ${generation} complete.`);
    
    // Sort agents by fitness
    agents.sort((a, b) => b.fitness - a.fitness);
    
    // Save the best agents
    bestAgents.push({
        generation: generation,
        agent: {...agents[0]},
        fitness: agents[0].fitness,
        dotsEaten: agents[0].dotsEaten || 0,
        score: agents[0].score || 0
    });
    
    // Save data to the server
    saveGenerationData(bestAgents[bestAgents.length - 1]);
    
    // Update UI
    updateGenerationResults();
    
    // Show message
    const messageElement = document.getElementById('evolution-message');
    if (messageElement) {
        messageElement.textContent = `Generation ${generation} complete. Best fitness: ${agents[0].fitness.toFixed(2)}`;
    }
    
    // Now proceed to the next generation if still running
    if (evolutionInProgress) {
        setTimeout(() => {
            startNextGeneration();
        }, 1000); // Reduced delay between generations
    }
}

// Start the next generation
function startNextGeneration() {
    // Increment generation counter
    generation++;
    console.log(`Starting Generation ${generation}`);
    
    // Create next generation
    evolveNextGeneration();
    
    // Reset current agent index
    currentAgent = 0;
    
    // Update UI
    updateGenerationInfo();
    
    // Make sure the AI game is completely reset
    if (aiGame) {
        aiGame.reset();
    }
    
    // Start running the first agent in the new generation
    runAgent(currentAgent);
}

// Start the evolution process
function startEvolution() {
    evolutionInProgress = true;
    
    if (currentAgent >= agents.length) {
        // Reset for new run
        currentAgent = 0;
    }
    
    runAgent(currentAgent);
}

// Stop the evolution process
function stopEvolution() {
    evolutionInProgress = false;
    
    if (aiGame) {
        aiGame.gameOver = true;
        aiGame.paused = true;
        if (aiGame.animationFrame) {
            cancelAnimationFrame(aiGame.animationFrame);
            aiGame.animationFrame = null;
        }
    }
}

// Save generation data to the server
function saveGenerationData(generationData) {
    // Make sure all required fields are present
    const dataToSend = {
        // Ensure these required fields exist to prevent server errors
        generation: generationData.generation || 1,
        agent: generationData.agent || { id: 0, parameters: {} },
        fitness: generationData.fitness || 0,
        dotsEaten: generationData.dotsEaten || 0,
        score: generationData.score || 0,
        
        // Add player information
        playerName: playerName || "Player",
        playerClass: playerClass || "Computer Science",
        
        // Add timestamp and algorithm info
        timestamp: new Date().getTime(),
        algorithm: 'qlearning'
    };
    
    console.log('Saving generation data:', dataToSend);
    
    // Send to server
    fetch('/save_generation_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
    })
    .then(response => {
        if (!response.ok) {
            console.error('Network response error:', response.statusText);
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('Generation data saved successfully:', data);
    })
    .catch((error) => {
        console.error('Error saving generation data:', error);
    });
}

// Update stats for the current agent
function updateAgentStats(stats) {
    if (!agents || currentAgent >= agents.length) return;
    
    // Update the current agent's stats
    agents[currentAgent].fitness = stats.fitness;
    agents[currentAgent].dotsEaten = stats.dotsEaten;
    agents[currentAgent].score = stats.score;
    
    // Update UI
    updateAgentInfo(agents[currentAgent]);
}

// Evolve the next generation using genetic algorithm
function evolveNextGeneration() {
    // Sort current agents by fitness
    agents.sort((a, b) => b.fitness - a.fitness);
    
    // Calculate adaptive mutation rate based on diversity
    const adaptiveMutationRate = calculateAdaptiveMutationRate();
    console.log(`Using adaptive mutation rate: ${adaptiveMutationRate.toFixed(3)}`);
    
    // Get the top percentage as elite parents
    const numElites = Math.max(2, Math.floor(agents.length * ELITE_PERCENTAGE));
    const elites = agents.slice(0, numElites);
    
    // Create new generation
    const newAgents = [];
    
    // Keep the best agent unchanged (elitism)
    newAgents.push({
        id: 0,
        parameters: {...agents[0].parameters},
        fitness: 0,
        gameData: [],
        dotsEaten: 0,
        score: 0
    });
    
    // Add several slightly mutated versions of the best agent
    for (let i = 1; i < 3; i++) {
    newAgents.push({
            id: i,
            parameters: mutateParameters({...agents[0].parameters}, adaptiveMutationRate * 0.7),
        fitness: 0,
        gameData: [],
        dotsEaten: 0,
        score: 0
    });
    }
    
    // Use tournament selection for the rest with varying tournament sizes
    for (let i = 3; i < GENERATION_SIZE; i++) {
        // Adaptive tournament size - higher for later generations
        const tournamentSize = Math.min(5, 2 + Math.floor(generation / 10));
        
        // Select parents using tournament selection
        const parent1 = tournamentSelect(agents, tournamentSize);
        let parent2 = tournamentSelect(agents, tournamentSize);
        
        // Make sure parents are different
        while (parent2 === parent1) {
            parent2 = tournamentSelect(agents, tournamentSize);
        }
        
        // Create child through crossover with adaptive method
        const childParams = adaptiveCrossover(parent1.parameters, parent2.parameters, parent1.fitness, parent2.fitness);
        
        // Apply mutation with adaptive rate
        const mutatedParams = mutateParameters(childParams, adaptiveMutationRate);
        
        // Create child
        const child = {
            id: i,
            parameters: mutatedParams,
            fitness: 0,
            gameData: [],
            dotsEaten: 0,
            score: 0
        };
        
        newAgents.push(child);
    }
    
    // Add completely random agents for exploration (more in early generations, fewer later)
    const numRandomAgents = Math.max(1, Math.floor(4 * Math.exp(-generation / 20)));
    for (let i = 0; i < numRandomAgents; i++) {
        const randomIndex = Math.floor(Math.random() * (GENERATION_SIZE - 3)) + 3;
        newAgents[randomIndex] = {
            id: randomIndex,
            parameters: generateRandomParameters(),
            fitness: 0,
            gameData: [],
            dotsEaten: 0,
            score: 0
        };
    }
    
    // Replace the old generation
    agents = newAgents;
    
    console.log(`Created generation ${generation} with ${agents.length} agents (${numRandomAgents} random)`);
}

// Calculate adaptive mutation rate based on population diversity
function calculateAdaptiveMutationRate() {
    // Calculate diversity factor - how similar are the best agents
    const diversity = calculatePopulationDiversity();
    
    // Base mutation rate adjusted by diversity and generation
    const baseMutationRate = MUTATION_RATE;
    const diversityFactor = 1.3 - Math.min(1, diversity);
    const generationFactor = Math.max(0.7, 1.0 - (generation / MAX_GENERATIONS));
    let adaptiveMutationRate = baseMutationRate * diversityFactor * generationFactor;
    
    // Ensure it stays within reasonable bounds
    adaptiveMutationRate = Math.min(0.8, Math.max(0.05, adaptiveMutationRate));
    
    console.log(`Adaptive mutation rate: ${adaptiveMutationRate.toFixed(3)} (diversity: ${diversity.toFixed(2)}, gen factor: ${generationFactor.toFixed(2)})`);
    
    return adaptiveMutationRate;
}

// Tournament selection - improved with weighted selection probability
function tournamentSelect(agents, tournamentSize) {
    let best = null;
    
    // Select random agents and find the best
    for (let i = 0; i < tournamentSize; i++) {
        // Weighted random selection - favor higher-ranked agents
        let randomIndex;
        if (Math.random() < 0.7) {  // 70% chance of selecting from top half
            randomIndex = Math.floor(Math.random() * Math.ceil(agents.length / 2));
        } else {
            randomIndex = Math.floor(Math.random() * agents.length);
        }
        
        const candidate = agents[randomIndex];
        
        if (best === null || candidate.fitness > best.fitness) {
            best = candidate;
        }
    }
    
    return best;
}

// Adaptive crossover based on parent fitness
function adaptiveCrossover(params1, params2, fitness1, fitness2) {
    const childParams = {};
    
    // Calculate relative fitness for weighted crossover
    const totalFitness = fitness1 + fitness2;
    const weight1 = totalFitness > 0 ? fitness1 / totalFitness : 0.5;
    
    // For each parameter
    for (const key in params1) {
        if (Math.random() < 0.7) {
            // Weighted blend crossover - favor the better parent
            const blendRatio = Math.random() * 0.5 + weight1; // Bias toward better parent
            childParams[key] = params1[key] * blendRatio + params2[key] * (1 - blendRatio);
        } else {
            // Standard crossover - take from either parent
            childParams[key] = Math.random() < weight1 ? params1[key] : params2[key];
        }
    }
    
    return childParams;
}

// Mutate parameters
function mutateParameters(params, mutationRate) {
    const mutatedParams = {...params};
    
    // For each parameter
    for (const key in mutatedParams) {
        // Mutation: randomly adjust value
        if (Math.random() < mutationRate) {
            const range = PARAMETER_RANGE[key];
            
            // Dynamic mutation amount based on generation progress
            const dynamicFactor = Math.max(0.1, 1 - (generation / 30)); // Decreases faster with generations
            
            // Use more targeted mutations - occasionally make bigger changes
            let mutationAmount;
            if (Math.random() < 0.2) {
                // Big mutation (exploration)
                mutationAmount = (range.max - range.min) * 0.4 * dynamicFactor * (Math.random() * 2 - 1);
            } else {
                // Small mutation (exploitation)
                mutationAmount = (range.max - range.min) * 0.15 * dynamicFactor * (Math.random() * 2 - 1);
            }
            
            mutatedParams[key] += mutationAmount;
            
            // Clamp to valid range
            mutatedParams[key] = Math.max(range.min, Math.min(range.max, mutatedParams[key]));
        }
    }
    
    return mutatedParams;
}

// Random number in range - simplified
function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

// Generate completely random parameters - optimized
function generateRandomParameters() {
    const params = {};
    
    Object.entries(PARAMETER_RANGE).forEach(([key, range]) => {
        params[key] = randomInRange(range.min, range.max);
    });
    
    return params;
}

// Update generation info in UI
function updateGenerationInfo() {
    // Update generation display and status
    updateAIStatus(`Running Generation ${generation}, Agent ${currentAgent + 1}/${agents.length}`);
}

// Update agent info in UI
function updateAgentInfo(agent) {
    const agentInfoElement = document.getElementById('agent-info');
    if (agentInfoElement) {
        let infoHtml = `<h3>Agent ${agent.id + 1} (Fitness: ${agent.fitness.toFixed(2)})</h3>`;
        infoHtml += '<ul>';
        for (const key in agent.parameters) {
            infoHtml += `<li>${key}: ${agent.parameters[key].toFixed(2)}</li>`;
        }
        infoHtml += '</ul>';
        agentInfoElement.innerHTML = infoHtml;
    }
}

// Generate results table with clear progression
function updateGenerationResults() {
    const resultsElement = document.getElementById('generation-results');
    if (resultsElement) {
        let resultsHtml = '<h3>Learning Progress</h3>';
        resultsHtml += '<table><tr><th>Gen</th><th>Fitness</th><th>Dots</th><th>Score</th><th>Improvement</th></tr>';
        
        // Show progression over generations
        const bestAgentsToShow = bestAgents.slice(-10); // Show up to last 10 generations
        let prevFitness = 0;
        
        for (const bestAgent of bestAgentsToShow) {
            const dotsEaten = bestAgent.dotsEaten || 0;
            const score = bestAgent.score || 0;
            
            // Calculate improvement percentage
            let improvement = '';
            if (prevFitness > 0) {
                const improvementPercent = ((bestAgent.fitness - prevFitness) / prevFitness * 100);
                const improvementColor = improvementPercent >= 0 ? 'green' : 'red';
                improvement = `<span style="color:${improvementColor}">${improvementPercent > 0 ? '+' : ''}${improvementPercent.toFixed(1)}%</span>`;
            }
            
            resultsHtml += `<tr>
                <td>${bestAgent.generation}</td>
                <td>${bestAgent.fitness.toFixed(1)}</td>
                <td>${dotsEaten}</td>
                <td>${score}</td>
                <td>${improvement}</td>
            </tr>`;
            
            prevFitness = bestAgent.fitness;
        }
        
        resultsHtml += '</table>';
        resultsElement.innerHTML = resultsHtml;
    }
    
    // Update AI status
    updateAIStatus(`Generation ${generation} completed`);
}

// Helper function to update AI status display
function updateAIStatus(status) {
    console.log(`AI Status update: ${status}`);
    
    // Update generation displays
    updateGenerationDisplay();
    
    // Update score display directly
    const scoreElement = document.getElementById('ai-score');
    if (scoreElement && aiGame) {
        scoreElement.textContent = aiGame.score || 0;
    }
    
    // Force render AI game to ensure status is reflected
    aiGame?.render();
}

// Export functions for global access
window.pacmanAI = {
    startEvolution,
    stopEvolution,
    nextAgent,
    finishEpisode,
    updateAgentStats,
    finishGeneration,
    generation   // Make generation accessible globally
};

// Backward compatibility for existing code
window.nextAgent = nextAgent;
window.updateAgentStats = updateAgentStats;
window.finishGeneration = finishGeneration;
window.finishEpisode = finishEpisode;

// Function to start the AI game with Q-learning
function startAIGame() {
    console.log("Starting AI game with Q-learning...");
    
    // Get player information
    playerName = localStorage.getItem('pacman_player_name') || "Player";
    playerClass = localStorage.getItem('pacman_player_class') || "Computer Science";
    
    // Initialize or reset Q-learning variables
    if (!qTable || Object.keys(qTable).length === 0) {
        console.log("Initializing new Q-learning table");
        qTable = {};
        explorationRate = maxExplorationRate;
        generation = 1;
        totalEpisodes = 0;
    }
    
    // Make window.generation available globally
    window.generation = generation;
    
    // Make sure we have an AI game instance
    if (!aiGame) {
        try {
            aiGame = new AIGame('ai-game');
            console.log('AI game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI game:', error);
            alert('Failed to start AI game. Please refresh the page and try again.');
            return;
        }
    }
    
    // Set up Q-learning parameters for the AI game
    try {
        aiGame.setQLearningParameters({
            qTable,
            learningRate,
            discountFactor,
            explorationRate
        });
        
        // Reset and start the AI game
        aiGame.reset();
        aiGame.start();
        
        console.log(`Starting Q-learning training with exploration rate ${explorationRate.toFixed(3)}`);
        
        // Update UI with proper generation format 
        updateGenerationDisplay();
        
        updateAIStatus(`Generation ${generation} started (Epsilon: ${explorationRate.toFixed(3)})`);
    } catch (error) {
        console.error("Error starting AI game:", error);
        alert("An error occurred while starting the AI game. Please try resetting it.");
    }
}

// Handle episode end for Q-learning
function finishEpisode(reward, dotsEaten, score, isCollision = false) {
    try {
        // Save episode data
        cumulativeReward += reward;
        totalEpisodes++;
        
        // Track data for visualization
        episodeRewards.push(reward);
        episodeScores.push(score);
        episodeQTableSizes.push(Object.keys(qTable).length);
        episodeExplorationRates.push(explorationRate);
        
        // If this is from a ghost collision, increment generation immediately
        if (isCollision) {
            generation++;
            console.log(`Incrementing to generation ${generation} due to ghost collision`);
            // Update generation display in both counters
            updateGenerationDisplay();
        }
        // Only increment for episodes if not already incremented due to collision
        else if (totalEpisodes % 20 === 0) {
            // Adaptive learning rate and discount factor based on performance
            updateLearningParameters();
            
            // Update generation count every 20 episodes
            generation++;
            console.log(`Starting generation ${generation} with exploration rate ${explorationRate.toFixed(3)}`);
            // Update generation display in both counters
            updateGenerationDisplay();
        } 
        // Always update learning parameters even if we don't increment generation
        else {
            // Adaptive learning rate and discount factor based on performance
            updateLearningParameters();
        }
        
        // Log episode results
        console.log(`Episode ${totalEpisodes} finished - Reward: ${reward.toFixed(2)}, ` +
                    `Dots: ${dotsEaten}, Score: ${score}, ` +
                    `Generation: ${generation}, Exploration rate: ${explorationRate.toFixed(3)}`);
        
        // Update UI with episode results - but don't increment generation again
        const statusMessage = `Generation ${generation} - Reward: ${reward.toFixed(2)}`;
        console.log(`AI Status update: ${statusMessage}`);
        
        // Update score display directly
        const scoreElement = document.getElementById('ai-score');
        if (scoreElement && aiGame) {
            scoreElement.textContent = aiGame.score || 0;
        }
        
        // Force render AI game to ensure status is reflected
        aiGame?.render();
        
        // Check if we've reached the generation limit
        if (generation > MAX_GENERATIONS) {
            console.log(`Reached maximum generation limit (${MAX_GENERATIONS}). Training complete.`);
            updateAIStatus(`Training complete - ${MAX_GENERATIONS} generations finished`);
            stopEvolution();
            return;
        }
        
        // Make sure window.generation is updated for other functions to use
        window.generation = generation;
        
        // Restart with minimal delay to keep training going
        if (aiGame) {
            restartAIGame();
        }
    } catch (error) {
        // Catch any uncaught errors to prevent the game from freezing
        console.error("Critical error in finishEpisode:", error);
        
        // Try to recover by forcing a game restart
        recoverFromError();
    }
}

// Helper function to update generation displays throughout the UI
function updateGenerationDisplay() {
    // Update the main generation counter in the game panel
    const aiGenerationElement = document.getElementById('ai-generation');
    if (aiGenerationElement) {
        aiGenerationElement.textContent = generation;
        console.log(`Updated ai-generation to ${generation}`);
    }
    
    // Update the generation counter in the stats panel
    const genCounter = document.getElementById("gen-counter");
    if (genCounter) {
        genCounter.textContent = `${generation}/${MAX_GENERATIONS}`;
    }
    
    // If we have an aiGame instance, update its generation counter
    if (aiGame) {
        aiGame.setGeneration(generation, 1);
    }
}

// Helper function to update learning parameters
function updateLearningParameters() {
    // Decrease learning rate as we progress to fine-tune learning
    if (generation > 20) {
        learningRate = Math.max(0.01, learningRate * 0.995);
    }
    
    // Increase discount factor as we progress to focus more on long-term rewards
    if (generation > 10) {
        discountFactor = Math.min(0.99, discountFactor * 1.001);
    }
    
    // Decay exploration rate - more adaptive based on generation
    if (generation < 40) {
        // Maintain high exploration for longer
        explorationRate = Math.max(0.4, 1.0 - (generation / 50));
    } else if (generation < 100) {
        // Medium exploration in middle generations - slower decay
        explorationRate = Math.max(0.25, 0.5 - (generation - 40) / 200);
    } else {
        // More gradual reduction for later generations 
        explorationRate = Math.max(0.1, 0.25 - (generation - 100) / 400);
    }

    // Apply episode-based decay within each generation
    if (episodeRewards.length > 0) {
        // Apply additional small decay based on episodes
        const episodeFactor = Math.min(0.9, episodeRewards.length / 100);
        explorationRate *= (1 - (0.1 * episodeFactor));
    }

    // Ensure we don't go below minimum
    explorationRate = Math.max(0.05, explorationRate);
    
    // Update the actual parameter in the game
    aiGame.setExplorationRate(explorationRate);
    
    // Also update UI element if it exists
    const explorationRateElement = document.getElementById('exploration-rate');
    if (explorationRateElement) {
        explorationRateElement.textContent = (explorationRate * 100).toFixed(1) + '%';
    }
}

// Helper function to restart AI game
function restartAIGame() {
    try {
        aiGame.reset();
        
        // Update Q-learning parameters with current values
        aiGame.setQLearningParameters({
            qTable,
            learningRate,
            discountFactor,
            explorationRate
        });
        
        // Start next episode with a small delay to ensure proper reset
        setTimeout(() => aiGame.start(), 100);
    } catch (error) {
        console.error("Error restarting AI game:", error);
        
        // Try one more time with a delay
        setTimeout(() => {
            try {
                aiGame.reset();
                aiGame.start();
            } catch (finalError) {
                console.error("Fatal error restarting game:", finalError);
            }
        }, 500);
    }
}

// Helper function to recover from errors
function recoverFromError() {
    try {
        if (aiGame) {
            generation = Math.min(MAX_GENERATIONS, generation + 1);
            
            // Update UI with the new generation
            updateGenerationDisplay();
            
            // Force restart
            aiGame.reset();
            aiGame.start();
        }
    } catch (recoveryError) {
        console.error("Failed to recover from error:", recoveryError);
    }
}

// Show learning graph modal
function showLearningGraph() {
    const modal = document.getElementById('learning-modal');
    if (!modal) return;
    
    // Show loading indicator
    updateLearningStats();
    const graphContainer = document.getElementById('learning-graph-container');
    if (graphContainer) {
        graphContainer.innerHTML = '<div class="loading-message">Generating plot...</div>';
    }
    
    // Show the modal with a fade-in effect
    modal.style.display = 'block';
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
    
    // Set up event listeners for closing
    const closeBtn = document.querySelector('.learning-close');
    if (closeBtn) {
        closeBtn.onclick = closeLearningModal;
    }
    
    // Set up event listener for refresh button
    const refreshBtn = document.getElementById('refresh-plot');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', generateLearningPlot);
    }
    
    // Close when clicking outside the content
    window.onclick = function(event) {
        if (event.target === modal) {
            closeLearningModal();
        }
    };
    
    // Close on ESC key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeLearningModal();
        }
    });
    
    // Generate and display the plot
    generateLearningPlot();
}

// Generate the learning plot using server-side matplotlib
function generateLearningPlot() {
    // Update all stats first
    updateLearningStats();
    
    // Show loading state
    const graphContainer = document.getElementById('learning-graph-container');
    if (graphContainer) {
        graphContainer.innerHTML = '<div class="loading-message">Generating plot...</div>';
    }
    
    // Add cache-busting parameter to prevent browser caching
    const cacheBuster = new Date().getTime();
    
    // Send data to server to generate the plot
    fetch('/generate_learning_plot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        body: JSON.stringify({
            episodes: Array.from({ length: episodeRewards.length }, (_, i) => i + 1),
            rewards: episodeRewards,
            states: episodeQTableSizes,
            _cache: cacheBuster // Add cache buster to the data
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Add cache buster to the image URL to prevent browser caching
            const imageData = data.plot_data;
            
            // Display the plot image
            displayPlotImage(imageData);
            
            // Animate refresh button to show success
            const refreshBtn = document.getElementById('refresh-plot');
            if (refreshBtn) {
                refreshBtn.classList.add('refresh-success');
                setTimeout(() => {
                    refreshBtn.classList.remove('refresh-success');
                }, 1000);
            }
        } else {
            throw new Error(data.message || 'Failed to generate plot');
        }
    })
    .catch(error => {
        console.error('Error generating plot:', error);
        if (graphContainer) {
            graphContainer.innerHTML = `<div class="error-message">Error generating plot: ${error.message}</div>`;
        }
    });
}

// Display the matplotlib-generated plot image
function displayPlotImage(imageData) {
    const graphContainer = document.getElementById('learning-graph-container');
    if (!graphContainer) return;
    
    // Clear any existing content
    graphContainer.innerHTML = '';
    
    // Create image element
    const img = document.createElement('img');
    img.src = imageData; // Now using the base64 data directly
    img.alt = 'Q-Learning Progress';
    img.className = 'learning-plot-image';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    // Add to container
    graphContainer.appendChild(img);
}

// Close learning modal
function closeLearningModal() {
    const modal = document.getElementById('learning-modal');
    if (!modal) return;
    
    // Fade-out effect
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        
        // Clear graph container
        const graphContainer = document.getElementById('learning-graph-container');
        if (graphContainer) {
            graphContainer.innerHTML = '';
        }
    }, 300);
    
    // Remove event listeners
    window.onclick = null;
    document.removeEventListener('keydown', closeLearningModal);
}

// Update learning stats in the modal
function updateLearningStats() {
    // Calculate stats
    const totalEpisodes = episodeRewards.length;
    if (totalEpisodes === 0) return;
    
    const sum = episodeRewards.reduce((a, b) => a + b, 0);
    const avgReward = sum / totalEpisodes;
    const bestReward = Math.max(...episodeRewards);
    const worstReward = Math.min(...episodeRewards);
    const latestQTableSize = episodeQTableSizes[episodeQTableSizes.length - 1] || 0;
    const latestScore = episodeScores[episodeScores.length - 1] || 0;
    
    // Calculate improvement over last 5 episodes vs first 5
    let improvementText = '';
    if (totalEpisodes >= 10) {
        const first5Avg = episodeRewards.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const last5Avg = episodeRewards.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const improvementPercent = ((last5Avg - first5Avg) / Math.abs(first5Avg)) * 100;
        
        if (!isNaN(improvementPercent) && isFinite(improvementPercent)) {
            if (improvementPercent > 0) {
                improvementText = `<span class="positive">+${improvementPercent.toFixed(1)}%</span>`;
            } else {
                improvementText = `<span class="negative">${improvementPercent.toFixed(1)}%</span>`;
            }
        }
    }
    
    // Update UI elements
    document.getElementById('total-episodes').textContent = totalEpisodes;
    document.getElementById('avg-reward').textContent = avgReward.toFixed(2);
    document.getElementById('best-reward').textContent = bestReward.toFixed(2);
    document.getElementById('worst-reward').textContent = worstReward.toFixed(2);
    
    if (document.getElementById('last-score')) {
        document.getElementById('last-score').textContent = latestScore;
    }
    
    if (document.getElementById('current-generation')) {
        document.getElementById('current-generation').textContent = generation;
    }
    
    if (document.getElementById('q-table-size')) {
        document.getElementById('q-table-size').textContent = latestQTableSize;
    }
    
    if (document.getElementById('exploration-rate')) {
        document.getElementById('exploration-rate').textContent = 
            (explorationRate * 100).toFixed(1) + '%';
    }
    
    if (document.getElementById('learning-improvement') && improvementText) {
        document.getElementById('learning-improvement').innerHTML = improvementText;
    }
    
    // Update title
    const titleElement = document.querySelector('.learning-header h2');
    if (titleElement) {
        titleElement.textContent = `Q-Learning Progress: ${totalEpisodes} Episodes`;
    }
}

// Initialize floating background ghosts
function initFloatingGhosts() {
    const ghostTypes = ['ghost-red', 'ghost-pink', 'ghost-blue', 'ghost-orange', 'ghost-vulnerable'];
    const ghostContainer = document.getElementById('floating-ghosts-container');
    
    if (!ghostContainer) return;
    
    // Custom animation paths for full-screen movement
    const animationPaths = [
        // Path 1 - circle
        `@keyframes float-ghost-1 {
            0% { transform: translate(-50px, 50vh) rotate(0deg); }
            25% { transform: translate(25vw, -30px) rotate(90deg); }
            50% { transform: translate(calc(100vw + 50px), 50vh) rotate(180deg); }
            75% { transform: translate(25vw, calc(100vh + 30px)) rotate(270deg); }
            100% { transform: translate(-50px, 50vh) rotate(360deg); }
        }`,
        // Path 2 - diagonal
        `@keyframes float-ghost-2 {
            0% { transform: translate(-50px, -50px) rotate(0deg); }
            50% { transform: translate(calc(100vw + 50px), calc(100vh + 50px)) rotate(180deg); }
            100% { transform: translate(-50px, -50px) rotate(360deg); }
        }`,
        // Path 3 - zig-zag
        `@keyframes float-ghost-3 {
            0% { transform: translate(10vw, -50px) rotate(0deg); }
            20% { transform: translate(30vw, 25vh) rotate(30deg); }
            40% { transform: translate(60vw, 75vh) rotate(120deg); }
            60% { transform: translate(20vw, calc(100vh + 50px)) rotate(200deg); }
            80% { transform: translate(80vw, 50vh) rotate(280deg); }
            100% { transform: translate(10vw, -50px) rotate(360deg); }
        }`,
        // Path 4 - figure 8
        `@keyframes float-ghost-4 {
            0% { transform: translate(50vw, -30px) rotate(0deg); }
            25% { transform: translate(-30px, 40vh) rotate(90deg); }
            50% { transform: translate(50vw, calc(100vh + 30px)) rotate(180deg); }
            75% { transform: translate(calc(100vw + 30px), 40vh) rotate(270deg); }
            100% { transform: translate(50vw, -30px) rotate(360deg); }
        }`,
        // Path 5 - wide arc
        `@keyframes float-ghost-5 {
            0% { transform: translate(-50px, 10vh) scale(0.8) rotate(0deg); }
            33% { transform: translate(50vw, -40px) scale(1.1) rotate(120deg); }
            66% { transform: translate(calc(100vw + 50px), 10vh) scale(0.9) rotate(240deg); }
            100% { transform: translate(-50px, 10vh) scale(0.8) rotate(360deg); }
        }`
    ];
    
    // Add custom animations to document
    let animationStyle = document.createElement('style');
    animationStyle.textContent = animationPaths.join('\n');
    document.head.appendChild(animationStyle);
    
    // Clear any existing ghosts
    ghostContainer.innerHTML = '';
    
    // Add 12-18 ghosts to the entire screen
    const ghostCount = Math.floor(Math.random() * 7) + 12;
    
    for (let i = 0; i < ghostCount; i++) {
        const ghost = document.createElement('div');
        const ghostType = ghostTypes[Math.floor(Math.random() * ghostTypes.length)];
        
        ghost.className = `floating-ghost ${ghostType}`;
        
        // Randomize initial position across the whole viewport
        const left = Math.random() * 100 + 'vw';
        const top = Math.random() * 100 + 'vh';
        ghost.style.left = left;
        ghost.style.top = top;
        
        // Pick a random animation path
        const animationIndex = Math.floor(Math.random() * animationPaths.length) + 1;
        
        // Randomize animation duration, delay and direction
        const duration = 25 + Math.random() * 20;
        const delay = Math.random() * 20;
        const direction = Math.random() > 0.5 ? 'normal' : 'reverse';
        ghost.style.animation = `float-ghost-${animationIndex} ${duration}s linear infinite ${direction}`;
        ghost.style.animationDelay = `-${delay}s`;
        
        // Randomize size and opacity
        const size = 30 + Math.floor(Math.random() * 30);
        const opacity = 0.2 + Math.random() * 0.3;
        ghost.style.width = `${size}px`;
        ghost.style.height = `${size}px`;
        ghost.style.opacity = opacity;
        
        // Add to container
        ghostContainer.appendChild(ghost);
    }
}

// Calculate diversity of the population based on parameter variance
function calculatePopulationDiversity() {
    // Sample a parameter to check diversity
    const paramKeys = Object.keys(agents[0].parameters);
    const sampleKey = paramKeys[Math.floor(Math.random() * paramKeys.length)];
     
    // Calculate mean and variance using reduce
    const { sum, sumSquared } = agents.reduce((acc, agent) => {
        const value = agent.parameters[sampleKey];
        return {
            sum: acc.sum + value,
            sumSquared: acc.sumSquared + value * value
        };
    }, { sum: 0, sumSquared: 0 });
     
    const mean = sum / agents.length;
    const variance = (sumSquared / agents.length) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(0, variance));
     
    // Calculate normalized diversity (0-1)
    const range = PARAMETER_RANGE[sampleKey];
    const rangeSize = range.max - range.min;
    return stdDev / (rangeSize * 0.3); // Normalize to 0-1 range approximately
}

// Start Q-learning with the current agent
function startQLearning() {
    const currentAgentParams = Object.assign({}, agents[currentAgent].parameters);
    console.log("Starting Q-learning with parameters:", currentAgentParams);
    
    // Initialize Q-learning parameters
    const qLearningParams = {
        learningRate: 0.25,        // Increased from default for faster learning
        discountFactor: 0.95,      // Slightly higher to value future rewards more
        explorationRate: 1.0,      // Start with full exploration
        parameters: currentAgentParams
    };
    
    // Pass parameters to the ai-game component
    aiGame.setQLearningParams(qLearningParams);
    
    // Update UI
    updateAIStatus(`Q-learning started with parameters: ${JSON.stringify(currentAgentParams)}`);
    
    // Enable control buttons
    document.getElementById('stop-evolution').disabled = false;
    document.getElementById('learning-visualization').disabled = false;
}