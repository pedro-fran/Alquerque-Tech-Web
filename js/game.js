/*  ** GAME **

  Base class for any two-player, turn-based game.
  The MCTS and Player code only talk to a game through the methods below,
  so a new game just has to extend this class and implement them.

  Players are identified by 1 and 2.
  A "move" can be any value (number, array, object) the concrete game understands.

  METHODS (to implement)
    Game clone()
    | Returns a deep copy of the game (used by the AI to simulate without touching the real game).

    Array getLegalMoves()
    | Returns every legal move for the current player. Empty array if there are none.

    boolean play(move)
    | Applies a move for the current player and passes the turn.
    | Returns false (and changes nothing) if the move is invalid.

    number getWinner()
    | Returns 0 while the game is still running, 1 or 2 for a winner, or DRAW (3) for a draw.

  METHODS (already implemented)
    boolean isOver()
    | True if someone won, it's a draw, or there are no legal moves left.

    number opponent(p)
    | Returns the other player's ID.

  VARIABLES
    number currentPlayer
    | Whose turn it is (1 or 2).

    number plays
    | Total of valid plays.
*/

const DRAW = 3;

class Game {
    constructor() {
        if (new.target === Game) throw new Error("Game is abstract, extend it.");
        this.currentPlayer = 1;
        this.plays = 0;
    }

    clone() { throw new Error("clone() not implemented"); }

    getLegalMoves() { throw new Error("getLegalMoves() not implemented"); }

    play(move) { throw new Error("play() not implemented"); }

    getWinner() { throw new Error("getWinner() not implemented"); }

    isOver() {
        return this.getWinner() !== 0 || this.getLegalMoves().length === 0;
    }

    opponent(p) {
        return p === 1 ? 2 : 1;
    }
}

/*  ** ALQUERQUE **

  5x5 board, 12 pieces per player. Empty points are 0, pieces are 1 or 2.
  Player 1 starts on the bottom two rows plus the right half of the middle row,
  player 2 on the top two rows plus the left half of the middle row.

  MOVES
    { from: [r, c], to: [r, c], captures: [[r, c], ...] }
    | captures is empty for a simple step; for a (multi-)jump it lists the captured pieces.

  VARIABLES
    number[][] board
    | board[r][c], row 0 is the top.
*/

const SIZE = 5;

class Alquerque extends Game {
    constructor(other) {
        super();
        if (other) {
            this.currentPlayer = other.currentPlayer;
            this.plays = other.plays;
            this.board = other.board.map(row => [...row]);
        } else {
            this.board = [
                [2, 2, 2, 2, 2],
                [2, 2, 2, 2, 2],
                [2, 2, 0, 1, 1],
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
            ];
        }

        this.size =
        this.matrix = new int [size][size];
        this.wcond = 0;
        
    }

    clone() {
        return new Alquerque(this);
    }

    getLegalMoves() {
        // TODO: steps and jumps for this.currentPlayer
        return [];
    }

    play(move) {
        // TODO: validate and apply `move` for this.currentPlayer
        this.plays++;
        this.currentPlayer = this.opponent(this.currentPlayer);
        return true;
    }

    getWinner() {
        // TODO
        return 0;
    }
}
