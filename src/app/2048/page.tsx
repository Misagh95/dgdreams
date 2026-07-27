"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Trophy,
  Zap,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Star,
  Shield,
  Wallet,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAccount, useSwitchChain, useWriteContract, useConfig } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { GAME2048_CONTRACTS } from "@/config/chains";

type Board = (number | null)[][];

const GRID_SIZE = 4;

const GAME_ABI = [
  {
    inputs: [
      { name: "_score", type: "uint256" },
      { name: "_moves", type: "uint256" },
    ],
    name: "recordPlay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const MILESTONES = [16, 32, 64, 128, 256, 512, 1024, 2048];

const NETWORK_LIST: { id: number; name: string }[] = [
  { id: 8453, name: "Base" },
  { id: 999, name: "HyperEVM" },
  { id: 130, name: "Unichain" },
  { id: 4217, name: "Tempo" },
  { id: 4663, name: "Robinhood" },
  { id: 1, name: "Ethereum" },
  { id: 57073, name: "Ink" },
  { id: 91342, name: "GIWA Sepolia" },
  { id: 4441, name: "Liteforge" },
  { id: 5042002, name: "ARC" },
  { id: 1913, name: "SimpleChain" },
];

const SUPPORTED_IDS = NETWORK_LIST.map((n) => n.id);

function createEmptyBoard(): Board {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));
}

function addRandomTile(board: Board): Board {
  const newBoard = board.map((row) => [...row]);
  const empty: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!newBoard[r][c]) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return newBoard;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initBoard(): Board {
  let b = createEmptyBoard();
  b = addRandomTile(b);
  b = addRandomTile(b);
  return b;
}

function slideRow(
  row: (number | null)[]
): { row: (number | null)[]; score: number } {
  const filtered = row.filter(Boolean) as number[];
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  return { row: merged.map((v) => v || null), score };
}

function moveLeft(
  board: Board
): { board: Board; score: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const newBoard = board.map((row) => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    if (newRow.some((v, i) => v !== row[i])) moved = true;
    return newRow;
  });
  return { board: newBoard, score: totalScore, moved };
}

function rotateClockwise(board: Board): Board {
  return board[0].map((_, i) => board.map((row) => row[i]).reverse());
}

function rotateCounterClockwise(board: Board): Board {
  return board[0].map((_, i) => board.map((row) => row[GRID_SIZE - 1 - i]));
}

function moveRight(
  board: Board
): { board: Board; score: number; moved: boolean } {
  const rotated = rotateClockwise(rotateClockwise(board));
  const { board: moved, score, moved: hasMoved } = moveLeft(rotated);
  return {
    board: rotateClockwise(rotateClockwise(moved)),
    score,
    moved: hasMoved,
  };
}

function moveUp(board: Board): { board: Board; score: number; moved: boolean } {
  const rotated = rotateCounterClockwise(board);
  const { board: moved, score, moved: hasMoved } = moveLeft(rotated);
  return { board: rotateClockwise(moved), score, moved: hasMoved };
}

function moveDown(
  board: Board
): { board: Board; score: number; moved: boolean } {
  const rotated = rotateClockwise(board);
  const { board: moved, score, moved: hasMoved } = moveLeft(rotated);
  return { board: rotateCounterClockwise(moved), score, moved: hasMoved };
}

function isGameOver(board: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!board[r][c]) return false;
      if (c + 1 < GRID_SIZE && board[r][c] === board[r][c + 1]) return false;
      if (r + 1 < GRID_SIZE && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

function getBestTile(board: Board): number {
  return Math.max(0, ...board.flat().map((v) => v || 0));
}

function getTileClass(value: number | null): string {
  if (!value) return "";
  const classes: Record<number, string> = {
    2: "tile-2",
    4: "tile-4",
    8: "tile-8",
    16: "tile-16",
    32: "tile-32",
    64: "tile-64",
    128: "tile-128",
    256: "tile-256",
    512: "tile-512",
    1024: "tile-1024",
    2048: "tile-2048",
  };
  return classes[value] || "tile-2048";
}

function CheckCircle({
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      className={className}
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function Game2048Page() {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [txPending, setTxPending] = useState(false);
  const [selectedNetId, setSelectedNetId] = useState<number>(0);
  const [lastMilestone, setLastMilestone] = useState(0);

  const scoreRef = useRef(0);
  const movesRef = useRef(0);
  const wonRef = useRef(false);
  const overRef = useRef(false);
  const keepRef = useRef(false);
  const txPendingRef = useRef(false);

  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  const onWrongChain =
    isConnected && chainId && !SUPPORTED_IDS.includes(chainId);
  const onRightChain =
    isConnected && chainId && SUPPORTED_IDS.includes(chainId);
  const selNetName = NETWORK_LIST.find((n) => n.id === selectedNetId)?.name;
  const chainNetName = chainId
    ? NETWORK_LIST.find((n) => n.id === chainId)?.name
    : undefined;
  const contractAddr =
    chainId && GAME2048_CONTRACTS[chainId] ? GAME2048_CONTRACTS[chainId] : null;

  const sendTx = useCallback(
    async (s: number, m: number) => {
      if (!isConnected || !chainId || !contractAddr || txPendingRef.current)
        return;
      txPendingRef.current = true;
      setTxPending(true);
      try {
        const hash = await writeContractAsync({
          address: contractAddr,
          abi: GAME_ABI,
          functionName: "recordPlay",
          args: [BigInt(s), BigInt(m)],
        });
        const pubClient = getPublicClient(wagmiConfig);
        if (!pubClient) return;
        await pubClient.waitForTransactionReceipt({ hash });
        setTxCount((prev) => prev + 1);
      } catch {
        // tx rejected or failed – silent
      } finally {
        txPendingRef.current = false;
        setTxPending(false);
      }
    },
    [isConnected, chainId, contractAddr, writeContractAsync, wagmiConfig]
  );

  const handleMove = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (overRef.current || (wonRef.current && !keepRef.current)) return;

      const moveFns = {
        left: moveLeft,
        right: moveRight,
        up: moveUp,
        down: moveDown,
      };
      const { board: newBoard, score: gained, moved } = moveFns[direction](board);

      if (!moved) return;

      const boardWithTile = addRandomTile(newBoard);
      const newScore = scoreRef.current + gained;
      const newMoves = movesRef.current + 1;

      scoreRef.current = newScore;
      movesRef.current = newMoves;

      setBoard(boardWithTile);
      setScore(newScore);
      setMoveCount(newMoves);

      if (newScore > bestScore) {
        setBestScore(newScore);
      }

      const best = getBestTile(boardWithTile);
      if (best >= 2048 && !wonRef.current) {
        wonRef.current = true;
        setWon(true);
      }
      if (isGameOver(boardWithTile)) {
        overRef.current = true;
        setGameOver(true);
      }

      const reachedMilestone = MILESTONES.find(
        (m) => newScore >= m && m > lastMilestone
      );
      if (reachedMilestone) {
        setLastMilestone(reachedMilestone);
        sendTx(newScore, newMoves);
      }
    },
    [board, bestScore, lastMilestone, sendTx]
  );

  const restartGame = () => {
    const b = initBoard();
    scoreRef.current = 0;
    movesRef.current = 0;
    wonRef.current = false;
    overRef.current = false;
    keepRef.current = false;
    setBoard(b);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    setMoveCount(0);
    setLastMilestone(0);
  };

  const switchToNet = useCallback(
    async (id: number) => {
      if (!switchChainAsync) return;
      try {
        await switchChainAsync({ chainId: id });
      } catch {
        // user rejected
      }
    },
    [switchChainAsync]
  );

  useEffect(() => {
    if (isConnected && chainId && SUPPORTED_IDS.includes(chainId)) {
      setSelectedNetId(chainId);
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
      };
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  const bestTile = getBestTile(board);
  const milestoneStatuses = MILESTONES.map((m) => ({
    threshold: m.toLocaleString(),
    achieved: score >= m,
    txSent: lastMilestone >= m,
  }));

  return (
    <DashboardLayout title="2048 Terminal" subtitle="// on-chain puzzle game">
      <div className="max-w-full space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="xl:col-span-2">
            {/* Web3 Status Bar */}
            <div className="glass-panel rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-[#00d4ff]" />
                {isConnected ? (
                  <>
                    <span className="text-xs font-mono text-[#64748b]">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    {onRightChain && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
                        {chainNetName || chainId}
                      </span>
                    )}
                    {onWrongChain && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/20">
                        Wrong net
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-[#64748b]">Wallet not connected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedNetId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedNetId(id);
                    if (isConnected) switchToNet(id);
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs font-mono bg-[rgba(6,13,26,0.8)] border border-[rgba(26,58,92,0.5)] text-[#94a3b8] outline-none"
                  style={{ minWidth: 120 }}
                >
                  <option value="">
                    {isConnected ? "Select net" : "Network"}
                  </option>
                  {NETWORK_LIST.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
                {txCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]">
                    <Zap className="w-3 h-3 text-[#00d4ff]" />
                    <span className="text-[10px] font-mono text-[#00d4ff]">
                      {txCount} TX
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                {
                  label: "Score",
                  value: score.toLocaleString(),
                  icon: Zap,
                  color: "#00d4ff",
                },
                {
                  label: "Best",
                  value: bestScore.toLocaleString(),
                  icon: Trophy,
                  color: "#ffaa00",
                },
                {
                  label: "Tile",
                  value: bestTile > 0 ? bestTile.toString() : "—",
                  icon: Star,
                  color: "#8b5cf6",
                },
                {
                  label: "Moves",
                  value: moveCount.toString(),
                  icon: Shield,
                  color: "#00ff88",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="glass-panel p-3 rounded-xl text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3" style={{ color: stat.color }} />
                      <span className="text-[9px] font-mono text-[#475569] uppercase tracking-widest">
                        {stat.label}
                      </span>
                    </div>
                    <div
                      className="text-xl font-black"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Game Board */}
            <div
              className="glass-panel rounded-2xl p-4 relative"
              style={{
                border: "1px solid rgba(0,212,255,0.15)",
                boxShadow: "0 0 40px rgba(0,212,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-black text-xl gradient-text-cyan">
                    2048
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {txPending && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]">
                      <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
                      <span className="text-[9px] font-mono text-[#00d4ff]">
                        TX pending
                      </span>
                    </div>
                  )}
                  <button
                    onClick={restartGame}
                    className="btn-secondary flex items-center gap-1.5 py-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">New</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <div
                  className="grid gap-2 p-3 rounded-xl"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    background: "rgba(6,13,26,0.8)",
                    border: "1px solid rgba(26,58,92,0.5)",
                    aspectRatio: "1",
                    maxWidth: "420px",
                    margin: "0 auto",
                  }}
                >
                  {board.flat().map((value, idx) => {
                    const tileClass = getTileClass(value);
                    return (
                      <motion.div
                        key={idx}
                        layout
                        initial={value ? { scale: 0.8, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 400,
                        }}
                        className={`flex items-center justify-center rounded-xl font-black text-lg border-2 ${tileClass}`}
                        style={{
                          aspectRatio: "1",
                          background: value
                            ? undefined
                            : "rgba(26,58,92,0.15)",
                          border: value
                            ? undefined
                            : "1px solid rgba(26,58,92,0.2)",
                          fontSize:
                            value && value >= 1024
                              ? "0.9rem"
                              : value && value >= 128
                              ? "1.1rem"
                              : "1.3rem",
                        }}
                      >
                        {value || ""}
                      </motion.div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {(gameOver || (won && !keepPlaying)) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-4"
                      style={{
                        background: gameOver
                          ? "rgba(2,4,8,0.85)"
                          : "rgba(6,13,26,0.85)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {won ? (
                        <>
                          <div className="text-5xl">🏆</div>
                          <h3 className="text-2xl font-black gradient-text-cyan">
                            You Reached 2048!
                          </h3>
                          <p className="text-sm text-[#64748b] font-mono">
                            Score: {score.toLocaleString()}
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setKeepPlaying(true);
                                keepRef.current = true;
                                setWon(false);
                              }}
                              className="btn-primary px-6 py-2"
                            >
                              Keep Going
                            </button>
                            <button
                              onClick={restartGame}
                              className="btn-secondary px-6 py-2"
                            >
                              New Game
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl">💀</div>
                          <h3 className="text-2xl font-black text-[#ff4444]">
                            Game Over
                          </h3>
                          <p className="text-sm text-[#64748b] font-mono">
                            Final Score: {score.toLocaleString()}
                          </p>
                          <button
                            onClick={restartGame}
                            className="btn-primary px-8 py-3"
                          >
                            Play Again
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Controls */}
              <div className="mt-4 flex flex-col items-center gap-2 md:hidden">
                <button
                  onClick={() => handleMove("up")}
                  className="btn-secondary w-12 h-12 flex items-center justify-center rounded-xl"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMove("left")}
                    className="btn-secondary w-12 h-12 flex items-center justify-center rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleMove("down")}
                    className="btn-secondary w-12 h-12 flex items-center justify-center rounded-xl"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleMove("right")}
                    className="btn-secondary w-12 h-12 flex items-center justify-center rounded-xl"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[10px] font-mono text-[#1e4d7a]">
                  Use arrow keys or WASD to move tiles
                </p>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="flex flex-col gap-4">
            {/* How to Play */}
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-[#e2e8f0]">
                  How to Play
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {[
                  "Use arrow keys or WASD to move tiles",
                  "Tiles with the same number merge when they collide",
                  "Combine tiles to reach 2048",
                  "Tx sent each power-of-2 milestone (16 → 2048)",
                  "Connect wallet + select network to play on-chain",
                ].map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-[#64748b]"
                  >
                    <span className="text-[#00d4ff] font-mono flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}.
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Milestones */}
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">
                  Milestones
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {milestoneStatuses.map((ms) => (
                  <div
                    key={ms.threshold}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{
                      background: "rgba(6,13,26,0.8)",
                      border: `1px solid ${
                        ms.achieved
                          ? "rgba(0,255,136,0.2)"
                          : "rgba(26,58,92,0.3)"
                      }`,
                    }}
                  >
                    <span className="text-xs font-mono text-[#64748b]">
                      Score {ms.threshold}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ms.txSent ? (
                        <CheckCircle className="w-3.5 h-3.5 text-[#00ff88]" />
                      ) : ms.achieved ? (
                        <span className="text-[9px] text-[#ffaa00] font-mono">
                          ready
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#334155] font-mono">
                          pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* On-chain Status */}
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">
                  On-Chain Sync
                </span>
              </div>
              <div className="flex flex-col gap-2 text-xs font-mono text-[#64748b]">
                <div className="flex justify-between">
                  <span>Wallet</span>
                  <span className={isConnected ? "text-[#00ff88]" : "text-[#ff4444]"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Network</span>
                  <span>
                    {chainNetName || (isConnected ? `#${chainId}` : "—")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Contract</span>
                  <span className="text-[10px]">
                    {contractAddr
                      ? `${contractAddr.slice(0, 6)}...${contractAddr.slice(-4)}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session TX</span>
                  <span className="text-[#00d4ff]">{txCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Milestone</span>
                  <span className="text-[#ffaa00]">
                    {lastMilestone > 0 ? lastMilestone : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Rewards */}
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-[#ffaa00]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">
                  Score Rewards
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  {
                    threshold: "1,000",
                    reward: "10 pts",
                    achieved: score >= 1000,
                  },
                  {
                    threshold: "5,000",
                    reward: "50 pts",
                    achieved: score >= 5000,
                  },
                  {
                    threshold: "10,000",
                    reward: "100 pts",
                    achieved: score >= 10000,
                  },
                  {
                    threshold: "50,000",
                    reward: "500 pts + badge",
                    achieved: score >= 50000,
                  },
                ].map((tier) => (
                  <div
                    key={tier.threshold}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{
                      background: "rgba(6,13,26,0.8)",
                      border: `1px solid ${
                        tier.achieved
                          ? "rgba(0,255,136,0.2)"
                          : "rgba(26,58,92,0.3)"
                      }`,
                    }}
                  >
                    <span className="text-xs font-mono text-[#64748b]">
                      Score {tier.threshold}+
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#ffaa00] font-bold">
                        {tier.reward}
                      </span>
                      {tier.achieved && (
                        <CheckCircle className="w-3.5 h-3.5 text-[#00ff88]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
