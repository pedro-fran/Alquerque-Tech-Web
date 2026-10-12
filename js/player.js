/*  ** PLAYERS **

  Every player exposes the same method:
    Promise<move> chooseMove(game)

  HumanPlayer waits for the UI to call submitMove(move) (e.g. from a click handler).
  AIPlayer asks MCTS for the best move.
*/

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    async chooseMove(game) {
        throw new Error("chooseMove() not implemented");
    }
}

class HumanPlayer extends Player {
    constructor(id, name = "Player " + id) {
        super(id, name);
        this.resolve = null;
    }

    chooseMove(game) {
        return new Promise(resolve => (this.resolve = resolve));
    }

    // Called by the UI when the human picks a move.
    submitMove(move) {
        if (!this.resolve) return;
        const resolve = this.resolve;
        this.resolve = null;
        resolve(move);
    }
}

class AIPlayer extends Player {
    constructor(id, name = "MCTS", iterations = 10000, c, maxDepth) {
        super(id, name);
        this.iterations = iterations;
        this.ai = new MCTS(c, maxDepth);
    }

    async chooseMove(game) {
        // Let the browser repaint before blocking on the search.
        await new Promise(r => setTimeout(r, 0));
        return this.ai.getBestMove(game, this.iterations);
    }
}

/*  ** MATCH **

  Runs the game loop between two players (PvP, PvA or AvA).

  CONSTRUCTOR
    Match(game, player1, player2, { onUpdate, onEnd })
    | onUpdate(game)        -> called after every valid move (redraw the board here).
    | onEnd(winner, game)   -> called when the game ends (winner: 1, 2 or DRAW).

  METHODS
    Promise start()
    | Plays until the game is over.
*/

class Match {
    constructor(game, player1, player2, { onUpdate = () => {}, onEnd = () => {} } = {}) {
        this.game = game;
        this.players = { 1: player1, 2: player2 };
        this.onUpdate = onUpdate;
        this.onEnd = onEnd;
    }

    currentPlayer() {
        return this.players[this.game.currentPlayer];
    }

    async start() {
        this.onUpdate(this.game);

        while (!this.game.isOver()) {
            const move = await this.currentPlayer().chooseMove(this.game.clone());
            if (move === null || !this.game.play(move)) continue; // invalid move, ask again
            this.onUpdate(this.game);
        }

        const winner = this.game.getWinner();
        this.onEnd(winner === 0 ? DRAW : winner, this.game);
    }
}
