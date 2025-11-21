import React from 'react';

export default function PlayerScreen({ gameState, socket }) {
  const myId = socket.id;
  const { phase, hotSeatPlayerId, guesses, currentQuestion, players } = gameState;

  // Intro explainer
  if (phase === 'hotseat_intro') {
    return (
      <div className="screen active text-center">
        <h1>Hot Seat</h1>
        <p>A random player will secretly choose Pull or Do Nothing.</p>
        <p className="muted">Round begins automatically…</p>
      </div>
    );
  }

  // Hot Seat: Secret Phase
  if (phase === 'hotseat_secret') {
    if (myId === hotSeatPlayerId) {
      return (
        <div className="screen active">
           <p className="text-center bold">YOU are in the Hot Seat!</p>
           <p className="text-center">{currentQuestion?.text}</p>
           <div className="btn-col hotseat-narrow">
              <button className="paper-btn btn-pull" onClick={() => socket.emit('submitHotSeatChoice', 'pull')}>PULL</button>
              <button className="paper-btn btn-wait" onClick={() => socket.emit('submitHotSeatChoice', 'wait')}>DO NOTHING</button>
           </div>
        </div>
      );
    }
    const target = players.find(p => p.id === hotSeatPlayerId);
      return <div className="screen active text-center"><h2>🤫 Waiting for a choice...</h2><div className="dot-bounce-seq large"><span>.</span><span>.</span><span>.</span></div></div>;
  }

  // Hot Seat: Guessing Phase
  if (phase === 'hotseat_guessing') {
    if (myId === hotSeatPlayerId) {
      return <div className="screen active text-center"><h2>Don't give it away.</h2></div>;
    }
    if (guesses[myId]) {
      return <div className="screen active text-center"><h2>Guess locked in.</h2></div>;
    }
    return (
      <div className="screen active">
         <p className="text-center">What did they pick?</p>
         <div className="btn-col hotseat-narrow">
            <button className="paper-btn btn-pull" onClick={() => socket.emit('submitGuess', 'pull')}>THEY PULLED</button>
            <button className="paper-btn btn-wait" onClick={() => socket.emit('submitGuess', 'wait')}>THEY DID NOTHING</button>
         </div>
      </div>
    );
  }

  // Summary
  if (phase === 'round_summary') {
      const me = players.find(p => p.id === myId);
      const gained = me ? me.lastRoundPoints : 0;
      return (
          <div className="screen active text-center">
              {gained > 0 ? (
                  <>
                    <h1 style={{fontSize:'4rem', color:'#2ed573'}}>+{gained}</h1>
                    <h3>Nice job!</h3>
                  </>
              ) : (
                  <>
                    <h2>You didn't earn any points this round.</h2>
                    <p>Total: {me ? me.score : 0} pts</p>
                  </>
              )}
          </div>
      );
  }

  if (phase === 'gameover') {
      const ordered = [...players].sort((a,b) => b.score - a.score);
      const place = ordered.findIndex(p => p.id === myId) + 1;
      const me = players.find(p => p.id === myId);
      return (
        <div className="screen active text-center">
          <h1>Game Over</h1>
          {place > 0 ? (
            <>
              <h2>You placed #{place}</h2>
              <p>{me ? me.score : 0} pts</p>
            </>
          ) : <p>Thanks for playing!</p>}
        </div>
      );
  }
  
  // Lobby
  if (phase === 'lobby') return <div className="screen active text-center"><h2>Host is setting up...</h2></div>;

  return <div className="screen active text-center"><h2>Look at the TV</h2></div>;
}
