import React, { useEffect, useState } from 'react';

export default function GameView({ gameState, socket }) {
  const [timer, setTimer] = useState('--');
  const [votes, setVotes] = useState({ count: 0, total: 0 });

  useEffect(() => {
    socket.on('timerUpdate', t => setTimer(t));
    socket.on('voterUpdate', v => setVotes(v));
    return () => {
      socket.off('timerUpdate');
      socket.off('voterUpdate');
    };
  }, []);

  // Hot Seat: Secret Phase
  if (gameState.phase === 'hotseat_secret') {
    const target = gameState.players.find(p => p.id === gameState.hotSeatPlayerId);
    return (
      <div className="screen-overlay">
        <h1>🤫 Shhh...</h1>
        <h2>{target ? target.name : 'Someone'} is deciding...</h2>
        <div style={{fontSize:'8rem'}}>👀</div>
      </div>
    );
  }

  // Hot Seat: Guessing Phase
  if (gameState.phase === 'hotseat_guessing') {
    const target = gameState.players.find(p => p.id === gameState.hotSeatPlayerId);
    return (
      <div className="screen-overlay">
        <div className="big-timer">{timer}</div>
        <h2>Guess what <u>{target ? target.name : 'Target'}</u> chose!</h2>
        <div className="voter-pill">{votes.count} / {votes.total} Voted</div>
        <h1>{gameState.currentQuestion?.text}</h1>
        
        <div className="row">
           <div className="col-6 text-center"><h2 style={{color:'#ff4757'}}>PULL</h2></div>
           <div className="col-6 text-center"><h2 style={{color:'#2ed573'}}>NOTHING</h2></div>
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