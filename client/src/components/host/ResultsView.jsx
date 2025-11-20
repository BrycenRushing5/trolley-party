import React from 'react';

export default function ResultsView({ gameState, socket }) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  if (gameState.phase === 'gameover') {
    return (
      <div className="screen-overlay">
        <h1>GAME OVER</h1>
        <div className="leaderboard-box">
           {sortedPlayers.map((p, i) => (
              <div key={p.id} className="leaderboard-row">
                  <span>#{i+1} {p.name}</span><span>{p.score} pts</span>
              </div>
           ))}
        </div>
        <button className="btn btn-danger mt-20" onClick={() => socket.emit('reset')}>Back to Lobby</button>
      </div>
    );
  }

  // Round Summary
  const results = gameState.roundResults;
  return (
    <div className="screen-overlay">
      <h2>Round Results</h2>
      {results && (
          <div className="summary-box">
              <h3>{results.hotSeatName} decided to...</h3>
              <h1 style={{color: results.choice === 'pull' ? '#ff4757' : '#2ed573'}}>
                  {results.choice === 'pull' ? 'PULL 💀' : 'DO NOTHING 😇'}
              </h1>
              <p>Correct Guesses: {results.correctPlayers.length > 0 ? results.correctPlayers.join(', ') : 'None!'}</p>
          </div>
      )}

      <div className="leaderboard-box">
           {sortedPlayers.slice(0, 5).map((p, i) => (
              <div key={p.id} className="leaderboard-row">
                  <span>#{i+1} {p.name}</span><span>{p.score} pts</span>
              </div>
           ))}
      </div>

      <button className="btn btn-primary mt-20" onClick={() => socket.emit('nextRound')}>Next Round</button>
    </div>
  );
}