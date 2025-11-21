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

  return (
    <div className="container">
      {/* Screen Logic */}
      {myRole === 'spectator' && <LoginScreen onJoin={handleJoin} onHost={handleHost} />}
      {myRole === 'host' && <HostScreen gameState={gameState} socket={socket} />}
      {myRole === 'player' && <PlayerScreen gameState={gameState} socket={socket} />}
    </div>
  );
}

export default App;