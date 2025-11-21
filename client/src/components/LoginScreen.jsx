import React, { useState } from 'react';

export default function LoginScreen({ onJoin, onHost }) {
  const [name, setName] = useState('');

  return (
    // Added 'main-content' here to force centering
    <div className="screen active main-content">
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Absurd Trolley</h1>
      
      <input 
        type="text" 
        placeholder="Enter Name" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ 
            textAlign: 'center', 
            fontSize: '1.5rem', 
            marginBottom: '20px',
            padding: '10px',
            fontFamily: 'inherit'
        }}
      />
      
      <button 
          className="btn btn-primary" 
          style={{ fontSize: '1.5rem', padding: '15px 30px' }}
          onClick={() => onJoin(name || 'Guest')}
      >
        Join Party
      </button>

      <div style={{ marginTop: '50px', opacity: 0.6 }}>
        <button className="btn btn-small" onClick={onHost}>I am the Host (TV)</button>
      </div>
    </div>
  );
}