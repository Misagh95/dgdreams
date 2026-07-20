import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWriteContract, useSwitchChain, useConfig } from 'wagmi';
import { getPublicClient } from '@wagmi/core';

const GAME2048_ADDR: Record<number, `0x${string}`> = {
  8453: '0xa4561909Dd4be271Ed26B1f28b4Cf16cfF82fd1f',
  999: '0x6e17E98fF56b12886636fa9Ea3C17E0CD01D9790',
  130: '0xdbeE9eA39FedD197D224EA7520A20b4434635A6a',
  4217: '0xC288b68022e752d97E4395ECbA61C2079CE692Ad',
  4663: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  1: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  91342: '0xC288b68022e752d97E4395ECbA61C2079CE692Ad',
  4441: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  5042002: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  1913: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
};

const GAME_ABI = [{ inputs: [{ name: '_score', type: 'uint256' }, { name: '_moves', type: 'uint256' }], name: 'recordPlay', outputs: [], stateMutability: 'nonpayable', type: 'function' }];

const TILE_COLORS: Record<number, string> = {
  2: '#e8e4df', 4: '#ddd6cb', 8: '#e3b396', 16: '#e2946e', 32: '#e07c57',
  64: '#de643b', 128: '#e2c582', 256: '#e0bc6a', 512: '#deb454',
  1024: '#dcac3e', 2048: '#daa428',
};

const NETWORK_LIST: { id: number; name: string }[] = [
  { id: 8453, name: 'Base' },
  { id: 999, name: 'HyperEVM' },
  { id: 130, name: 'Unichain' },
  { id: 4217, name: 'Tempo' },
  { id: 4663, name: 'Robinhood' },
  { id: 1, name: 'Ethereum' },
  { id: 91342, name: 'GIWA Sepolia' },
  { id: 4441, name: 'Liteforge' },
  { id: 5042002, name: 'ARC' },
  { id: 1913, name: 'SimpleChain' },
];

const SUPPORTED_IDS = NETWORK_LIST.map(n => n.id);

function slideRow(row: number[]) {
  let arr = row.filter(v => v);
  let score = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] && arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
  }
  while (arr.length < 4) arr.push(0);
  return { row: arr, score };
}

interface Game2048Props { onBack?: () => void }

export default function Game2048({ onBack }: Game2048Props) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [showGame, setShowGame] = useState(false);
  const [selectedNetId, setSelectedNetId] = useState<number>(0);
  const gridRef = useRef<number[][]>([]);
  const scoreRef = useRef(0);
  const movesRef = useRef(0);
  const overRef = useRef(false);
  const wonRef = useRef(false);
  const keepPlayingRef = useRef(false);

  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  const onWrongChain = isConnected && chainId && !SUPPORTED_IDS.includes(chainId);
  const onRightChain = isConnected && chainId && SUPPORTED_IDS.includes(chainId);
  const selNetName = NETWORK_LIST.find(n => n.id === selectedNetId)?.name;
  const chainNetName = chainId ? NETWORK_LIST.find(n => n.id === chainId)?.name : undefined;

  const addRandomTile = useCallback((g: number[][]) => {
    const empty: { x: number; y: number }[] = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (!g[y][x]) empty.push({ x, y });
    if (!empty.length) return g;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const newGrid = g.map(row => [...row]);
    newGrid[cell.y][cell.x] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
  }, []);

  const initGame = useCallback(() => {
    const empty = Array(4).fill(null).map(() => Array(4).fill(0) as number[]);
    const withTwo = addRandomTile(empty);
    const withFour = addRandomTile(withTwo);
    gridRef.current = withFour.map(r => [...r]);
    setGrid(withFour);
    setScore(0); setMoves(0); setOver(false); setWon(false); setKeepPlaying(false);
    scoreRef.current = 0; movesRef.current = 0; overRef.current = false; wonRef.current = false; keepPlayingRef.current = false;
  }, [addRandomTile]);

  const switchToNet = useCallback(async (id: number) => {
    if (!switchChainAsync) return;
    try { await switchChainAsync({ chainId: id }); } catch (e: any) {
      if (e?.code !== 4001) throw e;
    }
  }, [switchChainAsync]);

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (overRef.current || (wonRef.current && !keepPlayingRef.current)) return;
    const g = gridRef.current;
    let moved = false, totalScore = 0;
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(0) as number[]);

    if (direction === 'left' || direction === 'right') {
      for (let y = 0; y < 4; y++) {
        const row = direction === 'left' ? [...g[y]] : [...g[y]].reverse();
        const result = slideRow(row);
        const final = direction === 'left' ? result.row : result.row.reverse();
        for (let x = 0; x < 4; x++) { if (g[y][x] !== final[x]) moved = true; newGrid[y][x] = final[x]; }
        totalScore += result.score;
      }
    } else {
      for (let x = 0; x < 4; x++) {
        const col: number[] = [];
        for (let y = 0; y < 4; y++) col.push(g[y][x]);
        if (direction === 'down') col.reverse();
        const result = slideRow(col);
        const final = direction === 'down' ? result.row.reverse() : result.row;
        for (let y = 0; y < 4; y++) { if (g[y][x] !== final[y]) moved = true; newGrid[y][x] = final[y]; }
        totalScore += result.score;
      }
    }
    if (!moved) return;
    const afterAdd = addRandomTile(newGrid);
    const newScore = scoreRef.current + totalScore;
    const newMoves = movesRef.current + 1;
    scoreRef.current = newScore;
    movesRef.current = newMoves;

    const has2048 = afterAdd.some(row => row.includes(2048));
    if (has2048 && !wonRef.current) { wonRef.current = true; setWon(true); }
    const emptyCells = afterAdd.some(row => row.includes(0));
    let canMerge = false;
    if (!emptyCells) {
      for (let y = 0; y < 4 && !canMerge; y++)
        for (let x = 0; x < 4 && !canMerge; x++) {
          if (x < 3 && afterAdd[y][x] === afterAdd[y][x + 1]) canMerge = true;
          if (y < 3 && afterAdd[y][x] === afterAdd[y + 1][x]) canMerge = true;
        }
      if (!canMerge) { overRef.current = true; setOver(true); }
    }
    gridRef.current = afterAdd.map(r => [...r]);
    setGrid(afterAdd);
    setScore(newScore);
    setMoves(newMoves);

    const milestones = [128, 512, 1024, 2048];
    if (milestones.includes(newScore) || newMoves % 50 === 0) {
      sendTx(newScore, newMoves);
    }
  }, [addRandomTile]);

  const sendTx = async (s: number, m: number) => {
    if (!isConnected || !chainId) return;
    const addr = GAME2048_ADDR[chainId];
    if (!addr) return;
    try {
      const hash = await writeContractAsync({ address: addr, abi: GAME_ABI, functionName: 'recordPlay', args: [BigInt(s), BigInt(m)] });
      const pubClient = getPublicClient(wagmiConfig);
      await pubClient.waitForTransactionReceipt({ hash });
      setTxCount(prev => prev + 1);
    } catch { }
  };

  useEffect(() => {
    if (!showGame) return;
    initGame();
  }, [showGame, initGame]);

  useEffect(() => {
    if (!showGame) return;
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'up' | 'right' | 'down'> = { ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down' };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGame, move]);

  // sync selectedNetId from wallet chainId when connected
  useEffect(() => {
    if (isConnected && chainId && SUPPORTED_IDS.includes(chainId)) {
      setSelectedNetId(chainId);
    }
  }, [isConnected, chainId]);

  const networkSelect = (
    <select
      value={selectedNetId || ''}
      onChange={e => { const id = Number(e.target.value); setSelectedNetId(id); if (isConnected) switchToNet(id); }}
      className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
    >
      <option value="">Select network</option>
      {NETWORK_LIST.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
    </select>
  );

  if (!showGame) {
    return (
      <div className="mt-16 p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎮</div>
          <h3 className="text-base font-semibold text-[var(--text-bright)]">Play 2048</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Keep your wallet active on-chain while you play</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {NETWORK_LIST.map(n => (
            <span key={n.id} className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">{n.name}</span>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          {networkSelect}
          <button onClick={() => setShowGame(true)}
            className="px-6 py-2.5 rounded-lg bg-[var(--bg-strong)] border border-[var(--border-strong)] hover:bg-[var(--bg-strong-hover)] text-sm font-medium text-[var(--text-bright)] transition-all duration-200">
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16 p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-bright)]">2048</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Play & Keep Your Wallet Active</p>
        </div>
        <div className="flex items-center gap-2">
          {networkSelect}
          <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-center">
            <div className="text-[9px] uppercase text-[var(--text-quaternary)] tracking-wider">Score</div>
            <div className="text-sm font-bold text-[var(--text-bright)]">{score}</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-center">
            <div className="text-[9px] uppercase text-[var(--text-quaternary)] tracking-wider">Moves</div>
            <div className="text-sm font-bold text-[var(--text-bright)]">{moves}</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-center">
            <div className="text-[9px] uppercase text-[var(--text-quaternary)] tracking-wider">TX</div>
            <div className="text-sm font-bold text-[var(--text-bright)]">{txCount}</div>
          </div>
          <button onClick={() => { initGame(); setOver(false); setWon(false); }}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-strong)] text-xs font-medium text-[var(--text-bright)] hover:bg-[var(--bg-strong-hover)] transition-all duration-200">
            New
          </button>
          <button onClick={() => setShowGame(false)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-all duration-200">
            Close
          </button>
        </div>
      </div>

      {isConnected && onRightChain && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span><span className="text-[var(--text-quaternary)]">Net:</span> <span className="text-[var(--text-bright)] font-medium">{chainNetName || chainId}</span></span>
            <span><span className="text-[var(--text-quaternary)]">Wallet:</span> <span className="text-[var(--text-bright)] font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span></span>
          </div>
          <span className="text-xs text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded">Connected</span>
        </div>
      )}

      {isConnected && onWrongChain && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--warning)] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--warning)' }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span className="text-[var(--text-secondary)]">Wrong network selected. Please switch</span>
          </div>
          {selectedNetId && (
            <button onClick={() => switchToNet(selectedNetId)}
              style={{ background: 'var(--warning)' }}
              className="px-3 py-1 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all">
              Switch to {selNetName}
            </button>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
          Connect your wallet to activate on-chain syncing
        </div>
      )}

      <div className="relative" style={{ background: '#e5e7eb', borderRadius: 12, padding: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, aspectRatio: '1' }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const y = Math.floor(i / 4);
            const x = i % 4;
            const val = grid[y]?.[x] || 0;
            return (
              <div key={i} style={{ background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, fontSize: val > 100 ? 22 : 28, fontWeight: 700,
                  background: TILE_COLORS[val] || 'transparent',
                  color: val > 4 ? '#fff' : '#111827',
                }}>{val || ''}</div>
              </div>
            );
          })}
        </div>
        {over && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', borderRadius: 12, backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>Game Over</p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => { initGame(); setOver(false); setWon(false); }} className="px-5 py-2 rounded-lg bg-[#111827] text-white text-sm font-medium">Try Again</button>
            </div>
          </div>
        )}
        {won && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', borderRadius: 12, backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>You Win!</p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => { setKeepPlaying(true); keepPlayingRef.current = true; setWon(false); }} className="px-5 py-2 rounded-lg bg-[#111827] text-white text-sm font-medium">Keep Going</button>
              <button onClick={() => { initGame(); setOver(false); setWon(false); }} className="px-5 py-2 rounded-lg bg-[#111827] text-white text-sm font-medium">New Game</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
