#!/usr/bin/env python3
"""
Pacman AI Game - Main Application Entry Point
This file serves as the single entry point for running the Pacman AI game.
Run this directly with: python app.py
"""

from flask import Flask, render_template, jsonify, send_file, request, send_from_directory, after_this_request, redirect, url_for
import os
import io
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import json
import base64
import time
import signal
import sys
import pandas as pd
from datetime import datetime

# Create the Flask application
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Global variable to store learning data
learning_data = {
    'generations': [],
    'fitness_scores': [],
    'dots_eaten': [],
    'scores': []
}

# Track players
players_data = []

# Add no-cache headers to all responses
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    print('Shutting down gracefully...')
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Override the default static route to add no-cache headers
@app.route('/static/<path:filename>')
def custom_static(filename):
    response = send_from_directory(app.static_folder, filename)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def index():
    # Redirect to login page
    return redirect(url_for('login'))

@app.route('/login')
def login():
    # Render the login page
    return render_template('loginpage.html')

@app.route('/game')
def game():
    # Add unique cache busters for each static file
    cache_busters = {
        'style': int(time.time()) + 1,
        'constants': int(time.time()) + 2,
        'manual_game': int(time.time()) + 3,
        'ai_game': int(time.time()) + 4,
        'main': int(time.time()) + 5
    }
    return render_template('index.html', cache_busters=cache_busters)

@app.route('/register_player', methods=['POST'])
def register_player():
    """Register a new player or update existing player"""
    data = request.json
    player_name = data.get('name', 'Unknown')
    player_class = data.get('class', 'Unknown')
    
    # Get current time in 12-hour format with AM/PM
    current_time = datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')
    
    # Check if this player is already registered
    player_exists = False
    for player in players_data:
        if player['name'] == player_name and player['class'] == player_class:
            player_exists = True
            player['last_login'] = current_time
            break
    
    # Add new player if not exists
    if not player_exists:
        players_data.append({
            'id': len(players_data) + 1,
            'name': player_name,
            'class': player_class,
            'registered_on': current_time,
            'last_login': current_time
        })
        print(f"New player registered: {player_name} ({player_class})")
    else:
        print(f"Existing player logged in: {player_name} ({player_class})")
    
    return jsonify({'status': 'success'})

@app.route('/export_players_excel')
def export_players_excel():
    """Generate and download an Excel file with player data"""
    # Create DataFrame from players data
    if not players_data:
        return jsonify({'status': 'error', 'message': 'No player data available'})
    
    # Create a copy of the player data with formatted columns
    formatted_data = []
    for player in players_data:
        formatted_player = player.copy()
        # The timestamps are already in the correct format from registration
        formatted_data.append(formatted_player)
    
    df = pd.DataFrame(formatted_data)
    df = df.rename(columns={
        'id': 'SN', 
        'name': 'Name', 
        'class': 'Class',
        'registered_on': 'Registration Time',
        'last_login': 'Last Login Time'
    })
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, sheet_name='Players', index=False)
        
        # Get the workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets['Players']
        
        # Add some formatting
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#FFD700',
            'border': 1
        })
        
        # Apply header format
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
            # Make the timestamp columns wider
            column_width = 25 if 'Time' in value else 18
            worksheet.set_column(col_num, col_num, column_width)
    
    output.seek(0)
    
    # Generate filename with timestamp in 12-hour format with AM/PM
    time_part = datetime.now().strftime('%Y%m%d_%I%M%S%p').lower()
    filename = f"pacman_players_{time_part}.xlsx"
    
    return send_file(
        output,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@app.route('/save_game_data', methods=['POST'])
def save_game_data():
    # This endpoint will be used to save the game play data for AI training
    # Will be implemented later
    return jsonify({"status": "success"})

@app.route('/save_generation_data', methods=['POST'])
def save_generation_data():
    """Save data from a completed generation"""
    data = request.json
    
    # Extract player info
    player_name = data.get('playerName', 'Unknown')
    player_class = data.get('playerClass', 'Unknown')
    
    # Save the data to our global tracking
    learning_data['generations'].append(data['generation'])
    learning_data['fitness_scores'].append(data['fitness'])
    learning_data['dots_eaten'].append(data['dots_eaten'])
    learning_data['scores'].append(data['score'])
    
    # Log player info
    print(f"Saving generation data from {player_name} ({player_class})")
    
    return jsonify({'status': 'success'})

@app.route('/get_learning_curve')
def get_learning_curve():
    """Generate and return a learning curve image"""
    if not learning_data['generations']:
        # If no data yet, return a placeholder image
        return jsonify({
            'status': 'error',
            'message': 'No learning data available yet'
        })
    
    # Ensure all arrays have the same length to avoid dimension mismatch
    min_length = min(
        len(learning_data['generations']),
        len(learning_data['fitness_scores']), 
        len(learning_data['dots_eaten']),
        len(learning_data['scores'])
    )
    
    # Use only data up to the minimum length
    generations = learning_data['generations'][:min_length]
    fitness_scores = learning_data['fitness_scores'][:min_length]
    dots_eaten = learning_data['dots_eaten'][:min_length]
    scores = learning_data['scores'][:min_length]
    
    # Check if we have any data to plot
    if min_length == 0:
        return jsonify({
            'status': 'error',
            'message': 'Not enough learning data collected yet'
        })
    
    # Create the plot
    plt.figure(figsize=(10, 8))
    
    # Create subplot for fitness scores
    plt.subplot(3, 1, 1)
    plt.plot(generations, fitness_scores, 'r-', label='Fitness')
    plt.xlabel('Generation')
    plt.ylabel('Fitness Score')
    plt.title('Pacman AI Learning Progress')
    plt.legend()
    plt.grid(True)
    
    # Create subplot for dots eaten
    plt.subplot(3, 1, 2)
    plt.plot(generations, dots_eaten, 'g-', label='Dots Eaten')
    plt.xlabel('Generation')
    plt.ylabel('Dots Eaten')
    plt.legend()
    plt.grid(True)
    
    # Create subplot for game scores
    plt.subplot(3, 1, 3)
    plt.plot(generations, scores, 'b-', label='Game Score')
    plt.xlabel('Generation')
    plt.ylabel('Score')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    
    # Save the figure to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    
    # Convert to base64 for serving directly in the browser
    img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()
    
    return jsonify({
        'status': 'success', 
        'plot': img_base64
    })

@app.route('/admin')
def admin():
    """Admin page to view and export player data"""
    return render_template('admin.html', players=players_data)

@app.route('/delete_player/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    """Delete a player by ID"""
    global players_data
    
    player_found = False
    for i, player in enumerate(players_data):
        if player['id'] == player_id:
            # Found the player, remove them
            del players_data[i]
            player_found = True
            print(f"Deleted player with ID {player_id}")
            
            # Re-index the remaining players
            for j in range(i, len(players_data)):
                players_data[j]['id'] = j + 1
                
            break
    
    if player_found:
        return jsonify({'status': 'success', 'message': 'Player deleted successfully'})
    else:
        return jsonify({'status': 'error', 'message': 'Player not found'}), 404

@app.route('/generate_learning_plot', methods=['POST'])
def generate_learning_plot():
    """Generate and return matplotlib plots for Q-learning data"""
    # Get data from request
    data = request.json
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'})
    
    episodes = data.get('episodes', [])
    rewards = data.get('rewards', [])
    states = data.get('states', [])
    
    if not episodes or not rewards or not states:
        return jsonify({'status': 'error', 'message': 'Missing required data'})
    
    # Ensure all arrays have the same length to avoid dimension mismatch
    min_length = min(len(episodes), len(rewards), len(states))
    if min_length == 0:
        return jsonify({'status': 'error', 'message': 'Empty data arrays'})
    
    # Sample data if too many points to reduce memory and CPU usage
    if min_length > 500:
        sample_rate = max(1, min_length // 500)
        episodes = episodes[::sample_rate]
        rewards = rewards[::sample_rate]
        states = states[::sample_rate]
        # Always include the most recent point
        if episodes[-1] != min_length:
            episodes.append(min_length)
            rewards.append(rewards[-1])
            states.append(states[-1])
    
    # Calculate moving average for rewards
    window_size = 5
    moving_avg = []
    for i in range(len(rewards)):
        start_idx = max(0, i - window_size // 2)
        end_idx = min(len(rewards), i + window_size // 2 + 1)
        moving_avg.append(sum(rewards[start_idx:end_idx]) / (end_idx - start_idx))
    
    # Create the plot with dark background - with optimized settings
    plt.figure(figsize=(12, 6), dpi=80)  # Lower DPI to use less memory
    plt.style.use('dark_background')
    
    # Create main plot with rewards
    ax1 = plt.gca()
    ax1.plot(episodes, rewards, 'cyan', alpha=0.7, linewidth=1.5, label='Rewards')
    ax1.plot(episodes, moving_avg, 'magenta', linewidth=2.5, label='5-Episode Moving Average')
    ax1.set_xlabel('Episode Number', fontsize=12, color='white')
    ax1.set_ylabel('Reward', fontsize=12, color='cyan')
    ax1.tick_params(axis='y', labelcolor='cyan')
    ax1.grid(True, alpha=0.15)
    
    # Create second y-axis for states
    ax2 = ax1.twinx()
    ax2.plot(episodes, states, 'lime', linewidth=2, label='States Learned')
    ax2.set_ylabel('States Learned', fontsize=12, color='lime')
    ax2.tick_params(axis='y', labelcolor='lime')
    
    # Add title and legend
    plt.title('Q-Learning Progress', fontsize=16, color='white')
    
    # Add combined legend
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', framealpha=0.7)
    
    # Add subtle grid
    ax1.grid(True, linestyle='--', alpha=0.2)
    
    # Improve layout
    plt.tight_layout()
    
    # Save the plot to a bytes buffer instead of a file
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=80, facecolor='black', pad_inches=0.1)
    buf.seek(0)
    plt.close()
    
    # Convert the plot to base64 for embedding in HTML
    img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
    img_src = f"data:image/png;base64,{img_str}"
    
    return jsonify({
        'status': 'success',
        'plot_data': img_src
    })

def run_server(host='127.0.0.1', port=5000, debug=True):
    """Function to run the server with specified parameters"""
    try:
        # Make sure no other process is using this port
        app.run(host=host, port=port, debug=debug, use_reloader=True)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Error: Port {port} is already in use. Try using a different port.")
            print("You can kill the existing process using: pkill -f 'python app.py'")
            sys.exit(1)
        else:
            raise

# Main entry point
if __name__ == '__main__':
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run the Pacman AI Game server')
    parser.add_argument('--host', default='127.0.0.1', help='Host to run the server on')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--no-debug', action='store_true', help='Disable debug mode')
    
    args = parser.parse_args()
    
    # Print startup message
    print(f"Starting Pacman AI Game server at http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop the server")
    
    # Run the server
    run_server(host=args.host, port=args.port, debug=not args.no_debug)     