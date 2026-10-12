// Entry point: set up the game, players and UI here.

const game = new Alquerque();
const player1 = new HumanPlayer(1);
const player2 = new AIPlayer(2);

const match = new Match(game, player1, player2, {
    onUpdate(game) {
        // TODO: render the board inside <main>
    },
    onEnd(winner, game) {
        // TODO: show the result
        console.log(winner === DRAW ? "Draw!" : "Player " + winner + " won!");
    },
});

// TODO: in the board's click handlers call player1.submitMove(move)

match.start();
