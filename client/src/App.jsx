import { useState, useEffect } from 'react';
import { socket } from './socket';
import LoginScreen from './components/LoginScreen';
import HostScreen from './components/HostScreen';
import PlayerScreen from './components/PlayerScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState('spectator'); // 'spectator', 'host', 'player'

  useEffect(() => {
    socket.on('updateState', (state) => setGameState(state));
    return () => socket.off('updateState');
  }, []);

  const handleJoin = (name) => {
    socket.emit('joinGame', name);
    setMyRole('player');
  };

  const handleHost = () => {
    socket.emit('requestQrCode');
    setMyRole('host');
  };

  if (!gameState) return <div className="loading">Loading Party...</div>;

  if (myRole === 'spectator') {
    return <LoginScreen onJoin={handleJoin} onHost={handleHost} />;
  }
  if (myRole === 'host') {
    return <HostScreen gameState={gameState} socket={socket} />;
  }
  if (myRole === 'player') {
    return <PlayerScreen gameState={gameState} socket={socket} />;
  }
}

export default App;