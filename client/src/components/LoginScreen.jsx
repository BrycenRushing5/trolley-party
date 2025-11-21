import React, { useState, useEffect } from 'react';

export default function LoginScreen({ onJoin, onHost }) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(true); // Toggle between Join and Host

  // Check URL for room code (from QR Code)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) setRoomCode(code);
  }, []);

  const handleJoinClick = () => {
    if (!name || !roomCode) return alert("Please enter Name and Room Code");
    onJoin(name, roomCode);
  };

  return (
    <div className="screen active main-content">
      <div className="login-card">
        <h1 className="logo-title">Absurd Trolley</h1>
        
        {/* TOGGLE SWITCH */}
        <div className="login-toggle">
          <button className={`toggle-btn ${isJoining ? 'active' : ''}`} onClick={() => setIsJoining(true)}>Join Game</button>
          <button className={`toggle-btn ${!isJoining ? 'active' : ''}`} onClick={() => setIsJoining(false)}>Host New</button>
        </div>

        <div className="login-body">
          {isJoining ? (
            <div className="login-form">
              <label className="field-label">Room Code</label>
              <input 
                type="text" 
                placeholder="ROOM CODE" 
                value={roomCode}
                maxLength={4}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="input-std room-code-input"
              />
              <label className="field-label">Your Name</label>
              <input 
                type="text" 
                placeholder="YOUR NAME" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-std"
              />
              <button className="btn btn-primary wide-btn" onClick={handleJoinClick}>Enter Party</button>
            </div>
          ) : (
            <div className="login-form">
               <p className="helper-text">Start a new game on this screen (TV/Laptop)</p>
               <button className="btn btn-success wide-btn" onClick={onHost}>Create New Room</button>
               <p className="helper-text subtle">Already have a room? Switch to "Join Game" and enter code as Host.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
