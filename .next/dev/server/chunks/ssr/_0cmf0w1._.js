module.exports = [
"[project]/src/damaCore.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MOROCCAN_DAMA_RULES",
    ()=>MOROCCAN_DAMA_RULES,
    "PLAYERS",
    ()=>PLAYERS,
    "applyMove",
    ()=>applyMove,
    "cloneState",
    ()=>cloneState,
    "createEmptyState",
    ()=>createEmptyState,
    "createInitialState",
    ()=>createInitialState,
    "createPiece",
    ()=>createPiece,
    "deserializeBoard",
    ()=>deserializeBoard,
    "getLegalMoves",
    ()=>getLegalMoves,
    "getOpponent",
    ()=>getOpponent,
    "getWinner",
    ()=>getWinner,
    "isPlayableSquare",
    ()=>isPlayableSquare,
    "serializeBoard",
    ()=>serializeBoard
]);
const PLAYERS = Object.freeze({
    RED: "red",
    BLACK: "black"
});
const MOROCCAN_DAMA_RULES = Object.freeze({
    boardSize: 8,
    mandatoryCapture: true,
    maximumCapture: true,
    menCaptureBackward: true,
    flyingKings: true
});
const DARK_SQUARE_REMAINDER = 1;
const DIRECTIONS = Object.freeze([
    [
        -1,
        -1
    ],
    [
        -1,
        1
    ],
    [
        1,
        -1
    ],
    [
        1,
        1
    ]
]);
function createInitialState(options = {}) {
    const rules = normalizeRules(options.rules);
    const board = createEmptyBoard(rules.boardSize);
    for(let row = 0; row < 3; row += 1){
        for(let col = 0; col < rules.boardSize; col += 1){
            if (isPlayableSquare(row, col)) {
                board[row][col] = createPiece(PLAYERS.BLACK);
            }
        }
    }
    for(let row = rules.boardSize - 3; row < rules.boardSize; row += 1){
        for(let col = 0; col < rules.boardSize; col += 1){
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
        history: []
    };
}
function createEmptyState(options = {}) {
    const rules = normalizeRules(options.rules);
    return {
        board: createEmptyBoard(rules.boardSize),
        turn: options.turn ?? PLAYERS.RED,
        rules,
        winner: null,
        status: "playing",
        moveNumber: 1,
        history: []
    };
}
function cloneState(state) {
    return {
        ...state,
        board: cloneBoard(state.board),
        rules: {
            ...state.rules
        },
        history: state.history.map((entry)=>({
                ...entry,
                move: cloneMove(entry.move)
            }))
    };
}
function createPiece(player, king = false) {
    return {
        player,
        king
    };
}
function getLegalMoves(state) {
    if (state.status !== "playing") {
        return [];
    }
    const captures = [];
    const quietMoves = [];
    forEachBoardSquare(state.board, (piece, row, col)=>{
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
        forEachBoardSquare(state.board, (piece, row, col)=>{
            if (piece?.player === state.turn) {
                quietMoves.push(...getQuietMovesForPiece(state, row, col));
            }
        });
    }
    return quietMoves;
}
function applyMove(state, move) {
    const legalMove = findMatchingMove(getLegalMoves(state), move);
    if (!legalMove) {
        throw new Error("Illegal move.");
    }
    const next = cloneState(state);
    const piece = next.board[legalMove.from.row][legalMove.from.col];
    next.board[legalMove.from.row][legalMove.from.col] = null;
    for (const captured of legalMove.captures){
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
            boardAfter: serializeBoard(next.board)
        }
    ];
    return updateGameStatus(next);
}
function getWinner(state) {
    return state.winner;
}
function getOpponent(player) {
    if (player === PLAYERS.RED) {
        return PLAYERS.BLACK;
    }
    if (player === PLAYERS.BLACK) {
        return PLAYERS.RED;
    }
    throw new Error(`Unknown player: ${player}`);
}
function serializeBoard(board) {
    return board.map((row)=>row.map((piece)=>{
            if (!piece) {
                return ".";
            }
            if (piece.player === PLAYERS.RED) {
                return piece.king ? "R" : "r";
            }
            return piece.king ? "B" : "b";
        }).join("")).join("/");
}
function deserializeBoard(serialized, rules = MOROCCAN_DAMA_RULES) {
    const rows = serialized.split("/");
    const boardSize = normalizeRules(rules).boardSize;
    if (rows.length !== boardSize || rows.some((row)=>row.length !== boardSize)) {
        throw new Error(`Serialized board must be ${boardSize}x${boardSize}.`);
    }
    return rows.map((row)=>[
            ...row
        ].map((cell)=>{
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
        }));
}
function isPlayableSquare(row, col) {
    return (row + col) % 2 === DARK_SQUARE_REMAINDER;
}
function normalizeRules(rules = {}) {
    return {
        ...MOROCCAN_DAMA_RULES,
        ...rules
    };
}
function createEmptyBoard(boardSize) {
    return Array.from({
        length: boardSize
    }, ()=>Array.from({
            length: boardSize
        }, ()=>null));
}
function cloneBoard(board) {
    return board.map((row)=>row.map((piece)=>piece ? {
                ...piece
            } : null));
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
    return getMoveDirections(piece).map(([rowStep, colStep])=>({
            row: row + rowStep,
            col: col + colStep
        })).filter((to)=>isInsideBoard(to.row, to.col, state.rules.boardSize) && !state.board[to.row][to.col]).map((to)=>buildMove({
            from: {
                row,
                col
            },
            path: [
                to
            ],
            captures: [],
            piece,
            boardSize: state.rules.boardSize
        }));
}
function getFlyingKingQuietMoves(state, row, col) {
    const moves = [];
    const piece = state.board[row][col];
    for (const [rowStep, colStep] of DIRECTIONS){
        let nextRow = row + rowStep;
        let nextCol = col + colStep;
        while(isInsideBoard(nextRow, nextCol, state.rules.boardSize) && !state.board[nextRow][nextCol]){
            moves.push(buildMove({
                from: {
                    row,
                    col
                },
                path: [
                    {
                        row: nextRow,
                        col: nextCol
                    }
                ],
                captures: [],
                piece,
                boardSize: state.rules.boardSize
            }));
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
        origin: {
            row,
            col
        },
        current: {
            row,
            col
        },
        path: [],
        captures: []
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
                boardSize: context.rules.boardSize
            })
        ];
    }
    for (const jump of jumps){
        const nextBoard = cloneBoard(context.board);
        nextBoard[context.current.row][context.current.col] = null;
        nextBoard[jump.captured.row][jump.captured.col] = null;
        nextBoard[jump.to.row][jump.to.col] = context.piece;
        moves.push(...exploreCaptures({
            ...context,
            board: nextBoard,
            current: jump.to,
            path: [
                ...context.path,
                jump.to
            ],
            captures: [
                ...context.captures,
                jump.captured
            ]
        }));
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
    for (const [rowStep, colStep] of directions){
        const captured = {
            row: current.row + rowStep,
            col: current.col + colStep
        };
        const to = {
            row: current.row + rowStep * 2,
            col: current.col + colStep * 2
        };
        if (isInsideBoard(to.row, to.col, rules.boardSize) && board[captured.row][captured.col]?.player === getOpponent(piece.player) && !board[to.row][to.col]) {
            jumps.push({
                captured,
                to
            });
        }
    }
    return jumps;
}
function getFlyingKingCaptureJumps(board, rules, piece, current) {
    const jumps = [];
    for (const [rowStep, colStep] of DIRECTIONS){
        let row = current.row + rowStep;
        let col = current.col + colStep;
        let captured = null;
        while(isInsideBoard(row, col, rules.boardSize)){
            const square = board[row][col];
            if (!square) {
                if (captured) {
                    jumps.push({
                        captured,
                        to: {
                            row,
                            col
                        }
                    });
                }
            } else if (square.player === piece.player || captured) {
                break;
            } else {
                captured = {
                    row,
                    col
                };
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
        piece: {
            ...piece
        },
        becomesKing: shouldPromote(piece, to.row, boardSize)
    };
}
function shouldPromote(piece, row, boardSize) {
    return !piece.king && (piece.player === PLAYERS.RED && row === 0 || piece.player === PLAYERS.BLACK && row === boardSize - 1);
}
function filterMaximumCaptures(moves) {
    const maximum = Math.max(...moves.map((move)=>move.captures.length));
    return moves.filter((move)=>move.captures.length === maximum);
}
function findMatchingMove(moves, move) {
    return moves.find((candidate)=>movesMatch(candidate, move));
}
function movesMatch(left, right) {
    return sameSquare(left.from, right.from) && sameSquare(left.to, right.to) && squaresMatch(left.path, right.path) && squaresMatch(left.captures, right.captures);
}
function squaresMatch(left, right) {
    if (!right || left.length !== right.length) {
        return false;
    }
    return left.every((square, index)=>sameSquare(square, right[index]));
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
            status: "finished"
        };
    }
    return state;
}
function countPieces(board, player) {
    let count = 0;
    forEachBoardSquare(board, (piece)=>{
        if (piece?.player === player) {
            count += 1;
        }
    });
    return count;
}
function forEachBoardSquare(board, callback) {
    for(let row = 0; row < board.length; row += 1){
        for(let col = 0; col < board[row].length; col += 1){
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
        from: {
            ...move.from
        },
        to: {
            ...move.to
        },
        path: move.path.map((square)=>({
                ...square
            })),
        captures: move.captures.map((square)=>({
                ...square
            })),
        piece: {
            ...move.piece
        }
    };
}
}),
"[project]/src/components/DamaBoard.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DamaBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/damaCore.js [app-ssr] (ecmascript)");
"use client";
;
;
;
const PLAYER_LABELS = {
    [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].RED]: "Player 1",
    [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK]: "Player 2"
};
function DamaBoard() {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createInitialState"])());
    const [gameSetup, setGameSetup] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [loadingProgress, setLoadingProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [showPieces, setShowPieces] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [animateBoardPieces, setAnimateBoardPieces] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const legalMoves = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getLegalMoves"])(state), [
        state
    ]);
    const pieceCounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>getPieceCounts(state.board), [
        state.board
    ]);
    const playerOneCapturedPieces = 12 - pieceCounts[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK];
    const playerTwoCapturedPieces = 12 - pieceCounts[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].RED];
    const selectedMoves = selected ? legalMoves.filter((move)=>sameSquare(move.from, selected)) : [];
    const isRobotTurn = gameSetup?.mode === "solo" && state.turn === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK && state.status === "playing";
    const canRobotMove = showPieces && !animateBoardPieces && isRobotTurn;
    const playerNames = gameSetup?.players ?? PLAYER_LABELS;
    const statusPlayer = state.status === "finished" ? state.winner : state.turn;
    const statusColor = statusPlayer === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].RED ? "text-[#ff382d]" : "text-[#3aa7ff]";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!gameSetup || showPieces) {
            return;
        }
        const timer = window.setTimeout(()=>{
            setShowPieces(true);
            setAnimateBoardPieces(true);
        }, 650);
        return ()=>window.clearTimeout(timer);
    }, [
        gameSetup,
        showPieces
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!animateBoardPieces) {
            return;
        }
        const timer = window.setTimeout(()=>setAnimateBoardPieces(false), 1200);
        return ()=>window.clearTimeout(timer);
    }, [
        animateBoardPieces
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isLoading) {
            return;
        }
        const timer = window.setInterval(()=>{
            setLoadingProgress((current)=>{
                const next = Math.min(current + 25, 100);
                if (next === 100) {
                    window.setTimeout(()=>setIsLoading(false), 450);
                }
                return next;
            });
        }, 450);
        return ()=>window.clearInterval(timer);
    }, [
        isLoading
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!canRobotMove || legalMoves.length === 0) {
            return;
        }
        const timer = window.setTimeout(()=>{
            setState((current)=>{
                const moves = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getLegalMoves"])(current);
                if (moves.length === 0) {
                    return current;
                }
                const captureMoves = moves.filter((move)=>move.captures.length > 0);
                const choices = captureMoves.length > 0 ? captureMoves : moves;
                const move = choices[Math.floor(Math.random() * choices.length)];
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["applyMove"])(current, move);
            });
        }, 650);
        return ()=>window.clearTimeout(timer);
    }, [
        canRobotMove,
        legalMoves
    ]);
    function handleSquareClick(row, col) {
        if (!gameSetup || !showPieces || animateBoardPieces || isRobotTurn) {
            return;
        }
        const piece = state.board[row][col];
        const landingMove = selectedMoves.find((move)=>sameSquare(move.to, {
                row,
                col
            }));
        if (landingMove) {
            setState((current)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["applyMove"])(current, landingMove));
            setSelected(null);
            return;
        }
        if (piece?.player === state.turn) {
            setSelected({
                row,
                col
            });
            return;
        }
        setSelected(null);
    }
    function resetGame() {
        setState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createInitialState"])());
        setShowPieces(false);
        setAnimateBoardPieces(false);
        setSelected(null);
    }
    function startGame(setup) {
        setGameSetup(setup);
        setState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createInitialState"])());
        setShowPieces(false);
        setAnimateBoardPieces(false);
        setSelected(null);
    }
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LoadingScreen, {
            progress: loadingProgress
        }, void 0, false, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 135,
            columnNumber: 12
        }, this);
    }
    if (!gameSetup) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(StartScreen, {
            onStart: startGame
        }, void 0, false, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 139,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-5 text-[#f7efe2] sm:px-6 lg:px-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "flex flex-col gap-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative mx-auto w-full max-w-[min(88vh,43rem)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CapturedPieces, {
                                asset: "/assets/piece-king-blue.png",
                                count: playerOneCapturedPieces,
                                position: "left"
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 147,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CapturedPieces, {
                                asset: "/assets/piece-king-red.png",
                                count: playerTwoCapturedPieces,
                                position: "right"
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 152,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "board-put-in relative aspect-square bg-contain bg-center bg-no-repeat drop-shadow-2xl",
                                style: {
                                    backgroundImage: "url('/assets/board.png')"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute grid grid-cols-8 grid-rows-8",
                                    style: {
                                        top: "14.95%",
                                        right: "15.05%",
                                        bottom: "14.95%",
                                        left: "14.95%"
                                    },
                                    children: state.board.map((row, rowIndex)=>row.map((piece, colIndex)=>{
                                            const isSelected = selected && selected.row === rowIndex && selected.col === colIndex;
                                            const isLanding = selectedMoves.some((move)=>sameSquare(move.to, {
                                                    row: rowIndex,
                                                    col: colIndex
                                                }));
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>handleSquareClick(rowIndex, colIndex),
                                                className: [
                                                    "relative flex h-full w-full items-center justify-center bg-transparent transition",
                                                    isSelected ? "ring-4 ring-inset ring-[#f7d36b]" : "",
                                                    isLanding ? "after:absolute after:z-20 after:h-4 after:w-4 after:rounded-full after:bg-[#2dd4bf] after:shadow-[0_0_0_4px_rgba(15,118,110,0.28)]" : ""
                                                ].join(" "),
                                                "aria-label": `Row ${rowIndex + 1}, column ${colIndex + 1}`,
                                                children: piece && showPieces ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Piece, {
                                                    animate: animateBoardPieces,
                                                    col: colIndex,
                                                    piece: piece,
                                                    row: rowIndex
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 188,
                                                    columnNumber: 25
                                                }, this) : null
                                            }, `${rowIndex}-${colIndex}`, false, {
                                                fileName: "[project]/src/components/DamaBoard.jsx",
                                                lineNumber: 176,
                                                columnNumber: 21
                                            }, this);
                                        }))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 161,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 157,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/DamaBoard.jsx",
                        lineNumber: 146,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 145,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                    className: "mx-auto w-full max-w-[30rem] lg:max-w-none",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sanb-put-in relative aspect-[784/573] w-full bg-contain bg-center bg-no-repeat text-[#f5f0df] drop-shadow-2xl",
                            style: {
                                backgroundImage: "url('/assets/SANB.png')"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute left-1/2 top-[-18%] z-20 flex -translate-x-1/2 gap-12",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>{
                                                setGameSetup(null);
                                                setSelected(null);
                                            },
                                            className: "h-14 w-32 bg-[url('/assets/menu_button.png')] bg-contain bg-center bg-no-repeat text-xl font-semibold text-stone-950 drop-shadow-lg transition hover:scale-105",
                                            children: "Menu"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 205,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: resetGame,
                                            className: "h-14 w-32 bg-[url('/assets/reset_button.png')] bg-contain bg-center bg-no-repeat text-xl font-semibold text-stone-950 drop-shadow-lg transition hover:scale-105",
                                            children: "Reset"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 215,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 204,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute inset-[17%_12%_19%_12%] flex flex-col justify-between px-4 py-3 text-center",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-3xl leading-none text-[#5eead4]",
                                                    children: "Score Board"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 225,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-2 text-xl leading-none text-[#f8f1d4]",
                                                    children: [
                                                        state.status === "finished" ? "Winner" : "Turn",
                                                        ":",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: statusColor,
                                                            children: playerNames[statusPlayer]
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                                            lineNumber: 228,
                                                            columnNumber: 17
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 226,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 224,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreLine, {
                                                    align: "text-center",
                                                    color: "text-[#ff382d]",
                                                    label: playerNames[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].RED],
                                                    score: playerOneCapturedPieces
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 233,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreLine, {
                                                    align: "text-center",
                                                    color: "text-[#3aa7ff]",
                                                    label: playerNames[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK],
                                                    score: playerTwoCapturedPieces
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 239,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 232,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center text-xl leading-none text-[#f8f1d4]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: "Round"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 248,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1 text-2xl text-[#5eead4]",
                                                    children: state.moveNumber
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 249,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 247,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 223,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/DamaBoard.jsx",
                            lineNumber: 200,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SocialLinks, {
                            className: "mt-5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/DamaBoard.jsx",
                            lineNumber: 253,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 199,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 144,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 143,
        columnNumber: 5
    }, this);
}
function LoadingScreen({ progress }) {
    const filledPieces = Math.floor(progress / 25);
    const pieces = [
        "/assets/piece-king-red.png",
        "/assets/piece-king-blue.png",
        "/assets/piece-king-red.png",
        "/assets/piece-king-blue.png"
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "flex min-h-screen items-center justify-center px-4 text-white",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "w-full max-w-md text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-4xl font-bold uppercase tracking-[0.14em]",
                    children: "Loading..."
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 272,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-5 p-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-4 gap-2",
                        children: pieces.map((asset, index)=>{
                            const filled = index < filledPieces;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: [
                                    "flex h-16 items-center justify-center transition",
                                    filled ? "opacity-100" : "opacity-25 grayscale"
                                ].join(" "),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: asset,
                                    alt: "",
                                    className: "h-16 w-16 object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]",
                                    draggable: "false"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 287,
                                    columnNumber: 19
                                }, this)
                            }, `${asset}-${index}`, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 280,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/DamaBoard.jsx",
                        lineNumber: 275,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 274,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-5 text-5xl font-bold leading-none",
                    children: [
                        progress,
                        "%"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 299,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 271,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 270,
        columnNumber: 5
    }, this);
}
function StartScreen({ onStart }) {
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("solo");
    const [playerOneName, setPlayerOneName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [playerTwoName, setPlayerTwoName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    function handleSubmit(event) {
        event.preventDefault();
        onStart({
            mode,
            players: {
                [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].RED]: playerOneName.trim() || "Player 1",
                [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK]: mode === "solo" ? "Robot" : playerTwoName.trim() || "Player 2"
            }
        });
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "flex min-h-screen items-center justify-center px-4 py-8 text-[#f7efe2]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-[46rem]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "sanb-put-in relative aspect-[784/573] w-full bg-contain bg-center bg-no-repeat text-center drop-shadow-2xl",
                    style: {
                        backgroundImage: "url('/assets/SANB.png')"
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-[16%_11%_15%_11%] flex flex-col justify-between px-5 py-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-lg uppercase tracking-[0.22em] text-[#2c87e9]",
                                        children: "Moroccan Dama"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 332,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "mt-1 text-5xl leading-none text-[#f8f1d4]",
                                        children: "Choose Game"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 333,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 331,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-4 text-5xl",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ModeButton, {
                                        active: mode === "solo",
                                        color: "text-[#ff382d]",
                                        onClick: ()=>setMode("solo"),
                                        children: "Solo vs Robot"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 337,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ModeButton, {
                                        active: mode === "twoPlayers",
                                        color: "text-[#3aa7ff]",
                                        onClick: ()=>setMode("twoPlayers"),
                                        children: "2 Players"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 340,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 336,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-3 text-left ",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NameInput, {
                                        label: "Your name",
                                        value: playerOneName,
                                        onChange: (event)=>setPlayerOneName(event.target.value),
                                        placeholder: "Player 1"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 346,
                                        columnNumber: 13
                                    }, this),
                                    mode === "twoPlayers" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NameInput, {
                                        label: "Player 2 name",
                                        value: playerTwoName,
                                        onChange: (event)=>setPlayerTwoName(event.target.value),
                                        placeholder: "Player 2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 353,
                                        columnNumber: 15
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 345,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "submit",
                                className: "mx-auto h-20 w-full max-w-[24rem] bg-transparent text-[3rem] leading-none text-[#2c87e9] transition hover:text-[#2c4fe9]",
                                children: "Start"
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 362,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/DamaBoard.jsx",
                        lineNumber: 330,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 325,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SocialLinks, {
                    className: "mt-5"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 370,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 324,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 323,
        columnNumber: 5
    }, this);
}
function ModeButton({ active, children, color, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: onClick,
        className: [
            "h-16 bg-transparent px-3 text-4xl leading-none transition",
            color,
            active ? "opacity-100" : "opacity-70 hover:opacity-100"
        ].join(" "),
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 378,
        columnNumber: 5
    }, this);
}
function SocialLinks({ className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `flex items-center justify-center gap-4 ${className}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: "https://github.com/anasbounaiim",
                target: "_blank",
                rel: "noreferrer",
                "aria-label": "GitHub profile",
                className: "social-piece block h-16 w-16 transition hover:scale-110",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: "/assets/piece_github.png",
                    alt: "",
                    className: "h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]",
                    draggable: "false"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 402,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 395,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: "https://www.linkedin.com/in/anas-bounaim-37450621a/",
                target: "_blank",
                rel: "noreferrer",
                "aria-label": "LinkedIn profile",
                className: "social-piece block h-16 w-16 transition hover:scale-110 [animation-delay:120ms]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: "/assets/piece_linkedin.png",
                    alt: "",
                    className: "h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]",
                    draggable: "false"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 416,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 409,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 394,
        columnNumber: 5
    }, this);
}
function NameInput({ label, value, onChange, placeholder }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: "block text-xl leading-none text-[#f8f1d4]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 430,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "relative mt-2 flex h-11 w-full items-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    value: value,
                    onChange: onChange,
                    placeholder: placeholder,
                    className: "relative z-10 h-full w-full bg-transparent px-4 text-2xl text-[#f8f1d4] outline-none placeholder:text-[#f8f1d4]/40"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 432,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 431,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 429,
        columnNumber: 5
    }, this);
}
function Piece({ animate, col, piece, row }) {
    const isPlayerTwo = piece.player === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK;
    const asset = piece.king ? isPlayerTwo ? "/assets/piece-blue.png" : "/assets/piece-red.png" : isPlayerTwo ? "/assets/piece-king-blue.png" : "/assets/piece-king-red.png";
    const restY = isPlayerTwo ? "0%" : "-12%";
    const animationDelay = `${(isPlayerTwo ? row : 7 - row) * 55 + col * 18}ms`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: asset,
        alt: "",
        className: [
            "relative z-10 h-[68%] w-[68%] object-contain drop-shadow-[0_7px_4px_rgba(0,0,0,0.3)]",
            animate ? "piece-put-in" : ""
        ].join(" "),
        style: animate ? {
            "--piece-rest-y": restY,
            animationDelay
        } : {
            transform: `translateY(${restY})`
        },
        draggable: "false"
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 456,
        columnNumber: 5
    }, this);
}
function CapturedPieces({ asset, count, position }) {
    const sideClass = position === "left" ? "-left-20 items-end" : "-right-20 items-start";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `pointer-events-none absolute top-[16%] z-30 flex max-h-[68%] w-14 flex-col gap-1 ${sideClass}`,
        children: Array.from({
            length: count
        }).map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: asset,
                alt: "",
                className: "piece-put-in h-10 w-10 object-contain drop-shadow-[0_5px_3px_rgba(0,0,0,0.45)]",
                draggable: "false"
            }, index, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 482,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 480,
        columnNumber: 5
    }, this);
}
function ScoreLine({ align, color, label, score }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `leading-none ${align}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `text-3xl ${color}`,
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 497,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-4xl text-[#f8f1d4]",
                children: score
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 498,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 496,
        columnNumber: 5
    }, this);
}
function getPieceCounts(board) {
    return board.flat().reduce((counts, piece)=>{
        if (piece) {
            counts[piece.player] += 1;
        }
        return counts;
    }, {
        [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].RED]: 0,
        [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK]: 0
    });
}
function sameSquare(left, right) {
    return left?.row === right?.row && left?.col === right?.col;
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=_0cmf0w1._.js.map