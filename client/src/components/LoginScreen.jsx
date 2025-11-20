import React, { useState } from 'react';

export default function LoginScreen({ onJoin, onHost }) {
  const [name, setName] = useState('');

  return (
    <div className="screen active">
      <h1>Absurd Trolley</h1>
      <input 
        type="text" 
        placeholder="Enter Name" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-name"
      />
      <button className="btn btn-primary" onClick={() => onJoin(name || 'Guest')}>
        Join Party
      </button>
      <div style={{ marginTop: '50px', opacity: 0.6 }}>
        <button className="btn btn-small" onClick={onHost}>I am the Host (TV)</button>
      </div>
    </div>
  );
}