import React from 'react';

export default function PlayerScreen({ gameState, socket }) {
  const myId = socket.id;
  const { phase, hotSeatPlayerId, guesses, currentQuestion, players } = gameState;

  // Hot Seat: Secret Phase
  if (phase === 'hotseat_secret') {
    if (myId === hotSeatPlayerId) {
      return (
        <div className="screen active">
           <p className="text-center bold">YOU are in the Hot Seat!</p>
           <p className="text-center">{currentQuestion?.text}</p>
           <div className="btn-col">
              <button className="paper-btn btn-pull" onClick={() => socket.emit('submitHotSeatChoice', 'pull')}>PULL 💀</button>
              <button className="paper-btn btn-wait" onClick={() => socket.emit('submitHotSeatChoice', 'wait')}>NOTHING 😇</button>
           </div>
        </div>
      );
    }
    const target = players.find(p => p.id === hotSeatPlayerId);
    return <div className="screen active text-center"><h2>Waiting for {target?.name}...</h2></div>;
  }

  // Hot Seat: Guessing Phase
  if (phase === 'hotseat_guessing') {
    if (myId === hotSeatPlayerId) {
      return <div className="screen active text-center"><h2>Don't give it away! 🤫</h2></div>;
    }
    if (guesses[myId]) {
      return <div className="screen active text-center"><h2>Guess Locked In. 🔒</h2></div>;
    }
    return (
      <div className="screen active">
         <p className="text-center">What did they pick?</p>
         <div className="btn-col">
            <button className="paper-btn btn-pull" onClick={() => socket.emit('submitGuess', 'pull')}>THEY PULLED 💀</button>
            <button className="paper-btn btn-wait" onClick={() => socket.emit('submitGuess', 'wait')}>THEY WAITED 😇</button>
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
                  <h2>No points this round.</h2>
              )}
          </div>
      );
  }
  
  // Lobby
  if (phase === 'lobby') return <div className="screen active text-center"><h2>Host is setting up...</h2></div>;

  return <div className="screen active text-center"><h2>Look at the TV</h2></div>;
}