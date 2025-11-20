const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const allQuestions = require('./questions'); // Import the database

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// QR Code Logic
let qrCodeDataUrl = '';
const myPublicUrl = "https://YOUR-RENDER-APP-NAME.onrender.com"; // CHANGE THIS!
QRCode.toDataURL(myPublicUrl, (err, url) => { if(!err) qrCodeDataUrl = url; });

// Game State
let gameState = {
  phase: "lobby", 
  settings: { mode: "standard", vibe: "all" }, // Default settings
  currentQuestion: null,
  questionIndex: 0,
  filteredQuestions: [],
  votes: { pull: 0, wait: 0 },
  players: [] 
  // Player object structure: { id, name, stats: { utilitarian: 0, chaos: 0... } }
};

io.on("connection", (socket) => {
  // Send initial state
  socket.emit("updateState", gameState);

  socket.on("requestQrCode", () => { socket.emit("qrCodeData", qrCodeDataUrl); });

  socket.on("joinGame", (name) => {
    // Create player with empty stats
    const player = { id: socket.id, name: name, stats: {} };
    gameState.players.push(player);
    io.emit("updateState", gameState);
  });

  // --- HOST SETTINGS CHANGE ---
  socket.on("updateSettings", (newSettings) => {
    gameState.settings = newSettings;
    io.emit("updateState", gameState); // Syncs UI so everyone sees settings (optional)
  });

  socket.on("startGame", () => {
    // 1. Filter Questions based on Vibe
    let pool = allQuestions;
    if (gameState.settings.vibe !== 'all') {
      pool = allQuestions.filter(q => q.category === gameState.settings.vibe);
    }
    // Shuffle (Fisher-Yates algorithm)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    gameState.filteredQuestions = pool;
    gameState.questionIndex = 0;
    loadQuestion(0);
  });

  socket.on("vote", (choice) => { 
    // choice is 'pull' or 'wait'
    if (gameState.phase === "voting") {
      gameState.votes[choice]++;
      
      // --- PROFILE TRACKING ---
      // Find the player
      let player = gameState.players.find(p => p.id === socket.id);
      if (player && gameState.currentQuestion) {
        // Get traits for the chosen option (e.g., {utilitarian: 5})
        let traits = choice === 'pull' 
          ? gameState.currentQuestion.optionPull.impact 
          : gameState.currentQuestion.optionWait.impact;
        
        // Add to player stats
        for (let trait in traits) {
            player.stats[trait] = (player.stats[trait] || 0) + traits[trait];
        }
      }
      
      io.emit("updateState", gameState);
    }
  });

  socket.on("nextQuestion", () => {
    gameState.questionIndex++;
    if (gameState.questionIndex < gameState.filteredQuestions.length) {
        loadQuestion(gameState.questionIndex);
    } else {
        gameState.phase = "gameover"; // We can build a profile summary screen later
        io.emit("updateState", gameState);
    }
  });

  socket.on("endRound", () => {
    gameState.phase = "results";
    io.emit("updateState", gameState);
  });
  
  socket.on("reset", () => {
    gameState.phase = "lobby";
    gameState.votes = {pull: 0, wait: 0};
    gameState.players.forEach(p => p.stats = {}); // Reset stats
    io.emit("updateState", gameState);
  });

  socket.on("disconnect", () => {
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    io.emit("updateState", gameState);
  });
});

function loadQuestion(index) {
    gameState.currentQuestion = gameState.filteredQuestions[index];
    gameState.votes = { pull: 0, wait: 0 };
    gameState.phase = "voting";
    io.emit("updateState", gameState);
}

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));