import React, { useState, useEffect } from 'react';

export default function Dashboard({ gameState, socket, roomCode }) {
  const [qrCode, setQrCode] = useState('');
  const [infoMode, setInfoMode] = useState(null);
  
  useEffect(() => {
    socket.on('qrCodeData', (url) => setQrCode(url));
    return () => socket.off('qrCodeData');
  }, []);

  const updateSetting = (key, val) => {
    const newSettings = { ...gameState.settings, [key]: val };
    socket.emit('updateSettings', newSettings);
  };

  const handleTimerChange = (minutes) => {
    const seconds = parseInt(minutes) * 60;
    updateSetting('timer', seconds);
  };

  const getMinutes = () => Math.floor(gameState.settings.timer / 60);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-panel">
        
        {/* LEFT COLUMN */}
        <div className="col-left">
          <h3>Join Code: <span style={{color:'#ff4757', fontSize:'2.5rem'}}>{roomCode}</span></h3>
          {qrCode && <img src={qrCode} className="qr-img" alt="QR" />}
          <h3>Players ({gameState.players.length})</h3>
          <ul className="player-list">
            {gameState.players.map(p => <li key={p.id}>{p.name}</li>)}
          </ul>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-right">
          
          {/* Header */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <label><strong>Game Mode:</strong></label>
          </div>

          <div className="mode-grid">
            <div className={`mode-card ${gameState.settings.mode === 'standard' ? 'selected' : ''}`} 
                 onClick={() => updateSetting('mode', 'standard')}>
               <div className="mode-card-header">
                 <div>
                   <h4>Standard</h4><p>Majority wins.</p>
                 </div>
                 <button className="info-btn" onClick={(e) => { e.stopPropagation(); setInfoMode('standard'); }}>i</button>
               </div>
            </div>
            <div className={`mode-card ${gameState.settings.mode === 'hotseat' ? 'selected' : ''}`} 
                 onClick={() => updateSetting('mode', 'hotseat')}>
               <div className="mode-card-header">
                 <div>
                   <h4>Hot Seat</h4><p>Predict the player.</p>
                 </div>
                 <button className="info-btn" onClick={(e) => { e.stopPropagation(); setInfoMode('hotseat'); }}>i</button>
               </div>
            </div>
            <div className="mode-card disabled"><h4>Debate</h4><p>Coming Soon</p></div>
            <div className="mode-card disabled"><h4>Identity</h4><p>Coming Soon</p></div>
          </div>

          {gameState.settings.mode === 'hotseat' && (
            <div className="settings-toolbar">
               <div className="setting-input-group">
                 <label>Timer (mins):</label>
                 <input type="number" min="1" value={getMinutes()} onChange={(e) => handleTimerChange(e.target.value)} />
               </div>
               <div className="setting-input-group">
                 <label>Rounds:</label>
                 <input type="number" min="1" value={gameState.settings.rounds} onChange={(e) => updateSetting('rounds', parseInt(e.target.value))} />
               </div>
            </div>
          )}

          <div className="bottom-controls">
              <div className="vibe-label">Vibe</div>
              <div className="vibe-row">
                 {['all', 'philosophy', 'party', 'dark'].map(v => (
                   <button key={v} 
                      /* FIXED: Only apply dark class if it is the dark button */
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

      {infoMode && (
        <div className="info-modal">
          <div className="info-card">
            <button className="info-close" onClick={() => setInfoMode(null)}>×</button>
            {infoMode === 'standard' && (
              <>
                <h3>Standard Mode</h3>
                <p>Everyone sees the trolley dilemma and votes. Majority choice wins the round.</p>
              </>
            )}
            {infoMode === 'hotseat' && (
              <>
                <h3>Hot Seat</h3>
                <p>One random player secretly chooses <strong>Pull</strong> or <strong>Do Nothing</strong>. Everyone else debates and votes on what they think that player chose. Match them to earn points.</p>
                <p className="muted">This explainer also appears for 10 seconds the first time Hot Seat starts.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
