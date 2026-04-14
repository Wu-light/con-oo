import { createSudokuFromJSON } from './Sudoku.js';


function createGameInternal(currentSudoku, history, historyIdx) {
  let _current = currentSudoku;
  let _history = history;
  let _idx = historyIdx;

  return {
    
    getSudoku() {
      return _current;
    },

    /**
     * @param {{ row: number, col: number, value: number }} move
     */
    guess({ row, col, value }) {
      _current.guess({ row, col, value });
      
      _history.length = _idx + 1;
      
      _history.push(_current.clone());
      _idx++;
    },

   
    undo() {
      if (_idx > 0) {
        _idx--;
        _current = _history[_idx].clone();
      }
    },

    
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

 * @param {{ sudoku: ReturnType<import('./Sudoku.js').createSudoku> }} opts
 */
export function createGame({ sudoku }) {
  const initialSnapshot = sudoku.clone();
  return createGameInternal(sudoku.clone(), [initialSnapshot], 0);
}

/**
 * @param {object} json
 */
export function createGameFromJSON(json) {
  const currentSudoku = createSudokuFromJSON(json.currentSudoku);
  const history = json.history.map(s => createSudokuFromJSON(s));
  return createGameInternal(currentSudoku, history, json.historyIndex);
}