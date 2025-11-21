class HotSeatManager {
    constructor(gameState, io, managers) {
        this.gameState = gameState;
        this.io = io;
        this.managers = managers; // Access to other managers if needed
        this.timerInterval = null;
        this.autoNextTimeout = null; // For the 10s wait
        this.usedHotSeatIds = [];
        this.introInterval = null;
        this.introShown = false;
    }

    startRound(question) {
        // CLEAR any existing timers from previous rounds
        clearInterval(this.timerInterval);
        clearInterval(this.introInterval);
        clearTimeout(this.autoNextTimeout);

        this.gameState.currentQuestion = question;
        this.gameState.guesses = {};
        this.gameState.hotSeatChoice = null;
        this.gameState.roundResults = null; // Reset results

        // --- ROTATION LOGIC ---
        let availableCandidates = this.gameState.players.filter(p => !this.usedHotSeatIds.includes(p.id));
        if (availableCandidates.length === 0) {
            this.usedHotSeatIds = [];
            availableCandidates = this.gameState.players;
        }

        // Pick random
        const randomPlayer = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
        
        if (!randomPlayer) {
            console.log("Waiting for players...");
            return;
        }

        this.gameState.hotSeatPlayerId = randomPlayer.id;
        this.usedHotSeatIds.push(randomPlayer.id);

        // Intro phase only on first round of Hot Seat
        if (!this.introShown) {
            this.introShown = true;
            this.gameState.phase = "hotseat_intro";
            this.gameState.timeLeft = 10; // 10 second explainer
            this.sync();
            this.startIntroTimer();
            return;
        }

        this.beginSecretPhase();
    }

    handleChoice(socketId, choice) {
        if (socketId !== this.gameState.hotSeatPlayerId) return;
        this.gameState.hotSeatChoice = choice;
        
        // Skip if testing alone
        if (this.gameState.players.length <= 1) {
            this.endRound();
            return;
        }

        this.gameState.phase = "hotseat_guessing";
        this.gameState.timeLeft = this.gameState.settings.timer;
        this.sync();

        this.startTimer();
        this.io.emit("voterUpdate", { count: 0, total: this.gameState.players.length - 1, remaining: this.gameState.players.length - 1 });
    }

    handleGuess(socketId, guess) {
        if (socketId === this.gameState.hotSeatPlayerId) return;
        this.gameState.guesses[socketId] = guess;

        const guessCount = Object.keys(this.gameState.guesses).length;
        const votersNeeded = this.gameState.players.length - 1;

        this.io.emit("voterUpdate", { count: guessCount, total: votersNeeded, remaining: Math.max(0, votersNeeded - guessCount) });

        if (guessCount >= votersNeeded) {
            this.endRound();
        }
    }

    startIntroTimer() {
        clearInterval(this.introInterval);
        this.introInterval = setInterval(() => {
            this.gameState.timeLeft--;
            this.io.emit("timerUpdate", this.gameState.timeLeft);
            if (this.gameState.timeLeft <= 0) {
                clearInterval(this.introInterval);
                this.beginSecretPhase();
            }
        }, 1000);
    }

    beginSecretPhase() {
        this.gameState.phase = "hotseat_secret";
        this.sync();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.gameState.timeLeft--;
            this.io.emit("timerUpdate", this.gameState.timeLeft);
            if (this.gameState.timeLeft <= 0) {
                this.endRound();
            }
        }, 1000);
    }

    endRound() {
        clearInterval(this.timerInterval);
        clearInterval(this.introInterval);
        this.gameState.phase = "round_summary";
        
        const correctPlayers = [];
        
        // Scoring
        this.gameState.players.forEach(p => {
            p.lastRoundPoints = 0;
            if (p.id !== this.gameState.hotSeatPlayerId) {
                const guess = this.gameState.guesses[p.id];
                if (guess && guess === this.gameState.hotSeatChoice) {
                    p.score += 100;
                    p.lastRoundPoints = 100;
                    correctPlayers.push(p.name);
                }
            }
        });

        // Save specific results for the UI to display
        const target = this.gameState.players.find(p => p.id === this.gameState.hotSeatPlayerId);
        this.gameState.roundResults = {
            hotSeatName: target ? target.name : "Unknown",
            choice: this.gameState.hotSeatChoice,
            correctPlayers: correctPlayers
        };

        this.sync();

        // --- AUTO ADVANCE LOGIC ---
        // Wait 10 seconds, then trigger next round automatically
        console.log("Auto-advancing in 10 seconds...");
        this.autoNextTimeout = setTimeout(() => {
            // We need to call the 'nextRound' logic that usually lives in index.js
            // But since we are inside the manager, we can emit an event to ourselves or handle it via callback.
            // The easiest way is to emit a specific socket event that index.js listens to, 
            // OR just rely on the user. But you requested auto.
            // We will emit a special server-side event or just rely on index.js passing a callback.
            // For simplicity: We will emit to the room that auto-advance is happening.
            this.io.emit("forceNextRound"); 
        }, 10000);
    }

    cleanup() {
        clearInterval(this.timerInterval);
        clearInterval(this.introInterval);
        clearTimeout(this.autoNextTimeout);
    }

    sync() {
        this.io.emit("updateState", this.gameState);
    }
}

module.exports = HotSeatManager;
