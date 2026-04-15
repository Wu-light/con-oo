import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 game save / load JSON', () => {
  it('saveToJSON returns a valid JSON string', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })

    const jsonString = game.saveToJSON()
    expect(typeof jsonString).toBe('string')
    expect(() => JSON.parse(jsonString)).not.toThrow()
  })

  it('loadFromJSON restores the current board state', async () => {
    const { createGame, createSudoku, loadFromJSON } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    const saved = game.saveToJSON()
    const restored = loadFromJSON(saved)

    expect(restored.getSudoku().getGrid()).toEqual(game.getSudoku().getGrid())
  })

  it('round-trip preserves undo capability', async () => {
    const { createGame, createSudoku, loadFromJSON } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    const restored = loadFromJSON(game.saveToJSON())

    expect(restored.canUndo()).toBe(true)
    restored.undo()
    expect(restored.getSudoku().getGrid()[1][1]).toBe(0)
    expect(restored.getSudoku().getGrid()[0][2]).toBe(4)
  })

  it('round-trip preserves redo capability after undo', async () => {
    const { createGame, createSudoku, loadFromJSON } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.undo()
    expect(game.canRedo()).toBe(true)

    const restored = loadFromJSON(game.saveToJSON())

    expect(restored.canRedo()).toBe(true)
    restored.redo()
    expect(restored.getSudoku().getGrid()[0][2]).toBe(4)
  })

  it('restored game is independent from the original', async () => {
    const { createGame, createSudoku, loadFromJSON } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })

    const restored = loadFromJSON(game.saveToJSON())
    restored.guess({ row: 2, col: 0, value: 1 })

    // Original is unaffected
    expect(game.getSudoku().getGrid()[2][0]).toBe(0)
    expect(restored.getSudoku().getGrid()[2][0]).toBe(1)
  })

  it('toJSON + createGameFromJSON round-trip matches saveToJSON + loadFromJSON', async () => {
    const { createGame, createGameFromJSON, createSudoku, loadFromJSON } =
      await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })

    const viaObject = createGameFromJSON(JSON.parse(JSON.stringify(game.toJSON())))
    const viaString = loadFromJSON(game.saveToJSON())

    expect(viaObject.getSudoku().getGrid()).toEqual(viaString.getSudoku().getGrid())
  })
})
