/*  ** APP **

  Wires the page areas (configuration, commands, identification, board,
  messages, instructions, rankings) to the game.
  The human is always player 1 (blue, bottom); the computer is player 2 (red, top).
*/

const HUMAN = 1;
const COMPUTER = 2;
const LEVEL_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard" };

class App {
    constructor() {
        this.$ = id => document.getElementById(id);

        this.board = new BoardView(this.$("board"), (r, c) => this.onPointClick(r, c));
        this.game = null;
        this.ai = null;
        this.aiTimer = null;
        this.notice = "";   // extra info shown with the turn message
        this.selected = null; // [r, c] of the piece being moved
        this.path = [];       // landing points already clicked during a capture
        this.lastMove = null;
        this.rankings = {};   // "5x5|medium" -> { wins, losses, draws } (lost on reload, as allowed)

        this.$("btn-start").addEventListener("click", () => this.startGame());
        this.$("btn-pass").addEventListener("click", () => this.pass());
        this.$("btn-resign").addEventListener("click", () => this.resign());
        this.$("btn-instructions").addEventListener("click", () => this.$("instructions").showModal());
        this.$("btn-rankings").addEventListener("click", () => {
            this.renderRankings();
            this.$("rankings").showModal();
        });
        this.$("login-form").addEventListener("submit", e => this.login(e));
        this.$("btn-logout").addEventListener("click", () => this.logout());
        this.$("cfg-size").addEventListener("change", () => {
            if (!this.isPlaying()) this.preview();
        });

        this.preview();
        this.updateCommands();
        this.message("Choose the settings and press “Start game”.");
    }

    // ---------- configuration ----------

    config() {
        return {
            size: Number(this.$("cfg-size").value),
            first: this.$("cfg-first").value === "computer" ? COMPUTER : HUMAN,
            level: this.$("cfg-level").value,
        };
    }

    preview() {
        const g = new Alquerque(this.config().size);
        this.board.build(g.size);
        this.board.render(g.board);
        this.updateCounts(g);
    }

    // ---------- game flow ----------

    isPlaying() {
        return this.game !== null && !this.game.isOver();
    }

    isHumanTurn() {
        return this.isPlaying() && this.game.currentPlayer === HUMAN;
    }

    startGame() {
        clearTimeout(this.aiTimer);
        const cfg = this.config();
        this.current = cfg;
        this.game = new Alquerque(cfg.size, cfg.first);
        this.ai = new SimpleAI(cfg.level);
        this.selected = null;
        this.path = [];
        this.lastMove = null;

        this.board.build(cfg.size);
        this.nextTurn();
    }

    // Called after every move/pass: ends the game or hands the turn over.
    nextTurn() {
        this.refresh();
        if (this.game.isOver()) {
            this.endGame(this.game.getWinner());
        } else if (this.game.currentPlayer === COMPUTER) {
            this.aiTimer = setTimeout(() => this.computerPlays(), 600);
        }
    }

    computerPlays() {
        const move = this.ai.chooseMove(this.game);
        if (move) {
            this.game.play(move);
            this.lastMove = [move.from, move.to];
            this.notice = move.captures.length
                ? "The computer captured " + move.captures.length + (move.captures.length > 1 ? " pieces." : " piece.")
                : "";
        } else {
            this.game.pass();
            this.lastMove = null;
            this.notice = "The computer had no moves and passed its turn.";
        }
        this.nextTurn();
    }

    humanPlays(move) {
        this.selected = null;
        this.path = [];
        this.notice = "";
        this.game.play(move);
        this.lastMove = [move.from, move.to];
        this.nextTurn();
    }

    endGame(winner) {
        const key = this.current.size + "x" + this.current.size + "|" + this.current.level;
        const entry = (this.rankings[key] ||= { wins: 0, losses: 0, draws: 0 });

        if (this.game.resigned === HUMAN) {
            entry.losses++;
            this.message("You resigned. The computer won.", "loss");
        } else if (winner === HUMAN) {
            entry.wins++;
            this.message("Game over: you won!", "win");
        } else if (winner === COMPUTER) {
            entry.losses++;
            this.message("Game over: the computer won.", "loss");
        } else {
            entry.draws++;
            this.message("Game over: draw (neither player can move).");
        }
        this.updateCommands();
    }

    pass() {
        if (!this.isHumanTurn() || !this.game.pass()) return;
        this.selected = null;
        this.path = [];
        this.notice = "You passed your turn.";
        this.nextTurn();
    }

    resign() {
        if (!this.isPlaying()) return;
        clearTimeout(this.aiTimer);
        this.selected = null;
        this.path = [];
        this.game.resign(HUMAN);
        this.refresh();
        this.endGame(this.game.getWinner());
    }

    // ---------- board interaction (modes: choose piece -> choose destination) ----------

    humanMoves() {
        return this.game.getLegalMoves();
    }

    // Moves of the selected piece that are still compatible with the clicked path.
    candidates() {
        if (!this.selected) return [];
        const same = (a, b) => a[0] === b[0] && a[1] === b[1];
        return this.humanMoves().filter(m =>
            same(m.from, this.selected) && this.path.every((p, i) => same(m.path[i], p)));
    }

    onPointClick(r, c) {
        if (!this.game) {
            this.message("Press “Start game” to begin.");
            return;
        }
        if (!this.isPlaying()) return;
        if (!this.isHumanTurn()) {
            this.message("Please wait: it is the computer's turn.", "warn");
            return;
        }

        const moves = this.humanMoves();
        if (moves.length === 0) {
            this.message("You have no possible moves: press “Pass turn”.", "warn");
            return;
        }

        const ownMovable = moves.some(m => m.from[0] === r && m.from[1] === c);

        // Mode 1: no piece selected yet
        if (!this.selected) {
            if (ownMovable) {
                this.selected = [r, c];
                this.path = [];
            } else if (this.game.board[r][c] === HUMAN) {
                this.message("That piece has no possible moves.", "warn");
                return;
            } else {
                this.message("Choose one of your pieces (blue).", "warn");
                return;
            }
            this.refresh();
            return;
        }

        // Mode 2: piece selected, choosing the destination
        const step = this.path.length;
        const next = this.candidates().filter(m => m.path[step][0] === r && m.path[step][1] === c);

        if (next.length === 0) {
            if (step === 0 && r === this.selected[0] && c === this.selected[1]) {
                this.selected = null; // click the same piece again to deselect
            } else if (step === 0 && ownMovable) {
                this.selected = [r, c];
            } else {
                this.message("Invalid destination. Choose one of the highlighted points.", "warn");
                return;
            }
            this.refresh();
            return;
        }

        this.path.push([r, c]);
        const done = next.find(m => m.path.length === this.path.length);
        if (done) {
            this.humanPlays(done);
        } else {
            this.refresh();
        }
    }

    // ---------- rendering ----------

    refresh() {
        if (!this.game) return;
        const marks = { last: this.lastMove || [] };
        const humanTurn = this.isHumanTurn();

        if (humanTurn) {
            const moves = this.humanMoves();
            if (this.selected) {
                marks.selected = this.path.length ? this.path[this.path.length - 1] : this.selected;
                marks.path = this.path.length ? [this.selected, ...this.path] : [];
                marks.targets = this.candidates().map(m => m.path[this.path.length]);
            } else {
                marks.movable = moves.map(m => m.from);
            }

            const pre = this.notice ? this.notice + " " : "";
            if (moves.length === 0) this.message(pre + "You have no possible moves: press “Pass turn”.", "warn");
            else if (this.path.length) this.message("Multiple capture: choose the next jump.");
            else if (this.selected) this.message("Choose the destination (highlighted points) or another piece.");
            else this.message(pre + "It's your turn: choose a blue piece to move.");
        } else if (this.isPlaying()) {
            this.message((this.notice ? this.notice + " " : "") + "Computer's turn…");
        }

        this.board.render(this.game.board, marks);
        this.board.setActive(humanTurn);
        this.updateCounts(this.game);
        this.updateCommands();
    }

    updateCounts(game) {
        this.$("count-human").textContent = game.countPieces(HUMAN);
        this.$("count-computer").textContent = game.countPieces(COMPUTER);
        this.$("name-human").textContent = this.username || "Player";
    }

    updateCommands() {
        const playing = this.isPlaying();
        const humanTurn = this.isHumanTurn();
        const mustPass = humanTurn && this.humanMoves().length === 0;
        this.$("btn-pass").disabled = !mustPass;
        this.$("btn-resign").disabled = !playing;
        this.$("btn-start").textContent = playing ? "Restart" : "Start game";
        for (const id of ["cfg-size", "cfg-opponent", "cfg-first", "cfg-level"]) this.$(id).disabled = playing;
    }

    message(text, kind = "") {
        const m = this.$("message");
        m.textContent = text;
        m.className = kind;
    }

    renderRankings() {
        const body = this.$("rankings-body");
        body.replaceChildren();
        const keys = Object.keys(this.rankings).sort();
        if (keys.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = "No games recorded yet.";
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }
        for (const key of keys) {
            const [size, level] = key.split("|");
            const e = this.rankings[key];
            const tr = document.createElement("tr");
            for (const v of [size, LEVEL_NAMES[level], e.wins, e.losses, e.draws]) {
                const td = document.createElement("td");
                td.textContent = v;
                tr.appendChild(td);
            }
            body.appendChild(tr);
        }
    }

    // ---------- identification (no real authentication in the 1st delivery) ----------

    login(e) {
        e.preventDefault();
        const user = this.$("login-user").value.trim();
        if (!user) return;
        this.username = user;
        this.$("login-form").hidden = true;
        this.$("user-info").hidden = false;
        this.$("user-name").textContent = user;
        this.$("name-human").textContent = user;
    }

    logout() {
        this.username = null;
        this.$("login-form").reset();
        this.$("login-form").hidden = false;
        this.$("user-info").hidden = true;
        this.$("name-human").textContent = "Player";
    }
}

window.addEventListener("DOMContentLoaded", () => new App());
