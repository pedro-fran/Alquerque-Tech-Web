/* Computer player: the level sets how often it picks the biggest capture. */

const GREEDY_CHANCE = { easy: 0, medium: 0.5, hard: 1 };

class SimpleAI {
    constructor(level = "medium") {
        this.greedyChance = GREEDY_CHANCE[level] ?? 0.5;
    }

    chooseMove(game) {
        const moves = game.getLegalMoves();
        if (moves.length === 0) return null;

        if (Math.random() < this.greedyChance) {
            const most = Math.max(...moves.map(m => m.captures.length));
            if (most > 0) return randomItem(moves.filter(m => m.captures.length === most));
        }
        return randomItem(moves);
    }
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
