/* Draws the board and its pieces in the page. */

const SVG_NS = "http://www.w3.org/2000/svg";
const BOARD_MARGIN = 8; // % of the board left free around the outer lines

class BoardView {
    constructor(container, onClick) {
        this.container = container;
        this.onClick = onClick;
        this.size = 0;
        this.points = [];
    }

    pos(i) {
        return BOARD_MARGIN + ((100 - 2 * BOARD_MARGIN) * i) / (this.size - 1);
    }

    build(size) {
        this.size = size;
        this.container.replaceChildren();

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("class", "board-lines");

        const line = (r1, c1, r2, c2) => {
            const l = document.createElementNS(SVG_NS, "line");
            l.setAttribute("x1", this.pos(c1));
            l.setAttribute("y1", this.pos(r1));
            l.setAttribute("x2", this.pos(c2));
            l.setAttribute("y2", this.pos(r2));
            svg.appendChild(l);
        };

        const last = size - 1;
        for (let i = 0; i < size; i++) {
            line(i, 0, i, last);
            line(0, i, last, i);
        }
        // One diagonal per square, alternating so they only cross where (r + c) is even.
        for (let r = 0; r < last; r++) {
            for (let c = 0; c < last; c++) {
                if ((r + c) % 2 === 0) line(r, c, r + 1, c + 1);
                else line(r, c + 1, r + 1, c);
            }
        }
        this.container.appendChild(svg);

        const diameter = (100 - 2 * BOARD_MARGIN) / last * 0.58;
        this.points = [];
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) {
                const p = document.createElement("div");
                p.className = "point";
                p.style.left = this.pos(c) + "%";
                p.style.top = this.pos(r) + "%";
                p.style.width = diameter + "%";
                p.style.height = diameter + "%";
                p.addEventListener("click", () => this.onClick(r, c));
                this.container.appendChild(p);
                row.push(p);
            }
            this.points.push(row);
        }
    }

    render(board, marks = {}) {
        const has = (list, r, c) => (list || []).some(([a, b]) => a === r && b === c);

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const p = this.points[r][c];
                const v = board[r][c];
                p.className = "point";
                if (v !== 0) p.classList.add("piece", "player" + v);
                if (marks.selected && marks.selected[0] === r && marks.selected[1] === c) p.classList.add("selected");
                if (has(marks.movable, r, c)) p.classList.add("movable");
                if (has(marks.targets, r, c)) p.classList.add("target");
                if (has(marks.path, r, c)) p.classList.add("path");
                if (has(marks.last, r, c)) p.classList.add("last");
            }
        }
    }
}
