/* Connects the page to the game. The human is player 1, the computer player 2. */

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
        this.notice = "";
        this.selected = null;
        this.path = [];
        this.lastMove = null;
        this.rankings = {};

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
        this.game = new Alquerque(cfg.size, cfg.first);
        this.ai = new SimpleAI(cfg.level);
        this.selected = null;
        this.path = [];
        this.lastMove = null;
        this.notice = "";

        this.board.build(cfg.size);
        this.nextTurn();
    }

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
        const cfg = this.config();
        const key = cfg.size + "x" + cfg.size + "|" + cfg.level;
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
    }

    pass() {
        if (!this.isHumanTurn() || !this.game.pass()) return;
        this.notice = "You passed your turn.";
        this.nextTurn();
    }

    resign() {
        if (!this.isPlaying()) return;
        clearTimeout(this.aiTimer);
        this.game.resign(HUMAN);
        this.nextTurn();
    }

    // ---------- board interaction ----------

    // Moves of the selected piece that are still compatible with the clicked path.
    candidates() {
        if (!this.selected) return [];
        const same = (a, b) => a[0] === b[0] && a[1] === b[1];
        return this.game.getLegalMoves().filter(m =>
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

        const moves = this.game.getLegalMoves();
        if (moves.length === 0) {
            this.message("You have no possible moves: press “Pass turn”.", "warn");
            return;
        }

        const ownMovable = moves.some(m => m.from[0] === r && m.from[1] === c);

        if (!this.selected) {
            if (ownMovable) {
                this.selected = [r, c];
                this.refresh();
            } else {
                this.message(this.game.board[r][c] === HUMAN ? "That piece has no possible moves." : "Choose one of your pieces (blue).", "warn");
            }
            return;
        }

        const step = this.path.length;
        const next = this.candidates().filter(m => m.path[step][0] === r && m.path[step][1] === c);

        if (next.length === 0) {
            if (step > 0 || !ownMovable) {
                this.message("Invalid destination. Choose one of the highlighted points.", "warn");
            } else {
                this.selected = r === this.selected[0] && c === this.selected[1] ? null : [r, c];
                this.refresh();
            }
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
        const marks = { last: this.lastMove || [] };
        const pre = this.notice ? this.notice + " " : "";

        if (this.isHumanTurn()) {
            const moves = this.game.getLegalMoves();
            if (this.selected) {
                marks.selected = this.path.length ? this.path[this.path.length - 1] : this.selected;
                marks.path = this.path;
                marks.targets = this.candidates().map(m => m.path[this.path.length]);
            } else {
                marks.movable = moves.map(m => m.from);
            }

            if (moves.length === 0) this.message(pre + "You have no possible moves: press “Pass turn”.", "warn");
            else if (this.path.length) this.message("Multiple capture: choose the next jump.");
            else if (this.selected) this.message("Choose the destination (highlighted points) or another piece.");
            else this.message(pre + "It's your turn: choose a blue piece to move.");
        } else if (this.isPlaying()) {
            this.message(pre + "Computer's turn…");
        }

        this.board.render(this.game.board, marks);
        this.updateCounts(this.game);
        this.updateCommands();
    }

    updateCounts(game) {
        this.$("count-human").textContent = game.countPieces(HUMAN);
        this.$("count-computer").textContent = game.countPieces(COMPUTER);
    }

    updateCommands() {
        const playing = this.isPlaying();
        const humanTurn = this.isHumanTurn();
        const mustPass = humanTurn && this.game.getLegalMoves().length === 0;
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
        const addRow = cells => {
            const tr = body.insertRow();
            for (const v of cells) tr.insertCell().textContent = v;
            return tr;
        };

        const keys = Object.keys(this.rankings).sort();
        if (keys.length === 0) addRow(["No games recorded yet."]).cells[0].colSpan = 5;
        for (const key of keys) {
            const [size, level] = key.split("|");
            const e = this.rankings[key];
            addRow([size, LEVEL_NAMES[level], e.wins, e.losses, e.draws]);
        }
    }

    // ---------- identification ----------

    login(e) {
        e.preventDefault();
        const user = this.$("login-user").value.trim();
        if (!user) return;
        this.$("login-form").hidden = true;
        this.$("user-info").hidden = false;
        this.$("user-name").textContent = user;
        this.$("name-human").textContent = user;
    }

    logout() {
        this.$("login-form").reset();
        this.$("login-form").hidden = false;
        this.$("user-info").hidden = true;
        this.$("name-human").textContent = "Player";
    }
}

window.addEventListener("DOMContentLoaded", () => new App());
