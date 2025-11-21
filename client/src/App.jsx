import { useState, useEffect } from 'react';
import { socket } from './socket';
import LoginScreen from './components/LoginScreen';
import HostScreen from './components/HostScreen';
import PlayerScreen from './components/PlayerScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [myRole, setMyRole] = useState('spectator'); 

  useEffect(() => {
    socket.on('updateState', (state) => setGameState(state));
    
    // Handle Creation Success
    socket.on('gameCreated', ({ roomCode, state }) => {
        setRoomCode(roomCode);
        setGameState(state);
        setMyRole('host');
    });

    socket.on('error', (msg) => alert(msg));

    return () => {
      socket.off('updateState');
      socket.off('gameCreated');
      socket.off('error');
    };
  }, []);

  const handleJoin = (name, code) => {
    // If name is "HOST" (case insensitive), we treat them as a rejoining host
    const isHostRejoin = name.toUpperCase() === 'HOST';
    socket.emit('joinGame', { roomCode: code, name, isHost: isHostRejoin });
    setMyRole(isHostRejoin ? 'host' : 'player');
    setRoomCode(code);
  };

  const handleHostCreate = () => {
    socket.emit('hostCreateGame');
  };

  // 1. Login Screen
  if (!gameState) {
      return <LoginScreen onJoin={handleJoin} onHost={handleHostCreate} />;
  }

  // 2. Host Screen
  if (myRole === 'host') {
    return <HostScreen gameState={gameState} socket={socket} roomCode={roomCode} />;
  }

  // 3. Player Screen
  if (myRole === 'player') {
    return <PlayerScreen gameState={gameState} socket={socket} />;
  }
}

export default App;