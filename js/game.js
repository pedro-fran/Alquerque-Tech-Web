/* Game state and rules. board[r][c]: 0 empty, 1 or 2 a piece. */

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

    directionsFrom(r, c) {
        return Alquerque.hasDiagonals(r, c) ? DIRS : DIRS.slice(0, 4);
    }

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
            if (dr === -this.forward(p)) continue;
            const tr = r + dr, tc = c + dc;
            if (this.inside(tr, tc) && this.board[tr][tc] === EMPTY) {
                moves.push({ from: [r, c], to: [tr, tc], path: [[tr, tc]], captures: [] });
            }
        }
    }

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
                if (captures.some(x => same(x, mid))) continue;
                if (same(land, [r0, c0])) continue;
                if (this.board[land[0]][land[1]] !== EMPTY) continue;
                if (path.some(x => same(x, land))) continue;

                extended = true;
                search(land[0], land[1], [...path, land], [...captures, mid]);
            }
            if (!extended && captures.length > 0) {
                moves.push({ from: [r0, c0], to: [r, c], path, captures });
            }
        };

        search(r0, c0, [], []);
    }

    play(move) {
        const [fr, fc] = move.from;
        const [tr, tc] = move.to;
        this.board[fr][fc] = EMPTY;
        for (const [cr, cc] of move.captures) this.board[cr][cc] = EMPTY;
        this.board[tr][tc] = this.currentPlayer;

        this.passes = 0;
        this.currentPlayer = this.opponent(this.currentPlayer);
    }

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
}
