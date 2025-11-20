const socket = io();
let myRole = 'spectator';
let currentSettings = { vibe: 'all', mode: 'standard', timer: 180, rounds: 5, anon: false };

// --- USER ACTIONS ---
function joinGame() {
  const name = document.getElementById('username').value || 'Guest';
  socket.emit('joinGame', name);
  myRole = 'player';
  switchView('view-player');
}

function becomeHost() {
  myRole = 'host';
  switchView('view-host');
  socket.emit('requestQrCode');
}

// --- SETTINGS UI LOGIC ---
function setVibe(vibe) {
    currentSettings.vibe = vibe;
    // Update visual state locally immediately for snappiness
    document.querySelectorAll('.vibe-btn').forEach(e => e.classList.remove('selected'));
    const btn = document.getElementById(`vibe-${vibe}`);
    if(btn) btn.classList.add('selected');
    
    socket.emit('updateSettings', currentSettings);
}

function setMode(mode) {
    currentSettings.mode = mode;
    
    // Update visual state
    document.querySelectorAll('.mode-card').forEach(e => e.classList.remove('selected'));
    const card = document.getElementById(`card-${mode}`);
    if(card) card.classList.add('selected');
    
    // Toggle Settings Toolbar visibility
    const toolbar = document.getElementById('hotseat-settings');
    if(toolbar) {
        toolbar.style.display = (mode === 'hotseat') ? 'flex' : 'none';
    }
    
    socket.emit('updateSettings', currentSettings);
}

function updateSettings() {
    currentSettings.timer = parseInt(document.getElementById('set-timer').value);
    currentSettings.rounds = parseInt(document.getElementById('set-rounds').value);
    currentSettings.anon = document.getElementById('set-anon').checked;
    socket.emit('updateSettings', currentSettings);
}

// --- GAMEPLAY ACTIONS ---
function submitHotSeat(choice) {
    socket.emit('submitHotSeatChoice', choice);
    document.getElementById('secret-buttons').style.display = 'none';
    document.getElementById('player-status').innerText = "Shhh! Keep a straight face.";
    document.getElementById('player-status').style.display = 'block';
}

function submitVote(choice) {
    // Use 'submitGuess' for Hot Seat mode, 'submitVote' for Standard
    if(currentSettings.mode === 'hotseat') {
        socket.emit('submitGuess', choice);
    } else {
        socket.emit('submitVote', choice);
    }

    // UI Feedback
    document.getElementById('guessing-buttons').style.display = 'none'; 
    document.getElementById('player-status').innerText = "Vote Locked.";
    document.getElementById('player-status').style.display = 'block';
}

// --- SOCKET LISTENERS ---

socket.on('qrCodeData', (url) => { 
    if(myRole === 'host') {
        const img = document.getElementById('qr-code-img');
        if(img) img.src = url;
    }
});

socket.on('timerUpdate', (time) => {
    const el = document.getElementById('timer-display');
    if(el) el.innerText = time;
});

socket.on('voterUpdate', (data) => {
    const el = document.getElementById('voter-count-display');
    if(el) el.innerText = `${data.count} / ${data.total} Voted`;
});

socket.on('updateState', (state) => {
    // Sync local settings if we aren't the host
    if(myRole !== 'host') currentSettings = state.settings;

    // --- AUDIO LOGIC (Host Only) ---
    if(myRole === 'host') {
        const audio = document.getElementById('bg-music');
        if(audio) {
            // Play music if game is active (not in lobby, not gameover)
            if(state.phase !== 'lobby' && state.phase !== 'gameover') {
                if(audio.paused) {
                    audio.play().catch(e => console.log("Audio play failed (interaction needed):", e));
                }
            } else {
                audio.pause();
                audio.currentTime = 0;
            }
        }
    }

    if(myRole === 'host') handleHostState(state);
    if(myRole === 'player') handlePlayerState(state);
});

// --- VIEW HANDLERS ---

function handleHostState(state) {
    // 1. Update Lobby List (Always visible in lobby mode)
    const list = document.getElementById('player-list');
    if(list) {
        list.innerHTML = state.players.map(p => `<li>${p.name}</li>`).join('');
    }

    // 2. Manage Views (Dashboard vs Game Screens)
    
    // Helper: Hide everything first
    document.querySelectorAll('.screen-overlay').forEach(el => el.style.display = 'none');
    const dashboardContainer = document.querySelector('.dashboard-panel');
    
    if(state.phase === 'lobby') {
        // Show Lobby
        if(dashboardContainer) dashboardContainer.parentElement.style.display = 'flex';
    } 
    else {
        // Hide Lobby
        if(dashboardContainer) dashboardContainer.parentElement.style.display = 'none';

        // Show Specific Game Screen based on phase
        if(state.phase === 'hotseat_secret') {
             document.getElementById('host-secret').style.display = 'flex';
             const target = state.players.find(p => p.id === state.hotSeatPlayerId);
             document.getElementById('host-secret-msg').innerText = (target ? target.name : "Someone") + " is deciding...";
        }
        else if(state.phase === 'hotseat_guessing') {
             document.getElementById('host-guessing').style.display = 'flex';
             document.getElementById('question-text').innerText = state.currentQuestion.text;
             const target = state.players.find(p => p.id === state.hotSeatPlayerId);
             document.getElementById('target-name-display').innerText = target ? target.name : "Target";
        }
        else if(state.phase === 'round_summary') {
             document.getElementById('host-summary').style.display = 'flex';
             
             // Populate Leaderboard
             const sorted = [...state.players].sort((a,b) => b.score - a.score);
             document.getElementById('round-leaderboard').innerHTML = sorted.map((p, i) => 
                `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ccc; padding:5px; font-size: 1.5rem;">
                    <span>#${i+1} ${p.name}</span><span>${p.score} pts</span>
                 </div>`
             ).join('');
             
             // Summary Text
             const target = state.players.find(p => p.id === state.hotSeatPlayerId);
             if(target) {
                 const choiceText = state.hotSeatChoice === 'pull' ? "PULLED THE LEVER!" : "DID NOTHING!";
                 document.getElementById('summary-text').innerText = `${target.name} chose to... ${choiceText}`;
             }
        }
        else if(state.phase === 'voting') {
             // Standard Mode
             document.getElementById('host-game-standard').style.display = 'flex';
             document.getElementById('std-question-text').innerText = state.currentQuestion.text;
             document.getElementById('score-pull').innerText = state.votes.pull;
             document.getElementById('score-wait').innerText = state.votes.wait;
             
             document.getElementById('btn-reveal').style.display = 'inline-block';
             document.getElementById('btn-next').style.display = 'none';
        }
        else if(state.phase === 'results') {
             // Standard Results
             document.getElementById('host-game-standard').style.display = 'flex';
             document.getElementById('btn-reveal').style.display = 'none';
             document.getElementById('btn-next').style.display = 'inline-block';
        }
        else if(state.phase === 'gameover') {
            document.getElementById('host-gameover').style.display = 'flex';
            const sorted = [...state.players].sort((a,b) => b.score - a.score);
            document.getElementById('final-leaderboard').innerHTML = sorted.map((p, i) => 
                `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #000; padding:10px; font-size: 1.5rem;">
                    <span>#${i+1} ${p.name}</span><span>${p.score} pts</span>
                 </div>`
            ).join('');
        }
    }
}

function handlePlayerState(state) {
    resetPlayerUI();
    
    if(state.phase === 'lobby') {
        document.getElementById('player-status').innerText = "Host is choosing settings...";
    }
    else if(state.phase === 'hotseat_secret') {
        if(socket.id === state.hotSeatPlayerId) {
            document.getElementById('player-status').style.display = 'none';
            document.getElementById('secret-buttons').style.display = 'flex';
            document.getElementById('mobile-question-text').innerText = state.currentQuestion.text;
        } else {
            const target = state.players.find(p => p.id === state.hotSeatPlayerId);
            document.getElementById('player-status').innerText = `Waiting for ${target ? target.name : 'Target'}...`;
        }
    }
    else if(state.phase === 'hotseat_guessing') {
        if(socket.id === state.hotSeatPlayerId) {
            document.getElementById('player-status').innerText = "Don't give it away!";
        } else {
            if(!state.guesses[socket.id]) {
                document.getElementById('player-status').style.display = 'none';
                document.getElementById('guessing-buttons').style.display = 'flex';
            } else {
                document.getElementById('player-status').innerText = "Locked in. Check TV.";
            }
        }
    }
    else if(state.phase === 'round_summary') {
        document.getElementById('player-status').style.display = 'none';
        
        const me = state.players.find(p => p.id === socket.id);
        const gained = me ? me.lastRoundPoints : 0;
        
        // Only show animation if points were gained
        if(gained > 0) {
             document.getElementById('player-feedback').style.display = 'block';
             const pointsText = document.getElementById('points-anim');
             pointsText.innerText = `+${gained}`;
             pointsText.style.color = '#2ed573';
        } else {
             document.getElementById('player-status').style.display = 'block';
             document.getElementById('player-status').innerText = "No points this round.";
        }
        
        const sorted = [...state.players].sort((a,b) => b.score - a.score);
        const rank = sorted.findIndex(p => p.id === socket.id) + 1;
        document.getElementById('rank-display').innerText = `Rank: #${rank}`;
    }
    else if(state.phase === 'voting') {
        // Standard Mode
        document.getElementById('player-status').style.display = 'none';
        document.getElementById('guessing-buttons').style.display = 'flex'; 
    }
}

function resetPlayerUI() {
    document.getElementById('player-status').style.display = 'block';
    document.getElementById('secret-buttons').style.display = 'none';
    document.getElementById('guessing-buttons').style.display = 'none';
    document.getElementById('player-feedback').style.display = 'none';
}

function switchView(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}