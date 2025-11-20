class HotSeatManager {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
        this.timerInterval = null;
        // Track who has been the hot seat to ensure rotation
        this.usedHotSeatIds = [];
    }

    startRound(question) {
        this.gameState.currentQuestion = question;
        this.gameState.guesses = {};
        this.gameState.hotSeatChoice = null;

        // --- 1. ROTATION LOGIC ---
        // Filter players who haven't been picked yet
        let availableCandidates = this.gameState.players.filter(p => !this.usedHotSeatIds.includes(p.id));
        
        // If everyone has been picked, reset the pool
        if (availableCandidates.length === 0) {
            this.usedHotSeatIds = [];
            availableCandidates = this.gameState.players;
        }

        // Pick random from available
        const randomPlayer = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
        
        // Safety check if player exists
        if (!randomPlayer) {
            console.error("No players available!");
            return;
        }

        this.gameState.hotSeatPlayerId = randomPlayer.id;
        this.usedHotSeatIds.push(randomPlayer.id);

        // Set Phase
        this.gameState.phase = "hotseat_secret";
        this.sync();
    }

    handleChoice(socketId, choice) {
        if (socketId !== this.gameState.hotSeatPlayerId) return;

        this.gameState.hotSeatChoice = choice;
        
        // Auto-skip if single player testing
        if (this.gameState.players.length <= 1) {
            this.endRound();
            return;
        }

        // Move to Guessing
        this.gameState.phase = "hotseat_guessing";
        this.gameState.timeLeft = this.gameState.settings.timer;
        this.sync();

        // Start Timer
        this.startTimer();
        
        // Broadcast initial 0/X votes
        this.io.emit("voterUpdate", { count: 0, total: this.gameState.players.length - 1 });
    }

    handleGuess(socketId, guess) {
        // Prevent hot seat player from guessing
        if (socketId === this.gameState.hotSeatPlayerId) return;

        this.gameState.guesses[socketId] = guess;

        // Check if everyone voted
        const guessCount = Object.keys(this.gameState.guesses).length;
        const votersNeeded = this.gameState.players.length - 1;

        this.io.emit("voterUpdate", { count: guessCount, total: votersNeeded });

        if (guessCount >= votersNeeded) {
            this.endRound();
        }
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
        this.gameState.phase = "round_summary";
        
        // Scoring Logic
        this.gameState.players.forEach(p => {
            p.lastRoundPoints = 0; // Reset
            
            if (p.id !== this.gameState.hotSeatPlayerId) {
                const guess = this.gameState.guesses[p.id];
                if (guess && guess === this.gameState.hotSeatChoice) {
                    p.score += 100;
                    p.lastRoundPoints = 100;
                }
            }
        });

        this.sync();
    }

    sync() {
        this.io.emit("updateState", this.gameState);
    }
    
    cleanup() {
        clearInterval(this.timerInterval);
    }
}

module.exports = HotSeatManager;