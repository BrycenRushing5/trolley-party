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

  return (
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
        </div>

        {gameState.settings.mode === 'hotseat' && (
          <div className="settings-toolbar">
             <span>⏱️ <input type="number" value={gameState.settings.timer} onChange={(e) => updateSetting('timer', parseInt(e.target.value))} /></span>
             <span>🔄 <input type="number" value={gameState.settings.rounds} onChange={(e) => updateSetting('rounds', parseInt(e.target.value))} /></span>
          </div>
        )}

        <div className="vibe-row">
           {['all', 'philosophy', 'party', 'dark'].map(v => (
             <button key={v} 
                className={`vibe-btn ${gameState.settings.vibe === v ? 'selected' : ''}`}
                onClick={() => updateSetting('vibe', v)}>
                {v.toUpperCase()}
             </button>
           ))}
        </div>

        <button className="btn btn-success" style={{width:'100%', marginTop:'auto'}} onClick={() => socket.emit('startGame')}>START GAME</button>
      </div>
    </div>
  );
}