# AI Pacman

A web-based Pacman game with artificial intelligence capabilities, designed for educational purposes to demonstrate reinforcement learning concepts.

## Overview

AI Pacman is an interactive web application that:
- Allows users to play the classic Pacman game manually
- Demonstrates AI learning through Q-learning algorithms
- Visualizes the learning process with real-time statistics and graphs
- Provides an educational tool for understanding reinforcement learning

## Features

- **Classic Pacman Gameplay**: Navigate through mazes, eat dots, avoid ghosts
- **AI Mode**: Watch the computer learn to play through reinforcement learning
- **Learning Visualization**: See real-time graphs of the AI's learning progress
- **User Authentication**: Register and track player performance
- **Admin Dashboard**: View player statistics and export data
- **Responsive Web Design**: Play on any device with a web browser

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Flask (Python)
- **Data Visualization**: Matplotlib
- **Additional Libraries**: 
  - Numpy for numerical operations
  - Pandas for data handling
  - Pygame for game mechanics

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/AI-Pacman.git
   cd AI-Pacman
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python app.py
   ```

5. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

## Docker Support

You can also run the application using Docker:

```
docker build -t ai-pacman .
docker run -p 5000:5000 ai-pacman
```

## How to Play

1. Register with your name and class on the login page
2. Choose between manual play or AI mode
3. In manual mode, use arrow keys to navigate Pacman
4. In AI mode, watch the computer learn and improve over time

## AI Learning Process

The AI uses Q-learning, a reinforcement learning algorithm, to learn how to play Pacman efficiently:

- **State Recognition**: The AI analyzes the game state (Pacman position, ghost positions, dots, etc.)
- **Action Selection**: Based on current knowledge and exploration rate, the AI chooses a move
- **Reward System**: Actions that lead to positive outcomes (eating dots, avoiding ghosts) receive rewards
- **Knowledge Update**: The AI updates its Q-table based on rewards received
- **Exploration vs. Exploitation**: The AI balances trying new strategies vs. using known good moves

## Educational Value

This project helps students understand:
- Basic principles of artificial intelligence
- How computers can learn from experience
- Concepts of reinforcement learning
- Differences between human and computer game-playing strategies

## License

[Insert your license information here]

## Acknowledgments

- Based on research in reinforcement learning from various academic sources
- Inspired by classic Pacman gameplay and educational AI demonstrations

## Contact

[Your contact information or contribution guidelines] 