import { createSudokuFromJSON } from './Sudoku.js';

/**
 * Internal factory: build a Game from explicit state (used by both
 * createGame and createGameFromJSON).
 */
function createGameInternal(currentSudoku, history, historyIdx) {
  let _current = currentSudoku;
  let _history = history;
  let _idx = historyIdx;

  return {
    /**
     * Get the current Sudoku domain object.
     */
    getSudoku() {
      return _current;
    },

    /**
     * Make a guess: update the current Sudoku and record in history.
     * @param {{ row: number, col: number, value: number }} move
     */
    guess({ row, col, value }) {
      _current.guess({ row, col, value });
      // Discard any redo history beyond current position
      _history.length = _idx + 1;
      // Snapshot the new state
      _history.push(_current.clone());
      _idx++;
    },

    /**
     * Undo the last move (restore previous snapshot).
     */
    undo() {
      if (_idx > 0) {
        _idx--;
        _current = _history[_idx].clone();
      }
    },

    /**
     * Redo a previously undone move.
     */
    redo() {
      if (_idx < _history.length - 1) {
        _idx++;
        _current = _history[_idx].clone();
      }
    },

    /** @returns {boolean} */
    canUndo() {
      return _idx > 0;
    },

    /** @returns {boolean} */
    canRedo() {
      return _idx < _history.length - 1;
    },

    /**
     * Serialize the full game state (including history) to plain JSON.
     */
    toJSON() {
      return {
        currentSudoku: _current.toJSON(),
        history: _history.map(s => s.toJSON()),
        historyIndex: _idx,
      };
    },
  };
}

/**
 * Create a new Game wrapping a Sudoku.
 *
 * Responsibilities:
 *  - Hold the current Sudoku
 *  - Manage move history (snapshot-based)
 *  - Provide undo() / redo()
 *  - Provide guess() as the single entry point for UI operations
 *
 * @param {{ sudoku: ReturnType<import('./Sudoku.js').createSudoku> }} opts
 */
export function createGame({ sudoku }) {
  const initialSnapshot = sudoku.clone();
  return createGameInternal(sudoku.clone(), [initialSnapshot], 0);
}

/**
 * Restore a Game from its JSON representation.
 * @param {object} json
 */
export function createGameFromJSON(json) {
  const currentSudoku = createSudokuFromJSON(json.currentSudoku);
  const history = json.history.map(s => createSudokuFromJSON(s));
  return createGameInternal(currentSudoku, history, json.historyIndex);
}
