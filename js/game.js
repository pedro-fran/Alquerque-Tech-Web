/*  ** ALQUERQUE **

  Game state and rules. No DOM here, so it can be tested on its own.

  NxN board of positions (N odd: 5, 7, 9). board[r][c]: 0 empty, 1 or 2 a piece.
  Row 0 is the top. Player 1 (blue) starts at the bottom and moves up;
  player 2 (red) starts at the top and moves down.

  Lines: every position connects to its orthogonal neighbours; diagonals only
  pass through positions where (r + c) is even.

  MOVES
    { from: [r, c], to: [r, c], path: [[r, c], ...], captures: [[r, c], ...] }
    | path lists every landing point (one for a step, one per jump in a capture).
    | captures is empty for a simple step.

  RULES IMPLEMENTED
    - Step to an adjacent empty position along a line, never backwards.
    - Capture: jump over an adjacent opponent piece to the empty position right
      behind it, in any direction. After a capture, if another one is possible
      the piece must keep capturing (only complete chains are legal moves).
      A chain can't land twice on the same position nor capture a piece twice.
    - A player with no pieces loses.
    - A player with no moves must pass. Both players pass in a row -> draw.
    - NOT implemented yet: the "blow" rule (so capturing is optional).
*/

const EMPTY = 0;
const DRAW = 3;
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

class Alquerque {
    constructor(size = 5, firstPlayer = 1) {
        this.size = size;
        this.board = Alquerque.initialBoard(size);
        this.currentPlayer = firstPlayer;
        this.passes = 0;     // consecutive passes
        this.resigned = 0;   // player who resigned (0 = nobody)
    }

    // Each player fills the rows closest to them; on the middle row each one
    // gets the positions to their right; only the centre stays empty.
    static initialBoard(n) {
        const mid = (n - 1) / 2;
        const board = [];
        for (let r = 0; r < n; r++) {
            const row = [];
            for (let c = 0; c < n; c++) {
                if (r < mid) row.push(2);
                else if (r > mid) row.push(1);
                else row.push(c < mid ? 2 : c > mid ? 1 : EMPTY);
            }
            board.push(row);
        }
        return board;
    }

    static hasDiagonals(r, c) {
        return (r + c) % 2 === 0;
    }

    opponent(p) {
        return p === 1 ? 2 : 1;
    }

    // Direction (in rows) that counts as "forward" for player p.
    forward(p) {
        return p === 1 ? -1 : 1;
    }

    inside(r, c) {
        return r >= 0 && r < this.size && c >= 0 && c < this.size;
    }

    countPieces(p) {
        let n = 0;
        for (const row of this.board) for (const v of row) if (v === p) n++;
        return n;
    }

    // Directions available from (r, c), following the board lines.
    directionsFrom(r, c) {
        return Alquerque.hasDiagonals(r, c) ? DIRS : DIRS.slice(0, 4);
    }

    // Every legal move for the current player (empty if they must pass).
    getLegalMoves() {
        if (this.getWinner() !== 0) return [];
        const p = this.currentPlayer;
        const moves = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] !== p) continue;
                this.addSteps(r, c, p, moves);
                this.addCaptures(r, c, p, moves);
            }
        }
        return moves;
    }

    addSteps(r, c, p, moves) {
        for (const [dr, dc] of this.directionsFrom(r, c)) {
            if (dr === -this.forward(p)) continue; // no going back
            const tr = r + dr, tc = c + dc;
            if (this.inside(tr, tc) && this.board[tr][tc] === EMPTY) {
                moves.push({ from: [r, c], to: [tr, tc], path: [[tr, tc]], captures: [] });
            }
        }
    }

    // Depth-first search over capture chains; only complete chains are moves.
    addCaptures(r0, c0, p, moves) {
        const opp = this.opponent(p);
        const same = (a, b) => a[0] === b[0] && a[1] === b[1];

        const search = (r, c, path, captures) => {
            let extended = false;
            for (const [dr, dc] of this.directionsFrom(r, c)) {
                const mid = [r + dr, c + dc];
                const land = [r + 2 * dr, c + 2 * dc];
                if (!this.inside(land[0], land[1])) continue;
                if (this.board[mid[0]][mid[1]] !== opp) continue;
                if (captures.some(x => same(x, mid))) continue;            // captured already
                if (same(land, [r0, c0])) continue;                          // back to the start
                if (this.board[land[0]][land[1]] !== EMPTY) continue;
                if (path.some(x => same(x, land))) continue;                 // landed here already

                extended = true;
                search(land[0], land[1], [...path, land], [...captures, mid]);
            }
            if (!extended && captures.length > 0) {
                moves.push({ from: [r0, c0], to: [r, c], path, captures });
            }
        };

        search(r0, c0, [], []);
    }

    // Applies a legal move and passes the turn. Returns false if the move is invalid.
    play(move) {
        const key = Alquerque.moveKey(move);
        const legal = this.getLegalMoves().find(m => Alquerque.moveKey(m) === key);
        if (!legal) return false;

        const [fr, fc] = legal.from;
        const [tr, tc] = legal.to;
        this.board[fr][fc] = EMPTY;
        for (const [cr, cc] of legal.captures) this.board[cr][cc] = EMPTY;
        this.board[tr][tc] = this.currentPlayer;

        this.passes = 0;
        this.currentPlayer = this.opponent(this.currentPlayer);
        return true;
    }

    // Only allowed when the current player has no legal move.
    pass() {
        if (this.getWinner() !== 0 || this.getLegalMoves().length > 0) return false;
        this.passes++;
        this.currentPlayer = this.opponent(this.currentPlayer);
        return true;
    }

    resign(p) {
        this.resigned = p;
    }

    // 0 while running, 1 or 2 for a winner, DRAW (3) for a draw.
    getWinner() {
        if (this.resigned) return this.opponent(this.resigned);
        if (this.countPieces(1) === 0) return 2;
        if (this.countPieces(2) === 0) return 1;
        if (this.passes >= 2) return DRAW;
        return 0;
    }

    isOver() {
        return this.getWinner() !== 0;
    }

    static moveKey(m) {
        return JSON.stringify([m.from, m.path]);
    }
}
