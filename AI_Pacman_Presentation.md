# AI Pacman
## Teaching Computers to Play Games

---

## Objectives

- Create a fun web Pacman game that students can play
- Teach the computer how to play Pacman by itself
- Show students how computers can learn from experience
- Compare how humans and computers play games differently
- Make learning about artificial intelligence fun and interactive

---

## Research Questions

1. Can a computer learn to play Pacman as well as a human player?
2. What information does the computer need to make good decisions in the game?
3. How does changing the computer's learning settings affect how well it plays?
4. After enough practice, can the computer beat human players?
5. How do different ghost behaviors make the game easier or harder for the computer to learn?

---

## Motivation

### Learning Made Fun
- Students can see how computers learn in a fun, familiar game
- Colorful visuals show how the computer makes decisions
- Instant feedback shows if the computer is improving

### Cool Technology
- Play in any web browser without downloading anything
- Play yourself or watch the computer play and learn
- See the computer get better with each game it plays

### STEM Education
- Introduces basic artificial intelligence concepts
- Shows how computers can learn from trial and error
- Helps understand how video game characters are programmed

---

## Design of the Tool

### How It Works
- A website that runs the Pacman game
- Students can play using keyboard arrows
- The computer uses "Q-learning" (learning from rewards)
- Graphs show how the computer improves over time

### Game Setup
```javascript
// Game settings
const CELL_SIZE = 25;      // Size of each square
const COLS = 22;           // Game width
const ROWS = 26;           // Game height
const PACMAN_SPEED = 2.5;  // How fast Pacman moves
const GHOST_SPEED = 2.0;   // How fast ghosts move
```

### How the Computer Learns
```javascript
class PacmanAI {
    constructor() {
        this.qTable = {};               // Computer's memory
        this.learningRate = 0.1;        // How fast it learns
        this.discountFactor = 0.9;      // How much it plans ahead
        this.explorationRate = 0.2;     // How often it tries new things
    }
    // ...
}
```

---

## Design of the Tool (cont.)

### What the Computer Sees
```javascript
extractStateFeatures(state) {
    // Where is Pacman on the grid?
    const pacmanPos = state.position;
    const gridX = Math.floor(pacmanPos.x / CELL_SIZE);
    const gridY = Math.floor((pacmanPos.y - 10) / CELL_SIZE);
    
    // Where is the nearest ghost?
    let nearestGhostDist = Infinity;
    let nearestGhostDir = { x: 0, y: 0 };
    // ...
    
    return {
        gridX, gridY, direction: state.direction,
        ghostDistance: nearestGhostDist,
        ghostDirection: nearestGhostDir,
        powerMode: state.powerMode
    };
}
```

---

## Design of the Tool (cont.)

### Rewards System
```javascript
calculateReward(currentState, nextState) {
    let reward = 0;
    
    // Points for eating dots
    if (nextState.score > currentState.score) {
        reward += (nextState.score - currentState.score) / 10;
    }
    
    // Big penalty for getting caught
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
```

---

## Design of the Tool (cont.)

### How Learning Happens

- **Exploring vs. Using What It Knows**
  - Sometimes tries random moves to discover new strategies
  - Uses what it learned from previous games
  - Takes fewer random moves as it gets better

- **Remembering What Happened**
  - Saves information about moves that worked well
  - Learns from mistakes to avoid them next time
  - Builds a "map" of good and bad moves

- **Updating Its Knowledge**
  - Gets better at the game with each episode (game)
  - Focuses on moves that lead to higher scores
  - Avoids moves that led to losing in the past

---

## Design of the Tool (cont.)

### What Students See

- **Two Ways to Play**
  - Play yourself with keyboard arrows
  - Watch the computer play and learn

- **Learning Progress Display**
  - Episode counter (how many games played)
  - Score chart showing improvement
  - Dots eaten per game
  - High score tracking

- **Student Controls**
  - Start/stop the computer's learning
  - Reset to start fresh
  - Change game speed

---

## Key Findings

### How Well It Works
- Computer learns good paths through the maze after ~100 games
- Gets much better in the first 20-30 games
- Learns to avoid ghosts before it learns to collect all dots

### Learning Journey
- Finding the right balance between random moves and using what it knows is important
- Simpler information helps the computer learn faster
- Different ghost behaviors create different challenges for the computer

### Computer vs. Human Players
- Computer is very consistent once it learns
- Humans are better at handling unexpected situations
- Watching the computer can teach humans new strategies

---

## Conclusion

- Computers can learn to play Pacman through trial and error
- Students can see artificial intelligence in action in a familiar game
- Real-time feedback helps understand how learning happens
- Playing the game yourself and watching the computer shows different strategies
- Future improvements: trying different learning methods to compare them

---

## References

1. "Reinforcement Learning: An Introduction" by Sutton & Barto (simplified for students)
2. "Human-level control through deep reinforcement learning" - Nature journal
3. "Q-learning" - Machine Learning journal (core concept behind our game)
4. "Mastering Games with AI" - based on research from DeepMind
5. "Introduction to Artificial Intelligence for Kids" - online educational resources 