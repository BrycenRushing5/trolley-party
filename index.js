const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode'); // Import the library

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

app.use(express.static("public"));

// Global variable to store the QR code image data
let qrCodeDataUrl = '';

// --- Generate QR Code on Server Start ---
// We need the public URL to generate the correct QR code.
// On Render, we can use an environment variable, or just hardcode it for now.
// For this example, I'll assume your Render URL is something like:
// https://trolley-party.onrender.com
// IMPORTANT: Replace this URL with your ACTUAL Render URL after deploying once.
const myPublicUrl = "https://YOUR-RENDER-APP-NAME.onrender.com"; 

// Generate the QR code as a Data URL string
QRCode.toDataURL(myPublicUrl, function (err, url) {
  if (err) {
    console.error("Error generating QR code", err);
    return;
  }
  console.log("QR Code generated successfully");
  qrCodeDataUrl = url; // Save it to the global variable
});


let gameState = {
  phase: "lobby", 
  question: "Pull the lever?",
  votes: { A: 0, B: 0 },
  players: []
};

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  // Send the current state to the new connection
  socket.emit("updateState", gameState);

  // --- NEW: Listen for a host requesting the QR code ---
  socket.on("requestQrCode", () => {
      // Send the generated QR code data back to the host
      socket.emit("qrCodeData", qrCodeDataUrl);
  });

  socket.on("joinGame", (name) => {
    gameState.players.push({ id: socket.id, name: name });
    io.emit("updateState", gameState);
  });

  socket.on("startGame", () => {
    gameState.phase = "voting";
    gameState.votes = { A: 0, B: 0 };
    io.emit("updateState", gameState);
  });

  socket.on("vote", (choice) => {
    if (gameState.phase === "voting") {
      gameState.votes[choice]++;
      io.emit("updateState", gameState);
    }
  });

  socket.on("endRound", () => {
    gameState.phase = "results";
    io.emit("updateState", gameState);
  });
  
  socket.on("reset", () => {
    gameState.phase = "lobby";
    gameState.votes = {A:0, B:0};
    io.emit("updateState", gameState);
  });
  
  socket.on("disconnect", () => {
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    io.emit("updateState", gameState);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});