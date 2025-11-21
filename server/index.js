const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const QRCode = require('qrcode');
const allQuestions = require('./questions');
const HotSeatManager = require('./modes/HotSeatManager');
const StandardManager = require('./modes/StandardManager');

const app = express();
const server = http.createServer(app);
// Allow CORS for local development
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const clientBuildPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientBuildPath));

// --- MULTI-ROOM STATE ---
// Format: { "ABCD": { gameState, managers } }
const games = {}; 

// Helper: Generate 4-letter code
const generateCode = () => {
    let code = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code; // e.g., "XYZA"
};

// Helper: Create a new Game State
const createNewGameState = () => ({
    phase: "lobby", 
    settings: { mode: "standard", vibe: "all", timer: 180, rounds: 5, anon: false },
    players: [],
    questionIndex: 0,
    filteredQuestions: [],
    guesses: {},
    votes: { pull: 0, wait: 0 },
    hotSeatPlayerId: null,
    roundResults: null
});

io.on("connection", (socket) => {
  
  // 1. HOST CREATES GAME
  socket.on("hostCreateGame", () => {
      const roomCode = generateCode();
      const initialState = createNewGameState();
      
      // Initialize Managers for this specific room
      const roomIo = io.to(roomCode); // Scoped IO
      const managers = {
          hotseat: new HotSeatManager(initialState, roomIo),
          standard: new StandardManager(initialState, roomIo)
      };

      games[roomCode] = { state: initialState, managers: managers };
      
      socket.join(roomCode);
      // Send the code back to the host
      socket.emit("gameCreated", { roomCode, state: initialState });
      
      // Generate QR for this specific room
      const url = `${process.env.RENDER_EXTERNAL_URL || "http://localhost:3000"}/?code=${roomCode}`;
      QRCode.toDataURL(url, (err, qrUrl) => {
          socket.emit("qrCodeData", qrUrl);
      });
  });

  // 2. PLAYER (OR RE-JOINING HOST) JOINS GAME
  socket.on("joinGame", ({ roomCode, name, isHost }) => {
      roomCode = roomCode.toUpperCase();
      const game = games[roomCode];
      
      if (!game) {
          socket.emit("error", "Room not found");
          return;
      }

      socket.join(roomCode);
      
      // If it's a player, add them
      if (!isHost) {
          const existing = game.state.players.find(p => p.id === socket.id);
          if(!existing) {
              game.state.players.push({ id: socket.id, name: name, score: 0, lastRoundPoints: 0 });
          }
      } else {
          // If Host is rejoining, generate QR again
          const url = `${process.env.RENDER_EXTERNAL_URL || "http://localhost:3000"}/?code=${roomCode}`;
          QRCode.toDataURL(url, (err, qrUrl) => { socket.emit("qrCodeData", qrUrl); });
      }
      
      io.to(roomCode).emit("updateState", game.state);
  });

  // 3. GENERIC HANDLER (Routing events to the correct room)
  const handleRoomAction = (actionCallback) => {
      // Find which room this socket is in
      const rooms = Array.from(socket.rooms);
      const roomCode = rooms.find(r => r.length === 4); // Find the 4-letter code
      
      if(roomCode && games[roomCode]) {
          const game = games[roomCode];
          actionCallback(game, roomCode);
      }
  };

  // --- ACTIONS ---
  socket.on("updateSettings", (settings) => handleRoomAction((game, code) => {
      game.state.settings = { ...game.state.settings, ...settings };
      io.to(code).emit("updateState", game.state);
  }));

  socket.on("startGame", () => handleRoomAction((game, code) => {
      let pool = allQuestions;
      if (game.state.settings.vibe !== 'all') pool = allQuestions.filter(q => q.category === game.state.settings.vibe);
      pool = pool.sort(() => Math.random() - 0.5);
      game.state.filteredQuestions = pool;
      game.state.questionIndex = 0;
      game.state.players.forEach(p => p.score = 0);
      
      // Start First Round
      const q = game.state.filteredQuestions[0];
      if(game.state.settings.mode === 'hotseat') game.managers.hotseat.startRound(q);
      else game.managers.standard.startRound(q);
  }));

  socket.on("submitHotSeatChoice", (c) => handleRoomAction((g) => g.managers.hotseat.handleChoice(socket.id, c)));
  socket.on("submitGuess", (c) => handleRoomAction((g) => g.managers.hotseat.handleGuess(socket.id, c)));
  socket.on("submitVote", (c) => handleRoomAction((g) => g.managers.standard.handleVote(socket.id, c)));
  socket.on("forceEndHotSeat", () => handleRoomAction((g) => g.managers.hotseat.endRound()));
  socket.on("endRound", () => handleRoomAction((g) => g.managers.standard.endRound()));

  socket.on("nextRound", () => handleRoomAction((game, code) => {
      if(game.state.settings.mode === 'hotseat') game.managers.hotseat.cleanup();
      game.state.questionIndex++;
      
      if(game.state.questionIndex < game.state.settings.rounds && game.state.questionIndex < game.state.filteredQuestions.length) {
          const q = game.state.filteredQuestions[game.state.questionIndex];
          if(game.state.settings.mode === 'hotseat') game.managers.hotseat.startRound(q);
          else game.managers.standard.startRound(q);
      } else {
          game.state.phase = "gameover";
          io.to(code).emit("updateState", game.state);
      }
  }));

  // --- RESET GAME (New Feature) ---
  socket.on("resetGame", () => handleRoomAction((game, code) => {
      game.managers.hotseat.cleanup();
      game.managers.hotseat.introShown = false; // allow intro next new game
      // Reset state but keep players
      game.state.phase = "lobby";
      game.state.players.forEach(p => { p.score = 0; p.lastRoundPoints = 0; });
      game.state.guesses = {};
      game.state.votes = { pull:0, wait:0 };
      
      io.to(code).emit("updateState", game.state);
  }));

  socket.on("disconnect", () => handleRoomAction((game, code) => {
      game.state.players = game.state.players.filter(p => p.id !== socket.id);
      io.to(code).emit("updateState", game.state);
      
      // Cleanup empty rooms after delay if needed (optional optimization)
  }));
});

app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));
