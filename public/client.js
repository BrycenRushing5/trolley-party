const socket = io();
let myRole = 'spectator';
let currentSettings = { vibe: 'all', mode: 'standard', timer: 180, rounds: 5, anon: false };

// --- ACTIONS ---
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

// SETTINGS UI LOGIC
function setVibe(vibe) {
    currentSettings.vibe = vibe;
    document.querySelectorAll('.vibe-btn').forEach(e => e.classList.remove('selected'));
    document.getElementById(`vibe-${vibe}`).classList.add('selected');
    socket.emit('updateSettings', currentSettings);
}
function setMode(mode) {
    currentSettings.mode = mode;
    document.querySelectorAll('.mode-card').forEach(e => e.classList.remove('selected'));
    const card = document.getElementById(`card-${mode}`);
    if(card) card.classList.add('selected');
    
    // Toggle Settings Toolbar
    const toolbar = document.getElementById('hotseat-settings');
    toolbar.style.display = (mode === 'hotseat') ? 'flex' : 'none';
    
    socket.emit('updateSettings', currentSettings);
}
function updateSettings() {
    currentSettings.timer = parseInt(document.getElementById('set-timer').value);
    currentSettings.rounds = parseInt(document.getElementById('set-rounds').value);
    currentSettings.anon = document.getElementById('set-anon').checked;
    socket.emit('updateSettings', currentSettings);
}

// GAMEPLAY
function submitHotSeat(choice) {
    socket.emit('submitHotSeatChoice', choice);
    document.getElementById('secret-buttons').style.display = 'none';
    document.getElementById('player-status').innerText = "Shhh! Keep a straight face.";
    document.getElementById('player-status').style.display = 'block';
}
function submitVote(choice) {
    // Used for both Standard Vote and Hot Seat Guess
    if(currentSettings.mode === 'hotseat') socket.emit('submitGuess', choice); // Note: server handles 'submitVote' too, but let's be specific
    else socket.emit('submitVote', choice);

    // UI Feedback
    document.getElementById('guessing-buttons').style.display = 'none'; 
    document.getElementById('player-status').innerText = "Vote Locked.";
    document.getElementById('player-status').style.display = 'block';
}

// --- SOCKET UPDATES ---
socket.on('qrCodeData', (url) => { if(myRole==='host') document.getElementById('qr-code-img').src = url; });

socket.on('timerUpdate', (time) => {
    const el = document.getElementById('timer-display');
    if(el) el.innerText = time;
});

socket.on('updateState', (state) => {
    // Keep local settings in sync if we aren't the one touching them
    if(myRole !== 'host') currentSettings = state.settings;

    if(myRole === 'host') handleHostState(state);
    if(myRole === 'player') handlePlayerState(state);
});

function handleHostState(state) {
    // Update Lobby Lists
    document.getElementById('player-list').innerHTML = state.players.map(p => `<li>${p.name}</li>`).join('');

    // VIEW ROUTING
    if(state.phase === 'lobby') {
        showHostSection('host-lobby');
    } 
    else if(state.phase === 'hotseat_secret') {
        showHostSection('host-secret');
        const target = state.players.find(p => p.id === state.hotSeatPlayerId);
        document.getElementById('host-secret-msg').innerText = (target ? target.name : "Someone") + " is deciding...";
    }
    else if(state.phase === 'hotseat_guessing') {
        showHostSection('host-guessing');
        document.getElementById('question-text').innerText = state.currentQuestion.text;
        const target = state.players.find(p => p.id === state.hotSeatPlayerId);
        document.getElementById('target-name-display').innerText = target ? target.name : "Target";
    }
    else if(state.phase === 'round_summary') {
        showHostSection('host-summary');
        const sorted = [...state.players].sort((a,b) => b.score - a.score);
        document.getElementById('round-leaderboard').innerHTML = sorted.map((p, i) => 
            `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ccc; padding:5px;">
                <span>#${i+1} ${p.name}</span><span>${p.score} pts</span>
             </div>`
        ).join('');
        const target = state.players.find(p => p.id === state.hotSeatPlayerId);
        const choiceText = state.hotSeatChoice === 'pull' ? "PULLED!" : "DID NOTHING!";
        document.getElementById('summary-text').innerText = `${target.name} chose to... ${choiceText}`;
    }
    else if(state.phase === 'voting') {
         // Standard Mode
         showHostSection('host-game-standard');
         document.getElementById('std-question-text').innerText = state.currentQuestion.text;
         document.getElementById('score-pull').innerText = state.votes.pull;
         document.getElementById('score-wait').innerText = state.votes.wait;
         document.getElementById('btn-reveal').style.display = 'inline-block';
         document.getElementById('btn-next').style.display = 'none';
    }
    else if(state.phase === 'results') {
         // Standard Results
         showHostSection('host-game-standard');
         document.getElementById('btn-reveal').style.display = 'none';
         document.getElementById('btn-next').style.display = 'inline-block';
    }
    else if(state.phase === 'gameover') {
        showHostSection('host-gameover');
        // Populate final leaderboard
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
                document.getElementById('player-status').innerText = "Locked in.";
            }
        }
    }
    else if(state.phase === 'voting') {
        // Standard Mode
        document.getElementById('player-status').style.display = 'none';
        document.getElementById('guessing-buttons').style.display = 'flex'; // Reuse guessing buttons
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

function showHostSection(id) {
    document.querySelectorAll('.main-content').forEach(el => el.style.display = 'none');
    // Also hide the dashboard-panel specifically if it's the lobby
    if(id !== 'host-lobby') document.querySelector('.dashboard-panel').parentElement.style.display = 'none';
    
    const el = document.getElementById(id);
    if(el) el.style.display = 'flex';
}