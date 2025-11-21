import React, { useState, useEffect } from 'react';

export default function Dashboard({ gameState, socket }) {
  const [qrCode, setQrCode] = useState('');
  
  useEffect(() => {
    socket.on('qrCodeData', (url) => setQrCode(url));
    return () => socket.off('qrCodeData');
  }, []);

  const updateSetting = (key, val) => {
    const newSettings = { ...gameState.settings, [key]: val };
    socket.emit('updateSettings', newSettings);
  };

  // Helper to convert minutes to seconds for the server
  const handleTimerChange = (minutes) => {
    const seconds = parseInt(minutes) * 60;
    updateSetting('timer', seconds);
  };

  // Helper to get minutes from seconds for the input value
  const getMinutes = () => Math.floor(gameState.settings.timer / 60);

  return (
    // 1. Added wrapper for centering
    <div className="dashboard-wrapper">
      <div className="dashboard-panel">
        <div className="col-left">
          <h3>Scan to Join</h3>
          {qrCode && <img src={qrCode} className="qr-img" alt="QR" />}
          <h3>Players</h3>
          <ul className="player-list">
            {gameState.players.map(p => <li key={p.id}>{p.name}</li>)}
          </ul>
        </div>

        <div className="col-right">
          <label><strong>Game Mode:</strong></label>
          <div className="mode-grid">
            <div className={`mode-card ${gameState.settings.mode === 'standard' ? 'selected' : ''}`} 
                 onClick={() => updateSetting('mode', 'standard')}>
               <h4>Standard</h4><p>Majority wins.</p>
            </div>
            <div className={`mode-card ${gameState.settings.mode === 'hotseat' ? 'selected' : ''}`} 
                 onClick={() => updateSetting('mode', 'hotseat')}>
               <h4>Hot Seat</h4><p>Predict the player.</p>
            </div>
            {/* 2. Added back disabled modes for layout */}
            <div className="mode-card disabled">
               <h4>Debate</h4><p>Coming Soon</p>
            </div>
            <div className="mode-card disabled">
               <h4>Identity</h4><p>Coming Soon</p>
            </div>
          </div>

          {gameState.settings.mode === 'hotseat' && (
            <div className="settings-toolbar">
               {/* 3. Updated Settings UI with Minutes */}
               <div className="setting-input-group">
                 <label>Timer (mins):</label>
                 <input 
                   type="number" 
                   min="1" 
                   value={getMinutes()} 
                   onChange={(e) => handleTimerChange(e.target.value)} 
                 />
               </div>
               <div className="setting-input-group">
                 <label>Rounds:</label>
                 <input 
                   type="number" 
                   min="1" 
                   value={gameState.settings.rounds} 
                   onChange={(e) => updateSetting('rounds', parseInt(e.target.value))} 
                 />
               </div>
            </div>
          )}
          
          <div className="bottom-controls">
              <div className="vibe-row">
                 {['all', 'philosophy', 'party', 'dark'].map(v => (
                   <button key={v} 
                      className={`vibe-btn ${gameState.settings.vibe === v ? 'selected' : ''} ${v === 'dark' ? 'dark-vibe-btn' : ''}`}
                      onClick={() => updateSetting('vibe', v)}>
                      {v.toUpperCase()}
                   </button>
                 ))}
              </div>

              <button className="btn btn-success" style={{width:'100%'}} onClick={() => socket.emit('startGame')}>START GAME</button>
          </div>
        </div>
      </div>
    </div>
  );
}