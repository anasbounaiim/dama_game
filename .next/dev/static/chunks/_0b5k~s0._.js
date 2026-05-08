(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/damaCore.js [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/DamaBoard.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DamaBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$canvas$2d$confetti$2f$dist$2f$confetti$2e$module$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/canvas-confetti/dist/confetti.module.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/damaCore.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
const PLAYER_LABELS = {
    [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED]: "Player 1",
    [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK]: "Player 2"
};
function DamaBoard() {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "DamaBoard.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createInitialState"])()
    }["DamaBoard.useState"]);
    const [gameSetup, setGameSetup] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [loadingProgress, setLoadingProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [showPieces, setShowPieces] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [animateBoardPieces, setAnimateBoardPieces] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const confettiShownRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const legalMoves = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DamaBoard.useMemo[legalMoves]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getLegalMoves"])(state)
    }["DamaBoard.useMemo[legalMoves]"], [
        state
    ]);
    const pieceCounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DamaBoard.useMemo[pieceCounts]": ()=>getPieceCounts(state.board)
    }["DamaBoard.useMemo[pieceCounts]"], [
        state.board
    ]);
    const playerOneCapturedPieces = 12 - pieceCounts[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK];
    const playerTwoCapturedPieces = 12 - pieceCounts[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED];
    const selectedMoves = selected ? legalMoves.filter((move)=>sameSquare(move.from, selected)) : [];
    const isRobotTurn = gameSetup?.mode === "solo" && state.turn === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK && state.status === "playing";
    const canRobotMove = showPieces && !animateBoardPieces && isRobotTurn;
    const playerNames = gameSetup?.players ?? PLAYER_LABELS;
    const statusPlayer = state.status === "finished" ? state.winner : state.turn;
    const statusColor = statusPlayer === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED ? "text-[#ff382d]" : "text-[#3aa7ff]";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DamaBoard.useEffect": ()=>{
            if (!gameSetup || showPieces) {
                return;
            }
            const timer = window.setTimeout({
                "DamaBoard.useEffect.timer": ()=>{
                    setShowPieces(true);
                    setAnimateBoardPieces(true);
                }
            }["DamaBoard.useEffect.timer"], 650);
            return ({
                "DamaBoard.useEffect": ()=>window.clearTimeout(timer)
            })["DamaBoard.useEffect"];
        }
    }["DamaBoard.useEffect"], [
        gameSetup,
        showPieces
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DamaBoard.useEffect": ()=>{
            if (!animateBoardPieces) {
                return;
            }
            const timer = window.setTimeout({
                "DamaBoard.useEffect.timer": ()=>setAnimateBoardPieces(false)
            }["DamaBoard.useEffect.timer"], 1200);
            return ({
                "DamaBoard.useEffect": ()=>window.clearTimeout(timer)
            })["DamaBoard.useEffect"];
        }
    }["DamaBoard.useEffect"], [
        animateBoardPieces
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DamaBoard.useEffect": ()=>{
            if (!isLoading) {
                return;
            }
            const timer = window.setInterval({
                "DamaBoard.useEffect.timer": ()=>{
                    setLoadingProgress({
                        "DamaBoard.useEffect.timer": (current)=>{
                            const next = Math.min(current + 25, 100);
                            if (next === 100) {
                                window.setTimeout({
                                    "DamaBoard.useEffect.timer": ()=>setIsLoading(false)
                                }["DamaBoard.useEffect.timer"], 450);
                            }
                            return next;
                        }
                    }["DamaBoard.useEffect.timer"]);
                }
            }["DamaBoard.useEffect.timer"], 450);
            return ({
                "DamaBoard.useEffect": ()=>window.clearInterval(timer)
            })["DamaBoard.useEffect"];
        }
    }["DamaBoard.useEffect"], [
        isLoading
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DamaBoard.useEffect": ()=>{
            if (!canRobotMove || legalMoves.length === 0) {
                return;
            }
            const timer = window.setTimeout({
                "DamaBoard.useEffect.timer": ()=>{
                    setState({
                        "DamaBoard.useEffect.timer": (current)=>{
                            const moves = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getLegalMoves"])(current);
                            if (moves.length === 0) {
                                return current;
                            }
                            const captureMoves = moves.filter({
                                "DamaBoard.useEffect.timer.captureMoves": (move)=>move.captures.length > 0
                            }["DamaBoard.useEffect.timer.captureMoves"]);
                            const choices = captureMoves.length > 0 ? captureMoves : moves;
                            const move = choices[Math.floor(Math.random() * choices.length)];
                            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyMove"])(current, move);
                        }
                    }["DamaBoard.useEffect.timer"]);
                }
            }["DamaBoard.useEffect.timer"], 650);
            return ({
                "DamaBoard.useEffect": ()=>window.clearTimeout(timer)
            })["DamaBoard.useEffect"];
        }
    }["DamaBoard.useEffect"], [
        canRobotMove,
        legalMoves
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DamaBoard.useEffect": ()=>{
            if (state.status !== "finished" || !state.winner || confettiShownRef.current) {
                return;
            }
            confettiShownRef.current = true;
            const colors = state.winner === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED ? [
                "#ff382d",
                "#f8f1d4",
                "#5eead4"
            ] : [
                "#3aa7ff",
                "#f8f1d4",
                "#5eead4"
            ];
            const duration = 3000;
            const end = Date.now() + duration;
            const timer = window.setInterval({
                "DamaBoard.useEffect.timer": ()=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$canvas$2d$confetti$2f$dist$2f$confetti$2e$module$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
                        particleCount: 45,
                        angle: 60,
                        spread: 55,
                        origin: {
                            x: 0,
                            y: 0.72
                        },
                        colors
                    });
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$canvas$2d$confetti$2f$dist$2f$confetti$2e$module$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
                        particleCount: 45,
                        angle: 120,
                        spread: 55,
                        origin: {
                            x: 1,
                            y: 0.72
                        },
                        colors
                    });
                    if (Date.now() >= end) {
                        window.clearInterval(timer);
                    }
                }
            }["DamaBoard.useEffect.timer"], 250);
            return ({
                "DamaBoard.useEffect": ()=>window.clearInterval(timer)
            })["DamaBoard.useEffect"];
        }
    }["DamaBoard.useEffect"], [
        state.status,
        state.winner
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
            setState((current)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyMove"])(current, landingMove));
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
        setState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createInitialState"])());
        setShowPieces(false);
        setAnimateBoardPieces(false);
        confettiShownRef.current = false;
        setSelected(null);
    }
    function startGame(setup) {
        setGameSetup(setup);
        setState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createInitialState"])());
        setShowPieces(false);
        setAnimateBoardPieces(false);
        confettiShownRef.current = false;
        setSelected(null);
    }
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LoadingScreen, {
            progress: loadingProgress
        }, void 0, false, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 177,
            columnNumber: 12
        }, this);
    }
    if (!gameSetup) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StartScreen, {
            onStart: startGame
        }, void 0, false, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 181,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen px-4 py-5 text-[#f7efe2] sm:px-6 lg:px-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "flex flex-col gap-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative mx-auto w-full max-w-[min(88vh,43rem)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CapturedPieces, {
                                asset: "/assets/piece-king-blue.png",
                                count: playerOneCapturedPieces,
                                position: "left"
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 189,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CapturedPieces, {
                                asset: "/assets/piece-king-red.png",
                                count: playerTwoCapturedPieces,
                                position: "right"
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 194,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "board-put-in relative aspect-square bg-contain bg-center bg-no-repeat drop-shadow-2xl",
                                style: {
                                    backgroundImage: "url('/assets/board.png')"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>handleSquareClick(rowIndex, colIndex),
                                                className: [
                                                    "relative flex h-full w-full items-center justify-center bg-transparent transition",
                                                    isSelected ? "ring-4 ring-inset ring-[#f7d36b]" : "",
                                                    isLanding ? "after:absolute after:z-20 after:h-4 after:w-4 after:rounded-full after:bg-[#2dd4bf] after:shadow-[0_0_0_4px_rgba(15,118,110,0.28)]" : ""
                                                ].join(" "),
                                                "aria-label": `Row ${rowIndex + 1}, column ${colIndex + 1}`,
                                                children: piece && showPieces ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Piece, {
                                                    animate: animateBoardPieces,
                                                    col: colIndex,
                                                    piece: piece,
                                                    row: rowIndex
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 230,
                                                    columnNumber: 25
                                                }, this) : null
                                            }, `${rowIndex}-${colIndex}`, false, {
                                                fileName: "[project]/src/components/DamaBoard.jsx",
                                                lineNumber: 218,
                                                columnNumber: 21
                                            }, this);
                                        }))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 203,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 199,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/DamaBoard.jsx",
                        lineNumber: 188,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 187,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                    className: "mx-auto w-full max-w-[30rem] lg:max-w-none",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sanb-put-in relative aspect-[784/573] w-full bg-contain bg-center bg-no-repeat text-[#f5f0df] drop-shadow-2xl",
                            style: {
                                backgroundImage: "url('/assets/SANB.png')"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute left-1/2 top-[-18%] z-20 flex -translate-x-1/2 gap-12",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>{
                                                setGameSetup(null);
                                                setSelected(null);
                                            },
                                            className: "h-14 w-32 bg-[url('/assets/menu_button.png')] bg-contain bg-center bg-no-repeat text-xl font-semibold text-stone-950 drop-shadow-lg transition hover:scale-105",
                                            children: "Menu"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 247,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: resetGame,
                                            className: "h-14 w-32 bg-[url('/assets/reset_button.png')] bg-contain bg-center bg-no-repeat text-xl font-semibold text-stone-950 drop-shadow-lg transition hover:scale-105",
                                            children: "Reset"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 257,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 246,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute inset-[17%_12%_19%_12%] flex flex-col justify-between px-4 py-3 text-center",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-3xl leading-none text-[#5eead4]",
                                                    children: "Score Board"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 267,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-2 text-xl leading-none text-[#f8f1d4]",
                                                    children: [
                                                        state.status === "finished" ? "Winner" : "Turn",
                                                        ":",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: statusColor,
                                                            children: playerNames[statusPlayer]
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                                            lineNumber: 270,
                                                            columnNumber: 17
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 268,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 266,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreLine, {
                                                    align: "text-center",
                                                    color: "text-[#ff382d]",
                                                    label: playerNames[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED],
                                                    score: playerOneCapturedPieces
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 275,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreLine, {
                                                    align: "text-center",
                                                    color: "text-[#3aa7ff]",
                                                    label: playerNames[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK],
                                                    score: playerTwoCapturedPieces
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 281,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 274,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center text-xl leading-none text-[#f8f1d4]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: "Round"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 290,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1 text-2xl text-[#5eead4]",
                                                    children: state.moveNumber
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                                    lineNumber: 291,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/DamaBoard.jsx",
                                            lineNumber: 289,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 265,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/DamaBoard.jsx",
                            lineNumber: 242,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SocialLinks, {
                            className: "mt-5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/DamaBoard.jsx",
                            lineNumber: 295,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 241,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 186,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 185,
        columnNumber: 5
    }, this);
}
_s(DamaBoard, "AhTrmlek9Z4dVrQMc7/akQnrjIE=");
_c = DamaBoard;
function LoadingScreen({ progress }) {
    const filledPieces = Math.floor(progress / 25);
    const pieces = [
        "/assets/piece-king-red.png",
        "/assets/piece-king-blue.png",
        "/assets/piece-king-red.png",
        "/assets/piece-king-blue.png"
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "flex min-h-screen items-center justify-center px-4 text-white",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "w-full max-w-md text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-4xl font-bold uppercase tracking-[0.14em]",
                    children: "Loading..."
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 314,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-5 p-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-4 gap-2",
                        children: pieces.map((asset, index)=>{
                            const filled = index < filledPieces;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: [
                                    "flex h-16 items-center justify-center transition",
                                    filled ? "opacity-100" : "opacity-25 grayscale"
                                ].join(" "),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: asset,
                                    alt: "",
                                    className: "h-16 w-16 object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]",
                                    draggable: "false"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/DamaBoard.jsx",
                                    lineNumber: 329,
                                    columnNumber: 19
                                }, this)
                            }, `${asset}-${index}`, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 322,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/DamaBoard.jsx",
                        lineNumber: 317,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 316,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-5 text-5xl font-bold leading-none",
                    children: [
                        progress,
                        "%"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 341,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 313,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 312,
        columnNumber: 5
    }, this);
}
_c1 = LoadingScreen;
function StartScreen({ onStart }) {
    _s1();
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("solo");
    const [playerOneName, setPlayerOneName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [playerTwoName, setPlayerTwoName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    function handleSubmit(event) {
        event.preventDefault();
        onStart({
            mode,
            players: {
                [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED]: playerOneName.trim() || "Player 1",
                [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK]: mode === "solo" ? "Robot" : playerTwoName.trim() || "Player 2"
            }
        });
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "flex min-h-screen items-center justify-center px-4 py-8 text-[#f7efe2]",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-full max-w-[46rem]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "sanb-put-in relative aspect-[784/573] w-full bg-contain bg-center bg-no-repeat text-center drop-shadow-2xl",
                    style: {
                        backgroundImage: "url('/assets/SANB.png')"
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-[16%_11%_15%_11%] flex flex-col justify-between px-5 py-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-lg uppercase tracking-[0.22em] text-[#2c87e9]",
                                        children: "Moroccan Dama"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 374,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "mt-1 text-5xl leading-none text-[#f8f1d4]",
                                        children: "Choose Game"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 375,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 373,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-4 text-5xl",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ModeButton, {
                                        active: mode === "solo",
                                        color: "text-[#ff382d]",
                                        onClick: ()=>setMode("solo"),
                                        children: "Solo vs Robot"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 379,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ModeButton, {
                                        active: mode === "twoPlayers",
                                        color: "text-[#3aa7ff]",
                                        onClick: ()=>setMode("twoPlayers"),
                                        children: "2 Players"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 382,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 378,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-3 text-left ",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NameInput, {
                                        label: "Your name",
                                        value: playerOneName,
                                        onChange: (event)=>setPlayerOneName(event.target.value),
                                        placeholder: "Player 1"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 388,
                                        columnNumber: 13
                                    }, this),
                                    mode === "twoPlayers" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NameInput, {
                                        label: "Player 2 name",
                                        value: playerTwoName,
                                        onChange: (event)=>setPlayerTwoName(event.target.value),
                                        placeholder: "Player 2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/DamaBoard.jsx",
                                        lineNumber: 395,
                                        columnNumber: 15
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 387,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "submit",
                                className: "mx-auto h-20 w-full max-w-[24rem] bg-transparent text-[3rem] leading-none text-[#2c87e9] transition hover:text-[#2c4fe9]",
                                children: "Start"
                            }, void 0, false, {
                                fileName: "[project]/src/components/DamaBoard.jsx",
                                lineNumber: 404,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/DamaBoard.jsx",
                        lineNumber: 372,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 367,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SocialLinks, {
                    className: "mt-5"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 412,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/DamaBoard.jsx",
            lineNumber: 366,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 365,
        columnNumber: 5
    }, this);
}
_s1(StartScreen, "qjSfjY/4AJB+iDYGDb2WD0ZPmSY=");
_c2 = StartScreen;
function ModeButton({ active, children, color, onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
        lineNumber: 420,
        columnNumber: 5
    }, this);
}
_c3 = ModeButton;
function SocialLinks({ className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `flex items-center justify-center gap-4 ${className}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: "https://github.com/anasbounaiim",
                target: "_blank",
                rel: "noreferrer",
                "aria-label": "GitHub profile",
                className: "social-piece block h-16 w-16 transition hover:scale-110",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: "/assets/piece_github.png",
                    alt: "",
                    className: "h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]",
                    draggable: "false"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 444,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 437,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: "https://www.linkedin.com/in/anas-bounaim-37450621a/",
                target: "_blank",
                rel: "noreferrer",
                "aria-label": "LinkedIn profile",
                className: "social-piece block h-16 w-16 transition hover:scale-110 [animation-delay:120ms]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                    src: "/assets/piece_linkedin.png",
                    alt: "",
                    className: "h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]",
                    draggable: "false"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 458,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 451,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 436,
        columnNumber: 5
    }, this);
}
_c4 = SocialLinks;
function NameInput({ label, value, onChange, placeholder }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: "block text-xl leading-none text-[#f8f1d4]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 472,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "relative mt-2 flex h-11 w-full items-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    value: value,
                    onChange: onChange,
                    placeholder: placeholder,
                    className: "relative z-10 h-full w-full bg-transparent px-4 text-2xl text-[#f8f1d4] outline-none placeholder:text-[#f8f1d4]/40"
                }, void 0, false, {
                    fileName: "[project]/src/components/DamaBoard.jsx",
                    lineNumber: 474,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 473,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 471,
        columnNumber: 5
    }, this);
}
_c5 = NameInput;
function Piece({ animate, col, piece, row }) {
    const isPlayerTwo = piece.player === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK;
    const asset = piece.king ? isPlayerTwo ? "/assets/piece-blue.png" : "/assets/piece-red.png" : isPlayerTwo ? "/assets/piece-king-blue.png" : "/assets/piece-king-red.png";
    const restY = isPlayerTwo ? "0%" : "-12%";
    const animationDelay = `${(isPlayerTwo ? row : 7 - row) * 55 + col * 18}ms`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
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
        lineNumber: 498,
        columnNumber: 5
    }, this);
}
_c6 = Piece;
function CapturedPieces({ asset, count, position }) {
    const sideClass = position === "left" ? "-left-20 items-end" : "-right-20 items-start";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `pointer-events-none absolute top-[16%] z-30 flex max-h-[68%] w-14 flex-col gap-1 ${sideClass}`,
        children: Array.from({
            length: count
        }).map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: asset,
                alt: "",
                className: "piece-put-in h-10 w-10 object-contain drop-shadow-[0_5px_3px_rgba(0,0,0,0.45)]",
                draggable: "false"
            }, index, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 524,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 522,
        columnNumber: 5
    }, this);
}
_c7 = CapturedPieces;
function ScoreLine({ align, color, label, score }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `leading-none ${align}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `text-3xl ${color}`,
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 539,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-4xl text-[#f8f1d4]",
                children: score
            }, void 0, false, {
                fileName: "[project]/src/components/DamaBoard.jsx",
                lineNumber: 540,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/DamaBoard.jsx",
        lineNumber: 538,
        columnNumber: 5
    }, this);
}
_c8 = ScoreLine;
function getPieceCounts(board) {
    return board.flat().reduce((counts, piece)=>{
        if (piece) {
            counts[piece.player] += 1;
        }
        return counts;
    }, {
        [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].RED]: 0,
        [__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$damaCore$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYERS"].BLACK]: 0
    });
}
function sameSquare(left, right) {
    return left?.row === right?.row && left?.col === right?.col;
}
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8;
__turbopack_context__.k.register(_c, "DamaBoard");
__turbopack_context__.k.register(_c1, "LoadingScreen");
__turbopack_context__.k.register(_c2, "StartScreen");
__turbopack_context__.k.register(_c3, "ModeButton");
__turbopack_context__.k.register(_c4, "SocialLinks");
__turbopack_context__.k.register(_c5, "NameInput");
__turbopack_context__.k.register(_c6, "Piece");
__turbopack_context__.k.register(_c7, "CapturedPieces");
__turbopack_context__.k.register(_c8, "ScoreLine");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/node_modules/canvas-confetti/dist/confetti.module.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "create",
    ()=>create,
    "default",
    ()=>__TURBOPACK__default__export__
]);
// canvas-confetti v1.9.4 built on 2025-10-25T05:14:56.640Z
var module = {};
// source content
/* globals Map */ (function main(global, module, isWorker, workerSize) {
    var canUseWorker = !!(global.Worker && global.Blob && global.Promise && global.OffscreenCanvas && global.OffscreenCanvasRenderingContext2D && global.HTMLCanvasElement && global.HTMLCanvasElement.prototype.transferControlToOffscreen && global.URL && global.URL.createObjectURL);
    var canUsePaths = typeof Path2D === 'function' && typeof DOMMatrix === 'function';
    var canDrawBitmap = function() {
        // this mostly supports ssr
        if (!global.OffscreenCanvas) {
            return false;
        }
        try {
            var canvas = new OffscreenCanvas(1, 1);
            var ctx = canvas.getContext('2d');
            ctx.fillRect(0, 0, 1, 1);
            var bitmap = canvas.transferToImageBitmap();
            ctx.createPattern(bitmap, 'no-repeat');
        } catch (e) {
            return false;
        }
        return true;
    }();
    function noop() {}
    // create a promise if it exists, otherwise, just
    // call the function directly
    function promise(func) {
        var ModulePromise = module.exports.Promise;
        var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;
        if (typeof Prom === 'function') {
            return new Prom(func);
        }
        func(noop, noop);
        return null;
    }
    var bitmapMapper = function(skipTransform, map) {
        // see https://github.com/catdad/canvas-confetti/issues/209
        // creating canvases is actually pretty expensive, so we should create a
        // 1:1 map for bitmap:canvas, so that we can animate the confetti in
        // a performant manner, but also not store them forever so that we don't
        // have a memory leak
        return {
            transform: function(bitmap) {
                if (skipTransform) {
                    return bitmap;
                }
                if (map.has(bitmap)) {
                    return map.get(bitmap);
                }
                var canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
                map.set(bitmap, canvas);
                return canvas;
            },
            clear: function() {
                map.clear();
            }
        };
    }(canDrawBitmap, new Map());
    var raf = function() {
        var TIME = Math.floor(1000 / 60);
        var frame, cancel;
        var frames = {};
        var lastFrameTime = 0;
        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
            frame = function(cb) {
                var id = Math.random();
                frames[id] = requestAnimationFrame(function onFrame(time) {
                    if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
                        lastFrameTime = time;
                        delete frames[id];
                        cb();
                    } else {
                        frames[id] = requestAnimationFrame(onFrame);
                    }
                });
                return id;
            };
            cancel = function(id) {
                if (frames[id]) {
                    cancelAnimationFrame(frames[id]);
                }
            };
        } else {
            frame = function(cb) {
                return setTimeout(cb, TIME);
            };
            cancel = function(timer) {
                return clearTimeout(timer);
            };
        }
        return {
            frame: frame,
            cancel: cancel
        };
    }();
    var getWorker = function() {
        var worker;
        var prom;
        var resolves = {};
        function decorate(worker) {
            function execute(options, callback) {
                worker.postMessage({
                    options: options || {},
                    callback: callback
                });
            }
            worker.init = function initWorker(canvas) {
                var offscreen = canvas.transferControlToOffscreen();
                worker.postMessage({
                    canvas: offscreen
                }, [
                    offscreen
                ]);
            };
            worker.fire = function fireWorker(options, size, done) {
                if (prom) {
                    execute(options, null);
                    return prom;
                }
                var id = Math.random().toString(36).slice(2);
                prom = promise(function(resolve) {
                    function workerDone(msg) {
                        if (msg.data.callback !== id) {
                            return;
                        }
                        delete resolves[id];
                        worker.removeEventListener('message', workerDone);
                        prom = null;
                        bitmapMapper.clear();
                        done();
                        resolve();
                    }
                    worker.addEventListener('message', workerDone);
                    execute(options, id);
                    resolves[id] = workerDone.bind(null, {
                        data: {
                            callback: id
                        }
                    });
                });
                return prom;
            };
            worker.reset = function resetWorker() {
                worker.postMessage({
                    reset: true
                });
                for(var id in resolves){
                    resolves[id]();
                    delete resolves[id];
                }
            };
        }
        return function() {
            if (worker) {
                return worker;
            }
            if (!isWorker && canUseWorker) {
                var code = [
                    'var CONFETTI, SIZE = {}, module = {};',
                    '(' + main.toString() + ')(this, module, true, SIZE);',
                    'onmessage = function(msg) {',
                    '  if (msg.data.options) {',
                    '    CONFETTI(msg.data.options).then(function () {',
                    '      if (msg.data.callback) {',
                    '        postMessage({ callback: msg.data.callback });',
                    '      }',
                    '    });',
                    '  } else if (msg.data.reset) {',
                    '    CONFETTI && CONFETTI.reset();',
                    '  } else if (msg.data.resize) {',
                    '    SIZE.width = msg.data.resize.width;',
                    '    SIZE.height = msg.data.resize.height;',
                    '  } else if (msg.data.canvas) {',
                    '    SIZE.width = msg.data.canvas.width;',
                    '    SIZE.height = msg.data.canvas.height;',
                    '    CONFETTI = module.exports.create(msg.data.canvas);',
                    '  }',
                    '}'
                ].join('\n');
                try {
                    worker = new Worker(URL.createObjectURL(new Blob([
                        code
                    ])));
                } catch (e) {
                    // eslint-disable-next-line no-console
                    typeof console !== 'undefined' && typeof console.warn === 'function' ? console.warn('🎊 Could not load worker', e) : null;
                    return null;
                }
                decorate(worker);
            }
            return worker;
        };
    }();
    var defaults = {
        particleCount: 50,
        angle: 90,
        spread: 45,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1,
        drift: 0,
        ticks: 200,
        x: 0.5,
        y: 0.5,
        shapes: [
            'square',
            'circle'
        ],
        zIndex: 100,
        colors: [
            '#26ccff',
            '#a25afd',
            '#ff5e7e',
            '#88ff5a',
            '#fcff42',
            '#ffa62d',
            '#ff36ff'
        ],
        // probably should be true, but back-compat
        disableForReducedMotion: false,
        scalar: 1
    };
    function convert(val, transform) {
        return transform ? transform(val) : val;
    }
    function isOk(val) {
        return !(val === null || val === undefined);
    }
    function prop(options, name, transform) {
        return convert(options && isOk(options[name]) ? options[name] : defaults[name], transform);
    }
    function onlyPositiveInt(number) {
        return number < 0 ? 0 : Math.floor(number);
    }
    function randomInt(min, max) {
        // [min, max)
        return Math.floor(Math.random() * (max - min)) + min;
    }
    function toDecimal(str) {
        return parseInt(str, 16);
    }
    function colorsToRgb(colors) {
        return colors.map(hexToRgb);
    }
    function hexToRgb(str) {
        var val = String(str).replace(/[^0-9a-f]/gi, '');
        if (val.length < 6) {
            val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
        }
        return {
            r: toDecimal(val.substring(0, 2)),
            g: toDecimal(val.substring(2, 4)),
            b: toDecimal(val.substring(4, 6))
        };
    }
    function getOrigin(options) {
        var origin = prop(options, 'origin', Object);
        origin.x = prop(origin, 'x', Number);
        origin.y = prop(origin, 'y', Number);
        return origin;
    }
    function setCanvasWindowSize(canvas) {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
    }
    function setCanvasRectSize(canvas) {
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    function getCanvas(zIndex) {
        var canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = zIndex;
        return canvas;
    }
    function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.scale(radiusX, radiusY);
        context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
        context.restore();
    }
    function randomPhysics(opts) {
        var radAngle = opts.angle * (Math.PI / 180);
        var radSpread = opts.spread * (Math.PI / 180);
        return {
            x: opts.x,
            y: opts.y,
            wobble: Math.random() * 10,
            wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
            velocity: opts.startVelocity * 0.5 + Math.random() * opts.startVelocity,
            angle2D: -radAngle + (0.5 * radSpread - Math.random() * radSpread),
            tiltAngle: (Math.random() * (0.75 - 0.25) + 0.25) * Math.PI,
            color: opts.color,
            shape: opts.shape,
            tick: 0,
            totalTicks: opts.ticks,
            decay: opts.decay,
            drift: opts.drift,
            random: Math.random() + 2,
            tiltSin: 0,
            tiltCos: 0,
            wobbleX: 0,
            wobbleY: 0,
            gravity: opts.gravity * 3,
            ovalScalar: 0.6,
            scalar: opts.scalar,
            flat: opts.flat
        };
    }
    function updateFetti(context, fetti) {
        fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift;
        fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
        fetti.velocity *= fetti.decay;
        if (fetti.flat) {
            fetti.wobble = 0;
            fetti.wobbleX = fetti.x + 10 * fetti.scalar;
            fetti.wobbleY = fetti.y + 10 * fetti.scalar;
            fetti.tiltSin = 0;
            fetti.tiltCos = 0;
            fetti.random = 1;
        } else {
            fetti.wobble += fetti.wobbleSpeed;
            fetti.wobbleX = fetti.x + 10 * fetti.scalar * Math.cos(fetti.wobble);
            fetti.wobbleY = fetti.y + 10 * fetti.scalar * Math.sin(fetti.wobble);
            fetti.tiltAngle += 0.1;
            fetti.tiltSin = Math.sin(fetti.tiltAngle);
            fetti.tiltCos = Math.cos(fetti.tiltAngle);
            fetti.random = Math.random() + 2;
        }
        var progress = fetti.tick++ / fetti.totalTicks;
        var x1 = fetti.x + fetti.random * fetti.tiltCos;
        var y1 = fetti.y + fetti.random * fetti.tiltSin;
        var x2 = fetti.wobbleX + fetti.random * fetti.tiltCos;
        var y2 = fetti.wobbleY + fetti.random * fetti.tiltSin;
        context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';
        context.beginPath();
        if (canUsePaths && fetti.shape.type === 'path' && typeof fetti.shape.path === 'string' && Array.isArray(fetti.shape.matrix)) {
            context.fill(transformPath2D(fetti.shape.path, fetti.shape.matrix, fetti.x, fetti.y, Math.abs(x2 - x1) * 0.1, Math.abs(y2 - y1) * 0.1, Math.PI / 10 * fetti.wobble));
        } else if (fetti.shape.type === 'bitmap') {
            var rotation = Math.PI / 10 * fetti.wobble;
            var scaleX = Math.abs(x2 - x1) * 0.1;
            var scaleY = Math.abs(y2 - y1) * 0.1;
            var width = fetti.shape.bitmap.width * fetti.scalar;
            var height = fetti.shape.bitmap.height * fetti.scalar;
            var matrix = new DOMMatrix([
                Math.cos(rotation) * scaleX,
                Math.sin(rotation) * scaleX,
                -Math.sin(rotation) * scaleY,
                Math.cos(rotation) * scaleY,
                fetti.x,
                fetti.y
            ]);
            // apply the transform matrix from the confetti shape
            matrix.multiplySelf(new DOMMatrix(fetti.shape.matrix));
            var pattern = context.createPattern(bitmapMapper.transform(fetti.shape.bitmap), 'no-repeat');
            pattern.setTransform(matrix);
            context.globalAlpha = 1 - progress;
            context.fillStyle = pattern;
            context.fillRect(fetti.x - width / 2, fetti.y - height / 2, width, height);
            context.globalAlpha = 1;
        } else if (fetti.shape === 'circle') {
            context.ellipse ? context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) : ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
        } else if (fetti.shape === 'star') {
            var rot = Math.PI / 2 * 3;
            var innerRadius = 4 * fetti.scalar;
            var outerRadius = 8 * fetti.scalar;
            var x = fetti.x;
            var y = fetti.y;
            var spikes = 5;
            var step = Math.PI / spikes;
            while(spikes--){
                x = fetti.x + Math.cos(rot) * outerRadius;
                y = fetti.y + Math.sin(rot) * outerRadius;
                context.lineTo(x, y);
                rot += step;
                x = fetti.x + Math.cos(rot) * innerRadius;
                y = fetti.y + Math.sin(rot) * innerRadius;
                context.lineTo(x, y);
                rot += step;
            }
        } else {
            context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
            context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
            context.lineTo(Math.floor(x2), Math.floor(y2));
            context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
        }
        context.closePath();
        context.fill();
        return fetti.tick < fetti.totalTicks;
    }
    function animate(canvas, fettis, resizer, size, done) {
        var animatingFettis = fettis.slice();
        var context = canvas.getContext('2d');
        var animationFrame;
        var destroy;
        var prom = promise(function(resolve) {
            function onDone() {
                animationFrame = destroy = null;
                context.clearRect(0, 0, size.width, size.height);
                bitmapMapper.clear();
                done();
                resolve();
            }
            function update() {
                if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
                    size.width = canvas.width = workerSize.width;
                    size.height = canvas.height = workerSize.height;
                }
                if (!size.width && !size.height) {
                    resizer(canvas);
                    size.width = canvas.width;
                    size.height = canvas.height;
                }
                context.clearRect(0, 0, size.width, size.height);
                animatingFettis = animatingFettis.filter(function(fetti) {
                    return updateFetti(context, fetti);
                });
                if (animatingFettis.length) {
                    animationFrame = raf.frame(update);
                } else {
                    onDone();
                }
            }
            animationFrame = raf.frame(update);
            destroy = onDone;
        });
        return {
            addFettis: function(fettis) {
                animatingFettis = animatingFettis.concat(fettis);
                return prom;
            },
            canvas: canvas,
            promise: prom,
            reset: function() {
                if (animationFrame) {
                    raf.cancel(animationFrame);
                }
                if (destroy) {
                    destroy();
                }
            }
        };
    }
    function confettiCannon(canvas, globalOpts) {
        var isLibCanvas = !canvas;
        var allowResize = !!prop(globalOpts || {}, 'resize');
        var hasResizeEventRegistered = false;
        var globalDisableForReducedMotion = prop(globalOpts, 'disableForReducedMotion', Boolean);
        var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker');
        var worker = shouldUseWorker ? getWorker() : null;
        var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
        var initialized = canvas && worker ? !!canvas.__confetti_initialized : false;
        var preferLessMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion)').matches;
        var animationObj;
        function fireLocal(options, size, done) {
            var particleCount = prop(options, 'particleCount', onlyPositiveInt);
            var angle = prop(options, 'angle', Number);
            var spread = prop(options, 'spread', Number);
            var startVelocity = prop(options, 'startVelocity', Number);
            var decay = prop(options, 'decay', Number);
            var gravity = prop(options, 'gravity', Number);
            var drift = prop(options, 'drift', Number);
            var colors = prop(options, 'colors', colorsToRgb);
            var ticks = prop(options, 'ticks', Number);
            var shapes = prop(options, 'shapes');
            var scalar = prop(options, 'scalar');
            var flat = !!prop(options, 'flat');
            var origin = getOrigin(options);
            var temp = particleCount;
            var fettis = [];
            var startX = canvas.width * origin.x;
            var startY = canvas.height * origin.y;
            while(temp--){
                fettis.push(randomPhysics({
                    x: startX,
                    y: startY,
                    angle: angle,
                    spread: spread,
                    startVelocity: startVelocity,
                    color: colors[temp % colors.length],
                    shape: shapes[randomInt(0, shapes.length)],
                    ticks: ticks,
                    decay: decay,
                    gravity: gravity,
                    drift: drift,
                    scalar: scalar,
                    flat: flat
                }));
            }
            // if we have a previous canvas already animating,
            // add to it
            if (animationObj) {
                return animationObj.addFettis(fettis);
            }
            animationObj = animate(canvas, fettis, resizer, size, done);
            return animationObj.promise;
        }
        function fire(options) {
            var disableForReducedMotion = globalDisableForReducedMotion || prop(options, 'disableForReducedMotion', Boolean);
            var zIndex = prop(options, 'zIndex', Number);
            if (disableForReducedMotion && preferLessMotion) {
                return promise(function(resolve) {
                    resolve();
                });
            }
            if (isLibCanvas && animationObj) {
                // use existing canvas from in-progress animation
                canvas = animationObj.canvas;
            } else if (isLibCanvas && !canvas) {
                // create and initialize a new canvas
                canvas = getCanvas(zIndex);
                document.body.appendChild(canvas);
            }
            if (allowResize && !initialized) {
                // initialize the size of a user-supplied canvas
                resizer(canvas);
            }
            var size = {
                width: canvas.width,
                height: canvas.height
            };
            if (worker && !initialized) {
                worker.init(canvas);
            }
            initialized = true;
            if (worker) {
                canvas.__confetti_initialized = true;
            }
            function onResize() {
                if (worker) {
                    // TODO this really shouldn't be immediate, because it is expensive
                    var obj = {
                        getBoundingClientRect: function() {
                            if (!isLibCanvas) {
                                return canvas.getBoundingClientRect();
                            }
                        }
                    };
                    resizer(obj);
                    worker.postMessage({
                        resize: {
                            width: obj.width,
                            height: obj.height
                        }
                    });
                    return;
                }
                // don't actually query the size here, since this
                // can execute frequently and rapidly
                size.width = size.height = null;
            }
            function done() {
                animationObj = null;
                if (allowResize) {
                    hasResizeEventRegistered = false;
                    global.removeEventListener('resize', onResize);
                }
                if (isLibCanvas && canvas) {
                    if (document.body.contains(canvas)) {
                        document.body.removeChild(canvas);
                    }
                    canvas = null;
                    initialized = false;
                }
            }
            if (allowResize && !hasResizeEventRegistered) {
                hasResizeEventRegistered = true;
                global.addEventListener('resize', onResize, false);
            }
            if (worker) {
                return worker.fire(options, size, done);
            }
            return fireLocal(options, size, done);
        }
        fire.reset = function() {
            if (worker) {
                worker.reset();
            }
            if (animationObj) {
                animationObj.reset();
            }
        };
        return fire;
    }
    // Make default export lazy to defer worker creation until called.
    var defaultFire;
    function getDefaultFire() {
        if (!defaultFire) {
            defaultFire = confettiCannon(null, {
                useWorker: true,
                resize: true
            });
        }
        return defaultFire;
    }
    function transformPath2D(pathString, pathMatrix, x, y, scaleX, scaleY, rotation) {
        var path2d = new Path2D(pathString);
        var t1 = new Path2D();
        t1.addPath(path2d, new DOMMatrix(pathMatrix));
        var t2 = new Path2D();
        // see https://developer.mozilla.org/en-US/docs/Web/API/DOMMatrix/DOMMatrix
        t2.addPath(t1, new DOMMatrix([
            Math.cos(rotation) * scaleX,
            Math.sin(rotation) * scaleX,
            -Math.sin(rotation) * scaleY,
            Math.cos(rotation) * scaleY,
            x,
            y
        ]));
        return t2;
    }
    function shapeFromPath(pathData) {
        if (!canUsePaths) {
            throw new Error('path confetti are not supported in this browser');
        }
        var path, matrix;
        if (typeof pathData === 'string') {
            path = pathData;
        } else {
            path = pathData.path;
            matrix = pathData.matrix;
        }
        var path2d = new Path2D(path);
        var tempCanvas = document.createElement('canvas');
        var tempCtx = tempCanvas.getContext('2d');
        if (!matrix) {
            // attempt to figure out the width of the path, up to 1000x1000
            var maxSize = 1000;
            var minX = maxSize;
            var minY = maxSize;
            var maxX = 0;
            var maxY = 0;
            var width, height;
            // do some line skipping... this is faster than checking
            // every pixel and will be mostly still correct
            for(var x = 0; x < maxSize; x += 2){
                for(var y = 0; y < maxSize; y += 2){
                    if (tempCtx.isPointInPath(path2d, x, y, 'nonzero')) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            width = maxX - minX;
            height = maxY - minY;
            var maxDesiredSize = 10;
            var scale = Math.min(maxDesiredSize / width, maxDesiredSize / height);
            matrix = [
                scale,
                0,
                0,
                scale,
                -Math.round(width / 2 + minX) * scale,
                -Math.round(height / 2 + minY) * scale
            ];
        }
        return {
            type: 'path',
            path: path,
            matrix: matrix
        };
    }
    function shapeFromText(textData) {
        var text, scalar = 1, color = '#000000', // see https://nolanlawson.com/2022/04/08/the-struggle-of-using-native-emoji-on-the-web/
        fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';
        if (typeof textData === 'string') {
            text = textData;
        } else {
            text = textData.text;
            scalar = 'scalar' in textData ? textData.scalar : scalar;
            fontFamily = 'fontFamily' in textData ? textData.fontFamily : fontFamily;
            color = 'color' in textData ? textData.color : color;
        }
        // all other confetti are 10 pixels,
        // so this pixel size is the de-facto 100% scale confetti
        var fontSize = 10 * scalar;
        var font = '' + fontSize + 'px ' + fontFamily;
        var canvas = new OffscreenCanvas(fontSize, fontSize);
        var ctx = canvas.getContext('2d');
        ctx.font = font;
        var size = ctx.measureText(text);
        var width = Math.ceil(size.actualBoundingBoxRight + size.actualBoundingBoxLeft);
        var height = Math.ceil(size.actualBoundingBoxAscent + size.actualBoundingBoxDescent);
        var padding = 2;
        var x = size.actualBoundingBoxLeft + padding;
        var y = size.actualBoundingBoxAscent + padding;
        width += padding + padding;
        height += padding + padding;
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d');
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        var scale = 1 / scalar;
        return {
            type: 'bitmap',
            // TODO these probably need to be transfered for workers
            bitmap: canvas.transferToImageBitmap(),
            matrix: [
                scale,
                0,
                0,
                scale,
                -width * scale / 2,
                -height * scale / 2
            ]
        };
    }
    module.exports = function() {
        return getDefaultFire().apply(this, arguments);
    };
    module.exports.reset = function() {
        getDefaultFire().reset();
    };
    module.exports.create = confettiCannon;
    module.exports.shapeFromPath = shapeFromPath;
    module.exports.shapeFromText = shapeFromText;
})(function() {
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof self !== 'undefined') {
        return self;
    }
    return this || {};
}(), module, false);
const __TURBOPACK__default__export__ = module.exports;
var create = module.exports.create;
}),
]);

//# sourceMappingURL=_0b5k~s0._.js.map