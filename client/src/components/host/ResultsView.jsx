import React from 'react';

export default function ResultsView({ gameState, socket }) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const podium = sortedPlayers.slice(0, 3);
  const others = sortedPlayers.slice(3);

  if (gameState.phase === 'gameover') {
    return (
      <div className="screen-overlay">
        <h1>Final Standings</h1>
        <div className="podium">
          <div className="podium-slot second">
            <div className="step step-2">2</div>
            {podium[1] && <div className="podium-name">{podium[1].name}</div>}
            {podium[1] && <div className="podium-score">{podium[1].score} pts</div>}
          </div>
          <div className="podium-slot first">
            <div className="step step-1">1</div>
            {podium[0] && <div className="podium-name">{podium[0].name}</div>}
            {podium[0] && <div className="podium-score">{podium[0].score} pts</div>}
          </div>
          <div className="podium-slot third">
            <div className="step step-3">3</div>
            {podium[2] && <div className="podium-name">{podium[2].name}</div>}
            {podium[2] && <div className="podium-score">{podium[2].score} pts</div>}
          </div>
        </div>
        {others.length > 0 && (
          <div className="leaderboard-box">
            {others.map((p, i) => (
              <div key={p.id} className="leaderboard-row">
                <span>#{i + 4} {p.name}</span><span>{p.score} pts</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-danger mt-20" onClick={() => socket.emit('resetGame')}>Back to Lobby</button>
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
                  {results.choice === 'pull' ? 'PULL' : 'DO NOTHING'}
              </h1>
              <p>Correct Guesses: {results.correctPlayers.length > 0 ? results.correctPlayers.join(', ') : 'None'}</p>
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
