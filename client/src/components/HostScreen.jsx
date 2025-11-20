import React, { useEffect, useState, useRef } from 'react';
import Dashboard from './host/Dashboard';
import GameView from './host/GameView';
import ResultsView from './host/ResultsView';

export default function HostScreen({ gameState, socket }) {
  const audioRef = useRef(null);
  
  // Auto-play music logic
  useEffect(() => {
    if (gameState.phase !== 'lobby' && gameState.phase !== 'gameover') {
      audioRef.current?.play().catch(e => console.log("Audio blocked"));
    } else {
      audioRef.current?.pause();
    }
  }, [gameState.phase]);

  return (
    <div className="screen active">
      <audio ref={audioRef} loop>
        <source src="https://upload.wikimedia.org/wikipedia/commons/5/5c/The_Entertainer_-_Scott_Joplin.ogg" type="audio/ogg" />
      </audio>

      {gameState.phase === 'lobby' && (
        <Dashboard gameState={gameState} socket={socket} />
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