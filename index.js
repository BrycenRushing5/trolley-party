const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const allQuestions = require('./questions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// SET UP EJS
app.set('view engine', 'ejs');
app.use(express.static("public"));

// Serve the EJS file on root load
app.get('/', (req, res) => {
    res.render('index');
});

let qrCodeDataUrl = '';
const myPublicUrl = "https://trolley-party.onrender.com"; 
QRCode.toDataURL(myPublicUrl, (err, url) => { if(!err) qrCodeDataUrl = url; });

let gameState = {
  phase: "lobby", 
  settings: { mode: "standard", vibe: "all", timer: 180, rounds: 5, anon: false },
  currentQuestion: null,
  questionIndex: 0,
  filteredQuestions: [],
  players: [],
  hotSeatPlayerId: null,
  hotSeatChoice: null,
  guesses: {}, 
  votes: { pull: 0, wait: 0 },
  timer: null,
  timeLeft: 0
};

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);
  socket.on("requestQrCode", () => { socket.emit("qrCodeData", qrCodeDataUrl); });

  socket.on("joinGame", (name) => {
    // Check if reconnecting or new
    const existing = gameState.players.find(p => p.id === socket.id);
    if(!existing) {
        gameState.players.push({ id: socket.id, name: name, score: 0, stats: {}, lastRoundPoints: 0 });
    }
    io.emit("updateState", gameState);
  });

  socket.on("updateSettings", (newSettings) => {
    gameState.settings = { ...gameState.settings, ...newSettings };
    io.emit("updateState", gameState);
  });

  socket.on("startGame", () => {
    let pool = allQuestions;
    if (gameState.settings.vibe !== 'all') {
      pool = allQuestions.filter(q => q.category === gameState.settings.vibe);
    }
    // Better shuffle
    pool = pool.sort(() => Math.random() - 0.5);
    gameState.filteredQuestions = pool;
    gameState.questionIndex = 0;
    gameState.players.forEach(p => p.score = 0);
    startRound();
  });

  socket.on("submitHotSeatChoice", (choice) => {
    gameState.hotSeatChoice = choice;
    const potentialVoters = gameState.players.length - 1;
    
    if (potentialVoters <= 0) {
        endHotSeatRound(); 
    } else {
        gameState.phase = "hotseat_guessing";
        gameState.timeLeft = gameState.settings.timer;
        io.emit("updateState", gameState);
        
        clearInterval(gameState.timer);
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            io.emit("timerUpdate", gameState.timeLeft);
            if(gameState.timeLeft <= 0) endHotSeatRound();
        }, 1000);
    }
  });

  socket.on("submitGuess", (choice) => {
    if(gameState.phase === "hotseat_guessing" && socket.id !== gameState.hotSeatPlayerId) {
        gameState.guesses[socket.id] = choice;
        
        // --- AUTO ADVANCE LOGIC ---
        const guessCount = Object.keys(gameState.guesses).length;
        const votersNeeded = gameState.players.length - 1; 
        
        io.emit("voterUpdate", { count: guessCount, total: votersNeeded }); // Send count to host

        if(guessCount >= votersNeeded) {
            endHotSeatRound();
        }
    }
  });

  socket.on("forceEndHotSeat", () => { endHotSeatRound(); });

  socket.on("submitVote", (choice) => {
      if(gameState.phase === "voting") {
        if(choice === 'pull') gameState.votes.pull++; else gameState.votes.wait++;
        io.emit("updateState", gameState);
      }
  });

  socket.on("endRound", () => { gameState.phase = "results"; io.emit("updateState", gameState); });
  
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
    gameState.players.forEach(p => { p.score = 0; p.stats = {}; p.lastRoundPoints = 0; });
    io.emit("updateState", gameState);
  });

  socket.on("disconnect", () => {
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    // Clean up guesses if a player leaves mid-round
    delete gameState.guesses[socket.id];
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
        io.emit("voterUpdate", { count: 0, total: gameState.players.length - 1 });
    } else {
        gameState.votes = { pull: 0, wait: 0 };
        gameState.phase = "voting";
    }
    io.emit("updateState", gameState);
}

function endHotSeatRound() {
    clearInterval(gameState.timer);
    gameState.phase = "round_summary";

    // SCORING FIX
    gameState.players.forEach(p => {
        if(p.id === gameState.hotSeatPlayerId) {
            p.lastRoundPoints = 0; // Hot seat doesn't get points for guessing themselves
        } else {
            const guess = gameState.guesses[p.id];
            // Ensure explicit string comparison
            if(guess && guess === gameState.hotSeatChoice) {
                p.score += 100;
                p.lastRoundPoints = 100;
            } else {
                p.lastRoundPoints = 0;
            }
        }
    });
    io.emit("updateState", gameState);
}

function calculateProfiles() {
    gameState.players.forEach(p => p.profileTitle = "The Survivor");
}

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));