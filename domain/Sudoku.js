const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function deepCopyGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * @param {number[][]} inputGrid - 9x9 numeric grid (0 = empty)
 */
export function createSudoku(inputGrid) {
  // Defensive copy so external mutations don't affect internal state
  const grid = deepCopyGrid(inputGrid);

  return {
    /**
     * @returns {number[][]}
     */
    getGrid() {
      return deepCopyGrid(grid);
    },

    /**
     * @param {{ row: number, col: number, value: number }} move
     */
    guess({ row, col, value }) {
      grid[row][col] = value;
    },

    /**
     * @returns {ReturnType<createSudoku>}
     */
    clone() {
      return createSudoku(grid);
    },

    /**
     * @returns {{ grid: number[][] }}
     */
    toJSON() {
      return { grid: deepCopyGrid(grid) };
    },

    /**
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
 * @param {{ grid: number[][] }} json
 */
export function createSudokuFromJSON(json) {
  return createSudoku(json.grid);
}