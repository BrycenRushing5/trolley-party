class StandardManager {
    constructor(gameState, io) {
        this.gameState = gameState;
        this.io = io;
    }

    startRound(question) {
        this.gameState.currentQuestion = question;
        this.gameState.votes = { pull: 0, wait: 0 };
        this.gameState.phase = "voting";
        this.io.emit("updateState", this.gameState);
    }

    handleVote(socketId, choice) {
        if (choice === 'pull') this.gameState.votes.pull++;
        else this.gameState.votes.wait++;
        this.io.emit("updateState", this.gameState);
    }

    endRound() {
        this.gameState.phase = "results";
        this.io.emit("updateState", this.gameState);
    }
    
    cleanup() {
        // Nothing to clean up yet
    }
}

module.exports = StandardManager;