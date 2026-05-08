export const PLAYERS = Object.freeze({
  RED: "red",
  BLACK: "black",
});

export const MOROCCAN_DAMA_RULES = Object.freeze({
  boardSize: 8,
  mandatoryCapture: true,
  maximumCapture: true,
  menCaptureBackward: true,
  flyingKings: true,
});

const DARK_SQUARE_REMAINDER = 1;
const DIRECTIONS = Object.freeze([
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]);

export function createInitialState(options = {}) {
  const rules = normalizeRules(options.rules);
  const board = createEmptyBoard(rules.boardSize);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < rules.boardSize; col += 1) {
      if (isPlayableSquare(row, col)) {
        board[row][col] = createPiece(PLAYERS.BLACK);
      }
    }
  }

  for (let row = rules.boardSize - 3; row < rules.boardSize; row += 1) {
    for (let col = 0; col < rules.boardSize; col += 1) {
      if (isPlayableSquare(row, col)) {
        board[row][col] = createPiece(PLAYERS.RED);
      }
    }
  }

  return {
    board,
    turn: options.turn ?? PLAYERS.RED,
    rules,
    winner: null,
    status: "playing",
    moveNumber: 1,
    history: [],
  };
}

export function createEmptyState(options = {}) {
  const rules = normalizeRules(options.rules);

  return {
    board: createEmptyBoard(rules.boardSize),
    turn: options.turn ?? PLAYERS.RED,
    rules,
    winner: null,
    status: "playing",
    moveNumber: 1,
    history: [],
  };
}

export function cloneState(state) {
  return {
    ...state,
    board: cloneBoard(state.board),
    rules: { ...state.rules },
    history: state.history.map((entry) => ({
      ...entry,
      move: cloneMove(entry.move),
    })),
  };
}

export function createPiece(player, king = false) {
  return { player, king };
}

export function getLegalMoves(state) {
  if (state.status !== "playing") {
    return [];
  }

  const captures = [];
  const quietMoves = [];

  forEachBoardSquare(state.board, (piece, row, col) => {
    if (!piece || piece.player !== state.turn) {
      return;
    }

    captures.push(...getCaptureMovesForPiece(state, row, col));

    if (!state.rules.mandatoryCapture) {
      quietMoves.push(...getQuietMovesForPiece(state, row, col));
    }
  });

  if (captures.length > 0) {
    return state.rules.maximumCapture ? filterMaximumCaptures(captures) : captures;
  }

  if (state.rules.mandatoryCapture) {
    forEachBoardSquare(state.board, (piece, row, col) => {
      if (piece?.player === state.turn) {
        quietMoves.push(...getQuietMovesForPiece(state, row, col));
      }
    });
  }

  return quietMoves;
}

export function applyMove(state, move) {
  const legalMove = findMatchingMove(getLegalMoves(state), move);

  if (!legalMove) {
    throw new Error("Illegal move.");
  }

  const next = cloneState(state);
  const piece = next.board[legalMove.from.row][legalMove.from.col];

  next.board[legalMove.from.row][legalMove.from.col] = null;

  for (const captured of legalMove.captures) {
    next.board[captured.row][captured.col] = null;
  }

  if (shouldPromote(piece, legalMove.to.row, next.rules.boardSize)) {
    piece.king = true;
  }

  next.board[legalMove.to.row][legalMove.to.col] = piece;
  next.turn = getOpponent(state.turn);
  next.moveNumber = state.turn === PLAYERS.BLACK ? state.moveNumber + 1 : state.moveNumber;
  next.history = [
    ...next.history,
    {
      move: cloneMove(legalMove),
      player: state.turn,
      boardAfter: serializeBoard(next.board),
    },
  ];

  return updateGameStatus(next);
}

export function getWinner(state) {
  return state.winner;
}

export function getOpponent(player) {
  if (player === PLAYERS.RED) {
    return PLAYERS.BLACK;
  }

  if (player === PLAYERS.BLACK) {
    return PLAYERS.RED;
  }

  throw new Error(`Unknown player: ${player}`);
}

export function serializeBoard(board) {
  return board
    .map((row) =>
      row
        .map((piece) => {
          if (!piece) {
            return ".";
          }

          if (piece.player === PLAYERS.RED) {
            return piece.king ? "R" : "r";
          }

          return piece.king ? "B" : "b";
        })
        .join("")
    )
    .join("/");
}

export function deserializeBoard(serialized, rules = MOROCCAN_DAMA_RULES) {
  const rows = serialized.split("/");
  const boardSize = normalizeRules(rules).boardSize;

  if (rows.length !== boardSize || rows.some((row) => row.length !== boardSize)) {
    throw new Error(`Serialized board must be ${boardSize}x${boardSize}.`);
  }

  return rows.map((row) =>
    [...row].map((cell) => {
      if (cell === ".") {
        return null;
      }

      if (cell === "r" || cell === "R") {
        return createPiece(PLAYERS.RED, cell === "R");
      }

      if (cell === "b" || cell === "B") {
        return createPiece(PLAYERS.BLACK, cell === "B");
      }

      throw new Error(`Unknown board token: ${cell}`);
    })
  );
}

export function isPlayableSquare(row, col) {
  return (row + col) % 2 === DARK_SQUARE_REMAINDER;
}

function normalizeRules(rules = {}) {
  return {
    ...MOROCCAN_DAMA_RULES,
    ...rules,
  };
}

function createEmptyBoard(boardSize) {
  return Array.from({ length: boardSize }, () => Array.from({ length: boardSize }, () => null));
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function getQuietMovesForPiece(state, row, col) {
  const piece = state.board[row][col];

  if (piece.king && state.rules.flyingKings) {
    return getFlyingKingQuietMoves(state, row, col);
  }

  return getStepQuietMoves(state, row, col);
}

function getStepQuietMoves(state, row, col) {
  const piece = state.board[row][col];

  return getMoveDirections(piece)
    .map(([rowStep, colStep]) => ({
      row: row + rowStep,
      col: col + colStep,
    }))
    .filter((to) => isInsideBoard(to.row, to.col, state.rules.boardSize) && !state.board[to.row][to.col])
    .map((to) => buildMove({ from: { row, col }, path: [to], captures: [], piece, boardSize: state.rules.boardSize }));
}

function getFlyingKingQuietMoves(state, row, col) {
  const moves = [];
  const piece = state.board[row][col];

  for (const [rowStep, colStep] of DIRECTIONS) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol, state.rules.boardSize) && !state.board[nextRow][nextCol]) {
      moves.push(
        buildMove({
          from: { row, col },
          path: [{ row: nextRow, col: nextCol }],
          captures: [],
          piece,
          boardSize: state.rules.boardSize,
        })
      );

      nextRow += rowStep;
      nextCol += colStep;
    }
  }

  return moves;
}

function getCaptureMovesForPiece(state, row, col) {
  const piece = state.board[row][col];
  const board = cloneBoard(state.board);

  return exploreCaptures({
    board,
    rules: state.rules,
    piece,
    origin: { row, col },
    current: { row, col },
    path: [],
    captures: [],
  });
}

function exploreCaptures(context) {
  const jumps = getCaptureJumps(context);
  const moves = [];

  if (jumps.length === 0) {
    if (context.captures.length === 0) {
      return [];
    }

    return [
      buildMove({
        from: context.origin,
        path: context.path,
        captures: context.captures,
        piece: context.piece,
        boardSize: context.rules.boardSize,
      }),
    ];
  }

  for (const jump of jumps) {
    const nextBoard = cloneBoard(context.board);

    nextBoard[context.current.row][context.current.col] = null;
    nextBoard[jump.captured.row][jump.captured.col] = null;
    nextBoard[jump.to.row][jump.to.col] = context.piece;

    moves.push(
      ...exploreCaptures({
        ...context,
        board: nextBoard,
        current: jump.to,
        path: [...context.path, jump.to],
        captures: [...context.captures, jump.captured],
      })
    );
  }

  return moves;
}

function getCaptureJumps({ board, rules, piece, current }) {
  if (piece.king && rules.flyingKings) {
    return getFlyingKingCaptureJumps(board, rules, piece, current);
  }

  return getStepCaptureJumps(board, rules, piece, current);
}

function getStepCaptureJumps(board, rules, piece, current) {
  const directions = piece.king || rules.menCaptureBackward ? DIRECTIONS : getMoveDirections(piece);
  const jumps = [];

  for (const [rowStep, colStep] of directions) {
    const captured = {
      row: current.row + rowStep,
      col: current.col + colStep,
    };
    const to = {
      row: current.row + rowStep * 2,
      col: current.col + colStep * 2,
    };

    if (
      isInsideBoard(to.row, to.col, rules.boardSize) &&
      board[captured.row][captured.col]?.player === getOpponent(piece.player) &&
      !board[to.row][to.col]
    ) {
      jumps.push({ captured, to });
    }
  }

  return jumps;
}

function getFlyingKingCaptureJumps(board, rules, piece, current) {
  const jumps = [];

  for (const [rowStep, colStep] of DIRECTIONS) {
    let row = current.row + rowStep;
    let col = current.col + colStep;
    let captured = null;

    while (isInsideBoard(row, col, rules.boardSize)) {
      const square = board[row][col];

      if (!square) {
        if (captured) {
          jumps.push({ captured, to: { row, col } });
        }
      } else if (square.player === piece.player || captured) {
        break;
      } else {
        captured = { row, col };
      }

      row += rowStep;
      col += colStep;
    }
  }

  return jumps;
}

function getMoveDirections(piece) {
  if (piece.king) {
    return DIRECTIONS;
  }

  return piece.player === PLAYERS.RED ? DIRECTIONS.slice(0, 2) : DIRECTIONS.slice(2);
}

function buildMove({ from, path, captures, piece, boardSize }) {
  const to = path[path.length - 1];

  return {
    from,
    to,
    path,
    captures,
    piece: { ...piece },
    becomesKing: shouldPromote(piece, to.row, boardSize),
  };
}

function shouldPromote(piece, row, boardSize) {
  return !piece.king && ((piece.player === PLAYERS.RED && row === 0) || (piece.player === PLAYERS.BLACK && row === boardSize - 1));
}

function filterMaximumCaptures(moves) {
  const maximum = Math.max(...moves.map((move) => move.captures.length));
  return moves.filter((move) => move.captures.length === maximum);
}

function findMatchingMove(moves, move) {
  return moves.find((candidate) => movesMatch(candidate, move));
}

function movesMatch(left, right) {
  return (
    sameSquare(left.from, right.from) &&
    sameSquare(left.to, right.to) &&
    squaresMatch(left.path, right.path) &&
    squaresMatch(left.captures, right.captures)
  );
}

function squaresMatch(left, right) {
  if (!right || left.length !== right.length) {
    return false;
  }

  return left.every((square, index) => sameSquare(square, right[index]));
}

function sameSquare(left, right) {
  return left?.row === right?.row && left?.col === right?.col;
}

function updateGameStatus(state) {
  const opponentPieces = countPieces(state.board, state.turn);
  const legalMoves = getLegalMoves(state);

  if (opponentPieces === 0 || legalMoves.length === 0) {
    return {
      ...state,
      winner: getOpponent(state.turn),
      status: "finished",
    };
  }

  return state;
}

function countPieces(board, player) {
  let count = 0;

  forEachBoardSquare(board, (piece) => {
    if (piece?.player === player) {
      count += 1;
    }
  });

  return count;
}

function forEachBoardSquare(board, callback) {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      callback(board[row][col], row, col);
    }
  }
}

function isInsideBoard(row, col, boardSize) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function cloneMove(move) {
  return {
    ...move,
    from: { ...move.from },
    to: { ...move.to },
    path: move.path.map((square) => ({ ...square })),
    captures: move.captures.map((square) => ({ ...square })),
    piece: { ...move.piece },
  };
}
