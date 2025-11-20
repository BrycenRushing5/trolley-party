const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const allQuestions = require('./questions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// QR Code (Keep your URL)
let qrCodeDataUrl = '';
const myPublicUrl = "https://trolley-party.onrender.com"; 
QRCode.toDataURL(myPublicUrl, (err, url) => { if(!err) qrCodeDataUrl = url; });

// --- GAME STATE ---
let gameState = {
  phase: "lobby", 
  settings: { mode: "standard", vibe: "all", timer: 180, rounds: 5, anon: false },
  currentQuestion: null,
  questionIndex: 0,
  filteredQuestions: [],
  players: [], // { id, name, score: 0, stats: {} }
  
  // Hot Seat Specifics
  hotSeatPlayerId: null,
  hotSeatChoice: null, // 'pull' or 'wait'
  guesses: {}, // { playerId: 'pull' }
  timer: null,
  timeLeft: 0
};

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);
  socket.on("requestQrCode", () => { socket.emit("qrCodeData", qrCodeDataUrl); });

  // JOIN
  socket.on("joinGame", (name) => {
    const player = { id: socket.id, name: name, score: 0, stats: {} };
    gameState.players.push(player);
    io.emit("updateState", gameState);
  });

  // SETTINGS
  socket.on("updateSettings", (newSettings) => {
    // Merge new settings with existing (to keep defaults)
    gameState.settings = { ...gameState.settings, ...newSettings };
    io.emit("updateState", gameState);
  });

  // START GAME
  socket.on("startGame", () => {
    // Filter Questions
    let pool = allQuestions;
    if (gameState.settings.vibe !== 'all') {
      pool = allQuestions.filter(q => q.category === gameState.settings.vibe);
    }
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    gameState.filteredQuestions = pool;
    gameState.questionIndex = 0;
    gameState.players.forEach(p => p.score = 0); // Reset scores

    startRound();
  });

  // --- HOT SEAT LOGIC ---
  socket.on("submitHotSeatChoice", (choice) => {
    // 1. The Hot Seat player has chosen secretly
    gameState.hotSeatChoice = choice;
    
    // 2. Move to Guessing Phase
    gameState.phase = "hotseat_guessing";
    gameState.timeLeft = gameState.settings.timer; // Set timer from settings
    io.emit("updateState", gameState);

    // 3. Start Countdown
    clearInterval(gameState.timer);
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        io.emit("timerUpdate", gameState.timeLeft);
        if(gameState.timeLeft <= 0) {
            endHotSeatRound();
        }
    }, 1000);
  });

  socket.on("submitGuess", (guess) => {
    if(gameState.phase === "hotseat_guessing" && socket.id !== gameState.hotSeatPlayerId) {
        gameState.guesses[socket.id] = guess;
        io.emit("updateState", gameState);
        
        // Check if everyone has guessed (excluding hot seat player)
        const guessCount = Object.keys(gameState.guesses).length;
        const voters = gameState.players.length - 1; 
        if(guessCount >= voters) {
            endHotSeatRound();
        }
    }
  });

  socket.on("nextRound", () => {
      gameState.questionIndex++;
      if(gameState.questionIndex < gameState.settings.rounds && gameState.questionIndex < gameState.filteredQuestions.length) {
          startRound();
      } else {
          calculateProfiles();
          gameState.phase = "gameover";
          io.emit("updateState", gameState);
      }
  });

  socket.on("reset", () => {
    clearInterval(gameState.timer);
    gameState.phase = "lobby";
    gameState.players.forEach(p => { p.score = 0; p.stats = {}; });
    io.emit("updateState", gameState);
  });

  socket.on("disconnect", () => {
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    io.emit("updateState", gameState);
  });
});

// --- HELPER FUNCTIONS ---

function startRound() {
    gameState.currentQuestion = gameState.filteredQuestions[gameState.questionIndex];
    
    if(gameState.settings.mode === 'hotseat') {
        // Pick Random Hot Seat Player
        const randomPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)];
        gameState.hotSeatPlayerId = randomPlayer.id;
        gameState.hotSeatChoice = null;
        gameState.guesses = {};
        gameState.phase = "hotseat_secret";
    } else {
        // Standard Mode
        gameState.votes = { pull: 0, wait: 0 };
        gameState.phase = "voting";
    }
    io.emit("updateState", gameState);
}

function endHotSeatRound() {
    clearInterval(gameState.timer);
    gameState.phase = "round_summary";

    // Calculate Scores
    gameState.players.forEach(p => {
        // Hot Seat Player Profile Stats
        if(p.id === gameState.hotSeatPlayerId && gameState.hotSeatChoice) {
             let traits = gameState.hotSeatChoice === 'pull' 
                ? gameState.currentQuestion.optionPull.impact 
                : gameState.currentQuestion.optionWait.impact;
             for (let trait in traits) p.stats[trait] = (p.stats[trait] || 0) + traits[trait];
        }
        // Guessers Scoring
        else {
            const guess = gameState.guesses[p.id];
            if(guess === gameState.hotSeatChoice) {
                p.score += 3; // +3 Points for correct guess
                p.lastRoundPoints = 3;
            } else {
                p.lastRoundPoints = 0;
            }
        }
    });

    io.emit("updateState", gameState);
}

function calculateProfiles() {
    // Assign a "Badge" based on highest stat
    gameState.players.forEach(p => {
        let maxTrait = "Normie";
        let maxVal = 0;
        for(let [trait, val] of Object.entries(p.stats)) {
            if(val > maxVal) { maxVal = val; maxTrait = trait; }
        }
        // Map trait to Fun Name
        const titles = {
            utilitarian: "The Calculator",
            sadist: "The Menace",
            capitalist: "The Tycoon",
            chaos: "Agent of Chaos",
            saint: "The Saint",
            simp: "The Lover",
            petty: "The Petty King/Queen"
        };
        p.profileTitle = titles[maxTrait] || "The NPC";
    });
}

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));