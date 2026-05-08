"use client";

import confetti from "canvas-confetti";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyMove, createInitialState, getLegalMoves, PLAYERS } from "@/damaCore";

const PLAYER_LABELS = {
  [PLAYERS.RED]: "Player 1",
  [PLAYERS.BLACK]: "Player 2",
};

export default function DamaBoard() {
  const [state, setState] = useState(() => createInitialState());
  const [gameSetup, setGameSetup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showPieces, setShowPieces] = useState(false);
  const [animateBoardPieces, setAnimateBoardPieces] = useState(false);
  const [selected, setSelected] = useState(null);
  const confettiShownRef = useRef(false);
  const legalMoves = useMemo(() => getLegalMoves(state), [state]);
  const pieceCounts = useMemo(() => getPieceCounts(state.board), [state.board]);
  const playerOneCapturedPieces = 12 - pieceCounts[PLAYERS.BLACK];
  const playerTwoCapturedPieces = 12 - pieceCounts[PLAYERS.RED];
  const selectedMoves = selected ? legalMoves.filter((move) => sameSquare(move.from, selected)) : [];
  const isRobotTurn = gameSetup?.mode === "solo" && state.turn === PLAYERS.BLACK && state.status === "playing";
  const canRobotMove = showPieces && !animateBoardPieces && isRobotTurn;
  const playerNames = gameSetup?.players ?? PLAYER_LABELS;
  const statusPlayer = state.status === "finished" ? state.winner : state.turn;
  const statusColor = statusPlayer === PLAYERS.RED ? "text-[#ff382d]" : "text-[#3aa7ff]";

  useEffect(() => {
    if (!gameSetup || showPieces) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowPieces(true);
      setAnimateBoardPieces(true);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [gameSetup, showPieces]);

  useEffect(() => {
    if (!animateBoardPieces) {
      return;
    }

    const timer = window.setTimeout(() => setAnimateBoardPieces(false), 1200);

    return () => window.clearTimeout(timer);
  }, [animateBoardPieces]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingProgress((current) => {
        const next = Math.min(current + 25, 100);

        if (next === 100) {
          window.setTimeout(() => setIsLoading(false), 450);
        }

        return next;
      });
    }, 450);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!canRobotMove || legalMoves.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState((current) => {
        const moves = getLegalMoves(current);

        if (moves.length === 0) {
          return current;
        }

        const captureMoves = moves.filter((move) => move.captures.length > 0);
        const choices = captureMoves.length > 0 ? captureMoves : moves;
        const move = choices[Math.floor(Math.random() * choices.length)];

        return applyMove(current, move);
      });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [canRobotMove, legalMoves]);

  useEffect(() => {
    if (state.status !== "finished" || !state.winner || confettiShownRef.current) {
      return;
    }

    confettiShownRef.current = true;

    const colors = state.winner === PLAYERS.RED
      ? ["#ff382d", "#f8f1d4", "#5eead4"]
      : ["#3aa7ff", "#f8f1d4", "#5eead4"];

    const duration = 3000;
    const end = Date.now() + duration;

    const timer = window.setInterval(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.72 },
        colors,
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.72 },
        colors,
      });

      if (Date.now() >= end) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [state.status, state.winner]);

  function handleSquareClick(row, col) {
    if (!gameSetup || !showPieces || animateBoardPieces || isRobotTurn) {
      return;
    }

    const piece = state.board[row][col];
    const landingMove = selectedMoves.find((move) => sameSquare(move.to, { row, col }));

    if (landingMove) {
      setState((current) => applyMove(current, landingMove));
      setSelected(null);
      return;
    }

    if (piece?.player === state.turn) {
      setSelected({ row, col });
      return;
    }

    setSelected(null);
  }

  function resetGame() {
    setState(createInitialState());
    setShowPieces(false);
    setAnimateBoardPieces(false);
    confettiShownRef.current = false;
    setSelected(null);
  }

  function startGame(setup) {
    setGameSetup(setup);
    setState(createInitialState());
    setShowPieces(false);
    setAnimateBoardPieces(false);
    confettiShownRef.current = false;
    setSelected(null);
  }

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  if (!gameSetup) {
    return <StartScreen onStart={startGame} />;
  }

  return (
    <main className="min-h-screen px-4 py-5 text-[#f7efe2] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
        <section className="flex flex-col gap-4">
          <div className="relative mx-auto w-full max-w-[min(88vh,43rem)]">
            <CapturedPieces
              asset="/assets/piece-king-blue.png"
              count={playerOneCapturedPieces}
              position="left"
            />
            <CapturedPieces
              asset="/assets/piece-king-red.png"
              count={playerTwoCapturedPieces}
              position="right"
            />
            <div
              className="board-put-in relative aspect-square bg-contain bg-center bg-no-repeat drop-shadow-2xl"
              style={{ backgroundImage: "url('/assets/board.png')" }}
            >
              <div
                className="absolute grid grid-cols-8 grid-rows-8"
                style={{
                  top: "14.95%",
                  right: "15.05%",
                  bottom: "14.95%",
                  left: "14.95%",
                }}
              >
              {state.board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const isSelected = selected && selected.row === rowIndex && selected.col === colIndex;
                  const isLanding = selectedMoves.some((move) => sameSquare(move.to, { row: rowIndex, col: colIndex }));

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={[
                        "relative flex h-full w-full items-center justify-center bg-transparent transition",
                        isSelected ? "ring-4 ring-inset ring-[#f7d36b]" : "",
                        isLanding ? "after:absolute after:z-20 after:h-4 after:w-4 after:rounded-full after:bg-[#2dd4bf] after:shadow-[0_0_0_4px_rgba(15,118,110,0.28)]" : "",
                      ].join(" ")}
                      aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}`}
                    >
                      {piece && showPieces ? (
                        <Piece animate={animateBoardPieces} col={colIndex} piece={piece} row={rowIndex} />
                      ) : null}
                    </button>
                  );
                })
              )}
              </div>
            </div>
          </div>
        </section>

        <aside className="mx-auto w-full max-w-[30rem] lg:max-w-none">
          <div
            className="sanb-put-in relative aspect-[784/573] w-full bg-contain bg-center bg-no-repeat text-[#f5f0df] drop-shadow-2xl"
            style={{ backgroundImage: "url('/assets/SANB.png')" }}
          >
            <div className="absolute left-1/2 top-[-18%] z-20 flex -translate-x-1/2 gap-12">
              <button
                type="button"
                onClick={() => {
                  setGameSetup(null);
                  setSelected(null);
                }}
                className="h-14 w-32 bg-[url('/assets/menu_button.png')] bg-contain bg-center bg-no-repeat text-xl font-semibold text-stone-950 drop-shadow-lg transition hover:scale-105"
              >
                Menu
              </button>
              <button
                type="button"
                onClick={resetGame}
                className="h-14 w-32 bg-[url('/assets/reset_button.png')] bg-contain bg-center bg-no-repeat text-xl font-semibold text-stone-950 drop-shadow-lg transition hover:scale-105"
              >
                Reset
              </button>
            </div>
            <div className="absolute inset-[17%_12%_19%_12%] flex flex-col justify-between px-4 py-3 text-center">
            <div>
              <p className="text-3xl leading-none text-[#5eead4]">Score Board</p>
              <p className="mt-2 text-xl leading-none text-[#f8f1d4]">
                {state.status === "finished" ? "Winner" : "Turn"}:{" "}
                <span className={statusColor}>{playerNames[statusPlayer]}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ScoreLine
                align="text-center"
                color="text-[#ff382d]"
                label={playerNames[PLAYERS.RED]}
                score={playerOneCapturedPieces}
              />
              <ScoreLine
                align="text-center"
                color="text-[#3aa7ff]"
                label={playerNames[PLAYERS.BLACK]}
                score={playerTwoCapturedPieces}
              />
            </div>

            <div className="text-center text-xl leading-none text-[#f8f1d4]">
              <p>Round</p>
              <p className="mt-1 text-2xl text-[#5eead4]">{state.moveNumber}</p>
            </div>
            </div>
          </div>
          <SocialLinks className="mt-5" />
        </aside>
      </div>
    </main>
  );
}

function LoadingScreen({ progress }) {
  const filledPieces = Math.floor(progress / 25);
  const pieces = [
    "/assets/piece-king-red.png",
    "/assets/piece-king-blue.png",
    "/assets/piece-king-red.png",
    "/assets/piece-king-blue.png",
  ];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-white">
      <section className="w-full max-w-md text-center">
        <p className="text-4xl font-bold uppercase tracking-[0.14em]">Loading...</p>

        <div className="mt-5 p-2">
          <div className="grid grid-cols-4 gap-2">
            {pieces.map((asset, index) => {
              const filled = index < filledPieces;

              return (
                <div
                  key={`${asset}-${index}`}
                  className={[
                    "flex h-16 items-center justify-center transition",
                    filled ? "opacity-100" : "opacity-25 grayscale",
                  ].join(" ")}
                >
                  <img
                    src={asset}
                    alt=""
                    className="h-16 w-16 object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]"
                    draggable="false"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-5 text-5xl font-bold leading-none">{progress}%</p>
      </section>
    </main>
  );
}

function StartScreen({ onStart }) {
  const [mode, setMode] = useState("solo");
  const [playerOneName, setPlayerOneName] = useState("");
  const [playerTwoName, setPlayerTwoName] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    onStart({
      mode,
      players: {
        [PLAYERS.RED]: playerOneName.trim() || "Player 1",
        [PLAYERS.BLACK]: mode === "solo" ? "Robot" : playerTwoName.trim() || "Player 2",
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-[#f7efe2]">
      <div className="w-full max-w-[46rem]">
        <form
          onSubmit={handleSubmit}
          className="sanb-put-in relative aspect-[784/573] w-full bg-contain bg-center bg-no-repeat text-center drop-shadow-2xl"
          style={{ backgroundImage: "url('/assets/SANB.png')" }}
        >
          <div className="absolute inset-[16%_11%_15%_11%] flex flex-col justify-between px-5 py-4">
            <div>
              <p className="text-lg uppercase tracking-[0.22em] text-[#2c87e9]">Moroccan Dama</p>
              <h1 className="mt-1 text-5xl leading-none text-[#f8f1d4]">Choose Game</h1>
            </div>

          <div className="grid grid-cols-2 gap-4 text-5xl">
            <ModeButton active={mode === "solo"} color="text-[#ff382d]" onClick={() => setMode("solo")}>
              Solo vs Robot
            </ModeButton>
            <ModeButton active={mode === "twoPlayers"} color="text-[#3aa7ff]" onClick={() => setMode("twoPlayers")}>
              2 Players
            </ModeButton>
          </div>

          <div className="grid gap-3 text-left ">
            <NameInput
              label="Your name"
              value={playerOneName}
              onChange={(event) => setPlayerOneName(event.target.value)}
              placeholder="Player 1"
            />
            {mode === "twoPlayers" ? (
              <NameInput
                label="Player 2 name"
                value={playerTwoName}
                onChange={(event) => setPlayerTwoName(event.target.value)}
                placeholder="Player 2"
              />
            ) : null}
          </div>

            <button
              type="submit"
              className="mx-auto h-20 w-full max-w-[24rem] bg-transparent text-[3rem] leading-none text-[#2c87e9] transition hover:text-[#2c4fe9]"
            >
              Start
            </button>
          </div>
        </form>
        <SocialLinks className="mt-5" />
      </div>
    </main>
  );
}

function ModeButton({ active, children, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-16 bg-transparent px-3 text-4xl leading-none transition",
        color,
        active ? "opacity-100" : "opacity-70 hover:opacity-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SocialLinks({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <a
        href="https://github.com/anasbounaiim"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub profile"
        className="social-piece block h-16 w-16 transition hover:scale-110"
      >
        <img
          src="/assets/piece_github.png"
          alt=""
          className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]"
          draggable="false"
        />
      </a>
      <a
        href="https://www.linkedin.com/in/anas-bounaim-37450621a/"
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn profile"
        className="social-piece block h-16 w-16 transition hover:scale-110 [animation-delay:120ms]"
      >
        <img
          src="/assets/piece_linkedin.png"
          alt=""
          className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.45)]"
          draggable="false"
        />
      </a>
    </div>
  );
}

function NameInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-xl leading-none text-[#f8f1d4]">
      <span>{label}</span>
      <span className="relative mt-2 flex h-11 w-full items-center">
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="relative z-10 h-full w-full bg-transparent px-4 text-2xl text-[#f8f1d4] outline-none placeholder:text-[#f8f1d4]/40"
        />
      </span>
    </label>
  );
}

function Piece({ animate, col, piece, row }) {
  const isPlayerTwo = piece.player === PLAYERS.BLACK;
  const asset = piece.king
    ? isPlayerTwo
      ? "/assets/piece-blue.png"
      : "/assets/piece-red.png"
    : isPlayerTwo
      ? "/assets/piece-king-blue.png"
      : "/assets/piece-king-red.png";
  const restY = isPlayerTwo ? "0%" : "-12%";
  const animationDelay = `${(isPlayerTwo ? row : 7 - row) * 55 + col * 18}ms`;

  return (
    <img
      src={asset}
      alt=""
      className={[
        "relative z-10 h-[68%] w-[68%] object-contain drop-shadow-[0_7px_4px_rgba(0,0,0,0.3)]",
        animate ? "piece-put-in" : "",
      ].join(" ")}
      style={
        animate
          ? { "--piece-rest-y": restY, animationDelay }
          : { transform: `translateY(${restY})` }
      }
      draggable="false"
    />
  );
}

function CapturedPieces({ asset, count, position }) {
  const sideClass =
    position === "left"
      ? "-left-20 items-end"
      : "-right-20 items-start";

  return (
    <div className={`pointer-events-none absolute top-[16%] z-30 flex max-h-[68%] w-14 flex-col gap-1 ${sideClass}`}>
      {Array.from({ length: count }).map((_, index) => (
        <img
          key={index}
          src={asset}
          alt=""
          className="piece-put-in h-10 w-10 object-contain drop-shadow-[0_5px_3px_rgba(0,0,0,0.45)]"
          draggable="false"
        />
      ))}
    </div>
  );
}

function ScoreLine({ align, color, label, score }) {
  return (
    <div className={`leading-none ${align}`}>
      <p className={`text-3xl ${color}`}>{label}</p>
      <p className="mt-2 text-4xl text-[#f8f1d4]">{score}</p>
    </div>
  );
}

function getPieceCounts(board) {
  return board.flat().reduce(
    (counts, piece) => {
      if (piece) {
        counts[piece.player] += 1;
      }

      return counts;
    },
    {
      [PLAYERS.RED]: 0,
      [PLAYERS.BLACK]: 0,
    }
  );
}

function sameSquare(left, right) {
  return left?.row === right?.row && left?.col === right?.col;
}
