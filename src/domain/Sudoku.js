const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * Deep copy a 9x9 grid (defensive copy).
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function deepCopyGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * Create a Sudoku domain object.
 *
 * Responsibilities:
 *  - Hold the current grid / board data
 *  - Provide guess() to update a cell
 *  - Provide validation helpers (via getGrid + external check)
 *  - Provide clone() for independent deep copies (used by Game history)
 *  - Provide toJSON() / toString() for serialization
 *
 * @param {number[][]} inputGrid - 9x9 numeric grid (0 = empty)
 */
export function createSudoku(inputGrid) {
  // Defensive copy so external mutations don't affect internal state
  const grid = deepCopyGrid(inputGrid);

  return {
    /**
     * Return a defensive copy of the current grid.
     * @returns {number[][]}
     */
    getGrid() {
      return deepCopyGrid(grid);
    },

    /**
     * Place a value at the given cell.
     * @param {{ row: number, col: number, value: number }} move
     */
    guess({ row, col, value }) {
      grid[row][col] = value;
    },

    /**
     * Create an independent deep copy of this Sudoku.
     * @returns {ReturnType<createSudoku>}
     */
    clone() {
      return createSudoku(grid);
    },

    /**
     * Serialize to a plain JSON-safe object.
     * @returns {{ grid: number[][] }}
     */
    toJSON() {
      return { grid: deepCopyGrid(grid) };
    },

    /**
     * Human-readable string representation of the board.
     * @returns {string}
     */
    toString() {
      let out = '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2564\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2564\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n';
      for (let row = 0; row < SUDOKU_SIZE; row++) {
        if (row !== 0 && row % BOX_SIZE === 0) {
          out += '\u255f\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2562\n';
        }
        for (let col = 0; col < SUDOKU_SIZE; col++) {
          if (col === 0) out += '\u2551 ';
          else if (col % BOX_SIZE === 0) out += '\u2502 ';
          out += (grid[row][col] === 0 ? '\u00b7' : grid[row][col]) + ' ';
          if (col === SUDOKU_SIZE - 1) out += '\u2551';
        }
        out += '\n';
      }
      out += '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2567\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2567\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d';
      return out;
    },
  };
}

/**
 * Restore a Sudoku from its JSON representation.
 * @param {{ grid: number[][] }} json
 */
export function createSudokuFromJSON(json) {
  return createSudoku(json.grid);
}
