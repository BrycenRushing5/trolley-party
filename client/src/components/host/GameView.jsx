import React, { useEffect, useState } from 'react';

export default function GameView({ gameState, socket }) {
  const [timer, setTimer] = useState('--');
  const [votes, setVotes] = useState({ count: 0, total: 0, remaining: 0 });
  const displayTimer = timer !== '--' ? timer : (gameState.timeLeft ?? '--');

  useEffect(() => {
    socket.on('timerUpdate', t => setTimer(t));
    socket.on('voterUpdate', v => setVotes(v));
    return () => {
      socket.off('timerUpdate');
      socket.off('voterUpdate');
    };
  }, []);

  // Loading / intro explainer
  if (gameState.phase === 'hotseat_intro') {
    return (
      <div className="screen-overlay intro-card">
        <div className="intro-graphic">
          <img src="/hotseat-info.jpg" alt="Hot Seat illustration" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>
        <div className="intro-copy">
          <div className="pill">Hot Seat loading... {displayTimer}s</div>
          <h1>Hot Seat</h1>
          <p>The host picks one random player. They secretly decide to <strong>pull</strong> or <strong>do nothing</strong> on the trolley track.</p>
          <p>Everyone else talks it out and votes on what they think that player chose. Match their choice to earn points.</p>
          <p className="muted">Round starts automatically when the timer hits zero.</p>
          <div className="intro-name">
            🤫 Shhh... someone will be deciding soon <span className="dot-bounce-seq"><span>.</span><span>.</span><span>.</span></span> <span className="eyes-shift">👀</span>
          </div>
        </div>
      </div>
    );
  }

  // Hot Seat: Secret Phase
  if (gameState.phase === 'hotseat_secret') {
    const target = gameState.players.find(p => p.id === gameState.hotSeatPlayerId);
    return (
      <div className="screen-overlay">
        <h1>🤫 Shhh...</h1>
        <h2>{target ? target.name : 'Someone'} is deciding <span className="dot-bounce-seq"><span>.</span><span>.</span><span>.</span></span></h2>
        <div className="eyes-shift" aria-hidden>👀</div>
      </div>
    );
  }

  // Hot Seat: Guessing Phase
  if (gameState.phase === 'hotseat_guessing') {
    const target = gameState.players.find(p => p.id === gameState.hotSeatPlayerId);
    const remaining = Math.max(0, (votes.remaining ?? (votes.total - votes.count)));
    return (
      <div className="screen-overlay">
        <div className="big-timer">{displayTimer}</div>
        <h2>Guess what <u>{target ? target.name : 'Target'}</u> chose!</h2>
        <div className="voter-pill">{remaining} votes remaining</div>
        <h1 className="question-text">{gameState.currentQuestion?.text}</h1>
        <div className="row">
           <div className="col-6 text-center"><h2 style={{color:'#ff4757'}}>PULL</h2></div>
           <div className="col-6 text-center"><h2 style={{color:'#2ed573'}}>DO NOTHING</h2></div>
        </div>
        <button className="btn btn-small mt-20" onClick={() => socket.emit('forceEndHotSeat')}>Force Reveal</button>
      </div>
    );
  }
  
  // Standard Voting
  if (gameState.phase === 'voting') {
    return (
       <div className="screen-overlay">
          <h1>{gameState.currentQuestion?.text}</h1>
          <div className="row">
             <div className="col-6 text-center">
                 <h2 style={{color:'#ff4757'}}>PULL</h2>
                 <div className="vote-count">{gameState.votes.pull}</div>
             </div>
             <div className="col-6 text-center">
                 <h2 style={{color:'#2ed573'}}>NOTHING</h2>
                 <div className="vote-count">{gameState.votes.wait}</div>
             </div>
          </div>
          <button className="btn btn-warning mt-20" onClick={() => socket.emit('endRound')}>Reveal</button>
       </div>
    );
  }

  return <div>Loading Game View...</div>;
}
