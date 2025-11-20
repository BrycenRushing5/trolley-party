const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const allQuestions = require('./questions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// --- SETUP ---
let qrCodeDataUrl = '';
const myPublicUrl = "https://trolley-party.onrender.com"; // Your URL
QRCode.toDataURL(myPublicUrl, (err, url) => { if(!err) qrCodeDataUrl = url; });

// --- GAME STATE ---
let gameState = {
  phase: "lobby", 
  settings: { mode: "standard", vibe: "all", timer: 180, rounds: 5, anon: false },
  currentQuestion: null,
  questionIndex: 0,
  filteredQuestions: [],
  players: [],
  
  // Hot Seat Variables
  hotSeatPlayerId: null,
  hotSeatChoice: null,
  guesses: {}, 
  votes: { pull: 0, wait: 0 }, // Standard mode votes
  timer: null,
  timeLeft: 0
};

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);
  socket.on("requestQrCode", () => { socket.emit("qrCodeData", qrCodeDataUrl); });

  socket.on("joinGame", (name) => {
    const player = { id: socket.id, name: name, score: 0, stats: {} };
    gameState.players.push(player);
    io.emit("updateState", gameState);
  });

  socket.on("updateSettings", (newSettings) => {
    gameState.settings = { ...gameState.settings, ...newSettings };
    io.emit("updateState", gameState);
  });

  socket.on("startGame", () => {
    // Filter & Shuffle
    let pool = allQuestions;
    if (gameState.settings.vibe !== 'all') {
      pool = allQuestions.filter(q => q.category === gameState.settings.vibe);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    gameState.filteredQuestions = pool;
    gameState.questionIndex = 0;
    gameState.players.forEach(p => p.score = 0);
    startRound();
  });

  // --- HOT SEAT LOGIC ---
  socket.on("submitHotSeatChoice", (choice) => {
    gameState.hotSeatChoice = choice;
    
    // FIX: Check if there are any other players to guess
    const potentialVoters = gameState.players.length - 1;
    
    if (potentialVoters <= 0) {
        // Single player testing mode: Skip guessing
        endHotSeatRound(); 
    } else {
        // Move to guessing phase
        gameState.phase = "hotseat_guessing";
        gameState.timeLeft = gameState.settings.timer;
        io.emit("updateState", gameState);

        // Start Timer
        clearInterval(gameState.timer);
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            io.emit("timerUpdate", gameState.timeLeft);
            if(gameState.timeLeft <= 0) endHotSeatRound();
        }, 1000);
    }
  });

  socket.on("submitVote", (choice) => {
    // Generic vote handler
    if(gameState.phase === "hotseat_guessing" && socket.id !== gameState.hotSeatPlayerId) {
        gameState.guesses[socket.id] = choice;
        io.emit("updateState", gameState);
        
        // Check if everyone voted
        const guessCount = Object.keys(gameState.guesses).length;
        const voters = gameState.players.length - 1; 
        if(guessCount >= voters) endHotSeatRound();
    }
    else if(gameState.phase === "voting") {
        // Standard Mode Voting
        if(choice === 'pull') gameState.votes.pull++;
        else gameState.votes.wait++;
        io.emit("updateState", gameState);
    }
  });

  socket.on("forceEndHotSeat", () => { endHotSeatRound(); }); // Safety hatch

  socket.on("endRound", () => {
      // Used for standard mode manual reveal
      gameState.phase = "results"; // mapped to standard results in client
      io.emit("updateState", gameState);
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

function startRound() {
    gameState.currentQuestion = gameState.filteredQuestions[gameState.questionIndex];
    if(gameState.settings.mode === 'hotseat') {
        const randomPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)];
        gameState.hotSeatPlayerId = randomPlayer.id;
        gameState.hotSeatChoice = null;
        gameState.guesses = {};
        gameState.phase = "hotseat_secret";
    } else {
        gameState.votes = { pull: 0, wait: 0 };
        gameState.phase = "voting"; // Standard mode
    }
    io.emit("updateState", gameState);
}

function endHotSeatRound() {
    clearInterval(gameState.timer);
    gameState.phase = "round_summary";

    gameState.players.forEach(p => {
        if(p.id === gameState.hotSeatPlayerId && gameState.hotSeatChoice) {
             // Hot Seat Profile Stats logic here
        } else {
            const guess = gameState.guesses[p.id];
            if(guess === gameState.hotSeatChoice) {
                p.score += 100; // Big points!
                p.lastRoundPoints = 100;
            } else {
                p.lastRoundPoints = 0;
            }
        }
    });
    io.emit("updateState", gameState);
}

function calculateProfiles() {
    // Profile logic (simplified for now)
    gameState.players.forEach(p => p.profileTitle = "The Survivor");
}

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));