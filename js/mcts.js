/*  ** MCTS NODE **

  CONSTRUCTOR
    MCTSNode(game, parent, move)
    | game   -> The game state exactly at this node (already a clone).
    | parent -> The node that came immediately before this one (null if root).
    | move   -> The move played to reach this node (null if root).

  METHODS
    boolean isFullyExpanded()
    | True if every legal move already has a child node.

    boolean isTerminal()
    | True if the game has ended at this node.

    number ucb1(c)
    | Upper Confidence Bound score. Infinity if unvisited so it always gets checked.

    MCTSNode bestChild(c)
    | Child with the highest UCB1 score.

  VARIABLES
    number mover        | Who played the move that created this node (null if root).
    MCTSNode[] children | Expanded child branches.
    Array untriedMoves  | Moves that haven't been expanded yet.
    number visits       | Simulations that passed through this node.
    number wins         | Score accumulated by `mover` (1 per win, 0.5 per draw).
*/

class MCTSNode {
    constructor(game, parent = null, move = null) {
        this.game = game;
        this.parent = parent;
        this.move = move;
        this.mover = parent ? parent.game.currentPlayer : null;

        this.children = [];
        this.untriedMoves = game.getLegalMoves();

        this.visits = 0;
        this.wins = 0;
    }

    isFullyExpanded() {
        return this.untriedMoves.length === 0;
    }

    isTerminal() {
        return this.game.isOver();
    }

    ucb1(c) {
        if (this.visits === 0) return Infinity;
        return this.wins / this.visits + c * Math.sqrt(Math.log(this.parent.visits) / this.visits);
    }

    bestChild(c) {
        let best = null;
        let bestScore = -Infinity;
        for (const child of this.children) {
            const score = child.ucb1(c);
            if (score > bestScore) {
                bestScore = score;
                best = child;
            }
        }
        return best;
    }
}

/*  ** MCTS **

  CONSTRUCTOR
    MCTS(c, maxDepth)
    | c        -> UCB1 exploration constant (higher = explore more). Default sqrt(2).
    | maxDepth -> Depth limit for random simulations. Default 150.

  METHODS
    move getBestMove(game, iterations)
    | Runs the full MCTS loop on a copy of `game` and returns the chosen move.

    Phases (can be overridden by subclasses):
    select(node)            | Walks down the tree with UCB1.
    expand(node)            | Creates one child from an untried move.
    simulate(node)          | Random playout; returns the winner (0 / DRAW for a draw).
    backpropagate(node, w)  | Updates visits and wins up to the root.
    pickBestChild(root)     | Default: most visited child.
*/

class MCTS {
    constructor(c = Math.SQRT2, maxDepth = 150) {
        this.c = c;
        this.maxDepth = maxDepth;
    }

    getBestMove(game, iterations = 10000) {
        const root = new MCTSNode(game.clone());

        for (let i = 0; i < iterations; i++) {
            const node = this.select(root);

            if (node.isTerminal()) {
                this.backpropagate(node, node.game.getWinner());
                continue;
            }

            const child = this.expand(node);
            this.backpropagate(child, this.simulate(child));
        }

        const best = this.pickBestChild(root);
        if (best) return best.move;

        const moves = game.getLegalMoves();
        return moves.length ? randomItem(moves) : null;
    }

    select(node) {
        while (node.isFullyExpanded() && node.children.length > 0 && !node.isTerminal()) {
            node = node.bestChild(this.c);
        }
        return node;
    }

    expand(node) {
        const i = Math.floor(Math.random() * node.untriedMoves.length);
        const move = node.untriedMoves.splice(i, 1)[0];

        const next = node.game.clone();
        next.play(move);

        const child = new MCTSNode(next, node, move);
        node.children.push(child);
        return child;
    }

    simulate(node) {
        const sim = node.game.clone();
        for (let depth = 0; depth < this.maxDepth; depth++) {
            const winner = sim.getWinner();
            if (winner !== 0) return winner;

            const moves = sim.getLegalMoves();
            if (moves.length === 0) return DRAW;

            sim.play(randomItem(moves));
        }
        return DRAW;
    }

    backpropagate(node, winner) {
        for (let cur = node; cur; cur = cur.parent) {
            cur.visits++;
            if (winner === DRAW) cur.wins += 0.5;
            else if (winner !== 0 && cur.mover === winner) cur.wins += 1;
        }
    }

    pickBestChild(root) {
        let best = null;
        for (const child of root.children) {
            if (!best || child.visits > best.visits) best = child;
        }
        return best;
    }
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
