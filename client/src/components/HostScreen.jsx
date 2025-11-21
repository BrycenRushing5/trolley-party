import React, { useEffect, useState, useRef } from 'react';
import Dashboard from './host/Dashboard';
import GameView from './host/GameView';
import ResultsView from './host/ResultsView';

export default function HostScreen({ gameState, socket, roomCode }) {
  const audioRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Auto-play music logic
  useEffect(() => {
    if (!audioEnabled) {
      audioRef.current?.pause();
      return;
    }
    if (gameState.phase !== 'lobby' && gameState.phase !== 'gameover') {
      audioRef.current?.play().catch(e => console.log("Audio blocked"));
    } else {
      audioRef.current?.pause();
    }
  }, [gameState.phase, audioEnabled]);

  const handleToggleAudio = () => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (!next) {
        audioRef.current?.pause();
      } else if (gameState.phase !== 'lobby' && gameState.phase !== 'gameover') {
        audioRef.current?.play().catch(e => console.log("Audio blocked"));
      }
      return next;
    });
  };

  const handleReset = () => {
    if (confirm('Reset room and remove all players?')) {
      socket.emit('resetGame');
    }
  };

  return (
    <div className="screen active host-screen">
      <div className="host-floating-actions">
        <button className="btn-fade" onClick={handleReset}>Reset</button>
        <button 
          className={`btn-fade ${audioEnabled ? '' : 'muted'}`} 
          onClick={handleToggleAudio}
          aria-label="Toggle audio"
        >
          🔈
        </button>
      </div>

      <audio ref={audioRef} loop>
        <source src="https://upload.wikimedia.org/wikipedia/commons/5/5c/The_Entertainer_-_Scott_Joplin.ogg" type="audio/ogg" />
      </audio>

      {gameState.phase === 'lobby' && (
        <Dashboard 
          gameState={gameState} 
          socket={socket} 
          roomCode={roomCode} 
        />
      )}

      {(gameState.phase.startsWith('hotseat') || gameState.phase === 'voting') && (
        <GameView gameState={gameState} socket={socket} />
      )}

      {(gameState.phase === 'round_summary' || gameState.phase === 'results' || gameState.phase === 'gameover') && (
        <ResultsView gameState={gameState} socket={socket} />
      )}
    </div>
  );
}
