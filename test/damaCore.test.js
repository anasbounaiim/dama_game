import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAYERS,
  applyMove,
  createEmptyState,
  createInitialState,
  createPiece,
  deserializeBoard,
  getLegalMoves,
  serializeBoard,
} from "../src/damaCore.js";

test("creates the classic 8x8 starting position", () => {
  const state = createInitialState();

  assert.equal(state.turn, PLAYERS.RED);
  assert.equal(state.board.flat().filter(Boolean).length, 24);
  assert.equal(state.board.flat().filter((piece) => piece?.player === PLAYERS.RED).length, 12);
  assert.equal(state.board.flat().filter((piece) => piece?.player === PLAYERS.BLACK).length, 12);
  assert.equal(getLegalMoves(state).length, 7);
});

test("applies a quiet move without mutating the original state", () => {
  const state = createInitialState();
  const move = getLegalMoves(state).find((candidate) => candidate.from.row === 5 && candidate.from.col === 0);
  const next = applyMove(state, move);

  assert.equal(state.board[5][0]?.player, PLAYERS.RED);
  assert.equal(next.board[5][0], null);
  assert.equal(next.board[4][1]?.player, PLAYERS.RED);
  assert.equal(next.turn, PLAYERS.BLACK);
});

test("requires captures and filters to the longest capture line", () => {
  const state = createEmptyState();

  state.board[5][0] = createPiece(PLAYERS.RED);
  state.board[4][1] = createPiece(PLAYERS.BLACK);
  state.board[2][3] = createPiece(PLAYERS.BLACK);
  state.board[2][5] = createPiece(PLAYERS.BLACK);

  const moves = getLegalMoves(state);

  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].path, [
    { row: 3, col: 2 },
    { row: 1, col: 4 },
    { row: 3, col: 6 },
  ]);
  assert.equal(moves[0].captures.length, 3);
});

test("allows flying kings to capture from distance", () => {
  const state = createEmptyState();

  state.board[7][0] = createPiece(PLAYERS.RED, true);
  state.board[4][3] = createPiece(PLAYERS.BLACK);

  const moves = getLegalMoves(state);
  const landings = moves.map((move) => move.to);

  assert.deepEqual(landings, [
    { row: 3, col: 4 },
    { row: 2, col: 5 },
    { row: 1, col: 6 },
    { row: 0, col: 7 },
  ]);
});

test("serializes and deserializes a board", () => {
  const state = createEmptyState();

  state.board[0][1] = createPiece(PLAYERS.BLACK, true);
  state.board[7][6] = createPiece(PLAYERS.RED);

  const serialized = serializeBoard(state.board);
  const board = deserializeBoard(serialized);

  assert.equal(board[0][1].player, PLAYERS.BLACK);
  assert.equal(board[0][1].king, true);
  assert.equal(board[7][6].player, PLAYERS.RED);
});
