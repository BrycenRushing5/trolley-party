const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const allQuestions = require('./questions');
const HotSeatManager = require('./modes/HotSeatManager');
const StandardManager = require('./modes/StandardManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.get('/', (req, res) => res.render('index'));

// QR Code
let qrCodeDataUrl = '';
const myPublicUrl = "https://trolley-party.onrender.com"; 
QRCode.toDataURL(myPublicUrl, (err, url) => { if(!err) qrCodeDataUrl = url; });

// Global State
let gameState = {
  phase: "lobby", 
  settings: { mode: "standard", vibe: "all", timer: 180, rounds: 5, anon: false },
  players: [],
  // Mode specific data is handled by managers, but we keep shared state here
  questionIndex: 0,
  filteredQuestions: [],
  guesses: {},
  votes: { pull: 0, wait: 0 },
  hotSeatPlayerId: null
};

// Initialize Managers
const managers = {
    hotseat: new HotSeatManager(gameState, io),
    standard: new StandardManager(gameState, io)
};

io.on("connection", (socket) => {
  socket.emit("updateState", gameState);
  socket.on("requestQrCode", () => { socket.emit("qrCodeData", qrCodeDataUrl); });

  socket.on("joinGame", (name) => {
    const existing = gameState.players.find(p => p.id === socket.id);
    if(!existing) {
        gameState.players.push({ id: socket.id, name: name, score: 0, lastRoundPoints: 0 });
    }
    io.emit("updateState", gameState);
  });

  socket.on("updateSettings", (newSettings) => {
    gameState.settings = { ...gameState.settings, ...newSettings };
    io.emit("updateState", gameState);
  });

  socket.on("startGame", () => {
    // Filter questions
    let pool = allQuestions;
    if (gameState.settings.vibe !== 'all') pool = allQuestions.filter(q => q.category === gameState.settings.vibe);
    pool = pool.sort(() => Math.random() - 0.5);
    
    gameState.filteredQuestions = pool;
    gameState.questionIndex = 0;
    gameState.players.forEach(p => p.score = 0);
    
    startRound();
  });

  // --- ROUTING LOGIC ---
  socket.on("submitHotSeatChoice", (choice) => {
      if(gameState.settings.mode === 'hotseat') managers.hotseat.handleChoice(socket.id, choice);
  });

  socket.on("submitGuess", (choice) => {
      if(gameState.settings.mode === 'hotseat') managers.hotseat.handleGuess(socket.id, choice);
  });

  socket.on("submitVote", (choice) => {
      if(gameState.settings.mode === 'standard') managers.standard.handleVote(socket.id, choice);
  });

  socket.on("forceEndHotSeat", () => managers.hotseat.endRound());
  socket.on("endRound", () => managers.standard.endRound());

  socket.on("nextRound", () => {
      gameState.questionIndex++;
      if(gameState.questionIndex < gameState.settings.rounds && gameState.questionIndex < gameState.filteredQuestions.length) {
          startRound();
      } else {
          gameState.phase = "gameover";
          managers.hotseat.cleanup(); // Stop timers
          io.emit("updateState", gameState);
      }
  });

  socket.on("reset", () => {
    managers.hotseat.cleanup();
    gameState.phase = "lobby";
    gameState.players.forEach(p => { p.score = 0; p.lastRoundPoints = 0; });
    io.emit("updateState", gameState);
  });

  socket.on("disconnect", () => {
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    io.emit("updateState", gameState);
  });
});

function startRound() {
    const q = gameState.filteredQuestions[gameState.questionIndex];
    // Delegate to the active manager
    if(gameState.settings.mode === 'hotseat') {
        managers.hotseat.startRound(q);
    } else {
        managers.standard.startRound(q);
    }
}

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));