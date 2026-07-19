import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { mainnetNetworks, testnetNetworks, type NetworkConfig } from './config/chains';

import { cn } from './utils/cn';
import { canExecute } from './utils/ratelimit';

const NIKBASE_ABI = [
  { inputs: [], name: 'dailyCheckIn', outputs: [{ name: 'newStreak', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'reception', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'gm', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'gn', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'takeDose', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_mood', type: 'string' }], name: 'moodCheck', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'sanitizeWallet', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'incrementCounter', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'luckySpin', outputs: [{ name: 'result', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getActionCounts', outputs: [
    { name: 'actCount', type: 'uint256' }, { name: 'dose', type: 'uint256' },
    { name: 'mood', type: 'uint256' }, { name: 'sanitize', type: 'uint256' },
    { name: 'counter', type: 'uint256' }, { name: 'spin', type: 'uint256' },
  ], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getFlags', outputs: [
    { name: 'cIn', type: 'bool' }, { name: 'rec', type: 'bool' },
    { name: 'gmDone_', type: 'bool' }, { name: 'gnDone_', type: 'bool' },
  ], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getUserData', outputs: [
    { name: 'strk', type: 'uint256' }, { name: 'totalCI', type: 'uint256' },
    { name: 'totalAct', type: 'uint256' },
  ], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'canCheckIn', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getSpinsRemaining', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const CONTRACTS: Record<number, `0x${string}` | ''> = {
  8453: '0xCB1b3a864D384D5Ad42b6F5b81825AB084444D9c',
  999: '0xC288b68022e752d97E4395ECbA61C2079CE692Ad',
  130: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  4217: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  4663: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  1: '0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0',
  11155111: '0x68bb9775B11551310D7A37Aae52e6505A0E1e733',
  84532: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  91342: '0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0',
  4441: '0x68bb9775B11551310D7A37Aae52e6505A0E1e733',
  5042002: '0x68bb9775B11551310D7A37Aae52e6505A0E1e733',
  1913: '0x68bb9775B11551310D7A37Aae52e6505A0E1e733',
};

const SOULBOUND_ADDR: Record<number, `0x${string}` | ''> = {
  8453: '',
  999: '',
  130: '',
  4217: '',
  4663: '',
  1: '',
  11155111: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  84532: '0xC288b68022e752d97E4395ECbA61C2079CE692Ad',
  91342: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  4441: '0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0',
  5042002: '0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0',
  1913: '0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0',
};

const SOULBOUND_ABI = [
  { inputs: [], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'upgrade', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '', type: 'address' }], name: 'userTokenId', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '', type: 'uint256' }], name: 'tokenURI', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '', type: 'uint256' }], name: 'tokenData', outputs: [{ name: 'tier', type: 'uint8' }, { name: 'streak', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'streak', type: 'uint256' }], name: 'getTier', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'pure', type: 'function' },
] as const;

const TIER_INFO: Record<number, { label: string; icon: string; color: string }> = {
  1: { label: 'Bronze', icon: '🥉', color: '#cd7f32' },
  2: { label: 'Silver', icon: '🥈', color: '#c0c0c0' },
  3: { label: 'Gold', icon: '🥇', color: '#ffd700' },
  4: { label: 'Diamond', icon: '💎', color: '#00bfff' },
  5: { label: 'Legend', icon: '🏆', color: '#d4af37' },
};

const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
  { id: 'surprised', emoji: '😮', label: 'Surprised' },
] as const;

type ActionId = 'checkIn' | 'reception' | 'gm' | 'gn' | 'dose' | 'mood' | 'sanitize' | 'counter' | 'spin';

interface ActionConfig {
  id: ActionId;
  title: string;
  desc: string;
  icon: string;
  limit: number;
  getCurrent: (state: DailyState | null) => number;
  requiresSubAction?: boolean;
}

interface DailyState {
  actionCount: number;
  maxActions: number;
  checkedIn: boolean;
  receptionDone: boolean;
  gmDone: boolean;
  gnDone: boolean;
  doseCount: number;
  moodCount: number;
  sanitizeCount: number;
  counterCount: number;
  spinCount: number;
  maxSpins: number;
}

function NetworkSelector({
  current,
  onSelect,
}: {
  current: NetworkConfig;
  onSelect: (n: NetworkConfig) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated-hover)] hover:border-[var(--border-hover)] transition-all"
      >
        <div dangerouslySetInnerHTML={{ __html: current.logo }} style={{ width: 24, height: 24 }} />
        <span className="text-sm font-medium">{current.name}</span>
        <svg className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 z-20 w-56 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-2xl shadow-black/60 backdrop-blur-xl">
            {mainnetNetworks.map((n) => (
              <button
                key={n.id}
                onClick={() => { onSelect(n); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors',
                  current.id === n.id ? 'bg-[var(--bg-strong)] text-[var(--text-bright)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <div dangerouslySetInnerHTML={{ __html: n.logo }} style={{ width: 22, height: 22 }} />
                <span>{n.name}</span>
                {current.id === n.id && <span className="ml-auto text-xs opacity-50">Active</span>}
              </button>
            ))}
            <div className="mx-3 my-1.5 pt-1.5 border-t border-[var(--border-default)] flex items-center gap-2">
              <svg className="w-3 h-3 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-500">Test Net</span>
            </div>
            {testnetNetworks.map((n) => (
              <button
                key={n.id}
                onClick={() => { onSelect(n); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors',
                  current.id === n.id ? 'bg-[var(--bg-strong)] text-[var(--text-bright)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <div dangerouslySetInnerHTML={{ __html: n.logo }} style={{ width: 22, height: 22 }} />
                <span>{n.name}</span>
                {current.id === n.id && <span className="ml-auto text-xs opacity-50">Active</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActionCard({
  action,
  state,
  onAction,
  onMoodSelect,
  pending,
  disabled,
}: {
  action: ActionConfig;
  state: DailyState | null;
  onAction: (id: ActionId) => void;
  onMoodSelect?: (mood: string) => void;
  pending: boolean;
  disabled: boolean;
}) {
  const current = state ? action.getCurrent(state) : 0;
  const remaining = action.limit - current;
  const isExhausted = remaining <= 0;
  const [showMoods, setShowMoods] = useState(false);

  if (action.id === 'mood' && showMoods) {
    return (
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <p className="text-xs text-[var(--text-tertiary)] mb-3">Choose your mood:</p>
        <div className="grid grid-cols-2 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => { onMoodSelect?.(m.id); setShowMoods(false); }}
              disabled={disabled || isExhausted}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all text-sm disabled:opacity-30"
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowMoods(false)}
          className="mt-2 text-xs text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] transition-all',
        !disabled && !isExhausted ? 'hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)]' : 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{action.icon}</span>
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{action.title}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">{action.desc}</p>
          </div>
        </div>
        <div className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          isExhausted ? 'bg-red-500/10 text-red-400' : 'bg-[var(--bg-strong)] text-[var(--text-secondary)]'
        )}>
          {current}/{action.limit}
        </div>
      </div>
      <button
        onClick={() => action.requiresSubAction ? setShowMoods(true) : onAction(action.id)}
        disabled={disabled || isExhausted || pending}
        className={cn(
          'w-full py-2 rounded-lg text-xs font-medium transition-all',
          isExhausted
            ? 'bg-[var(--bg-card)] text-[var(--text-faint)] cursor-not-allowed'
            : pending
              ? 'bg-[var(--bg-strong)] text-[var(--text-tertiary)] cursor-wait'
              : 'bg-[var(--bg-strong)] hover:bg-[var(--bg-strong-hover)] text-[var(--text-primary)] hover:text-[var(--text-bright)] active:scale-[0.98]'
        )}
      >
        {pending ? 'Confirming...' : isExhausted ? 'Done for today' : action.requiresSubAction ? 'Choose mood...' : 'Execute'}
      </button>
    </div>
  );
}

const THEMES = [
  { id: 'dark', label: 'Dark', icon: '🌙', primary: '#050505', secondary: '#0C0C0C' },
  { id: 'light', label: 'Light', icon: '☀️', primary: '#f5f0eb', secondary: '#ffffff' },
  { id: 'midnight', label: 'Midnight', icon: '🌌', primary: '#070714', secondary: '#0a0a24' },
  { id: 'forest', label: 'Forest', icon: '🌿', primary: '#0a140a', secondary: '#0d1a0d' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

function getInitialTheme(): ThemeId {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nikbase-theme');
    if (stored && THEMES.some(t => t.id === stored)) return stored as ThemeId;
  }
  return 'dark';
}

function TurnstileWidget({ onVerify, onExpire }: { onVerify: (t: string) => void; onExpire: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let widgetId: string | undefined;
    const check = () => {
      if (ref.current && !widgetId && (window as any).turnstile) {
        widgetId = (window as any).turnstile.render(ref.current, {
          sitekey: '0x4AAAAAAD5Ha7HCuxQTbBy8',
          callback: (token: string) => { setDone(true); onVerify(token); },
          'expired-callback': () => { setDone(false); onExpire(); },
        });
        setReady(true);
      }
    };
    const id = setInterval(check, 200);
    setTimeout(() => clearInterval(id), 10000);
    return () => { clearInterval(id); if (widgetId && (window as any).turnstile) (window as any).turnstile.remove(widgetId); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      {!done && <p className="text-[10px] text-[var(--text-tertiary)] tracking-wider uppercase">Verify you're human</p>}
      <div ref={ref} />
      {done && <p className="text-[10px] text-green-500">Verified</p>}
    </div>
  );
}

function ThemeSwitcher({
  current,
  onChange,
}: {
  current: ThemeId;
  onChange: (t: ThemeId) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] hover:bg-[var(--bg-strong)] hover:border-[var(--border-hover)] transition-all text-sm"
        title={`Theme: ${current}`}
      >
        {THEMES.find(t => t.id === current)?.icon}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 z-20 w-40 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-2xl shadow-black/60 backdrop-blur-xl">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors',
                  current === t.id ? 'bg-[var(--bg-strong)] text-[var(--text-bright)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
                {current === t.id && <span className="ml-auto text-xs opacity-50">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme);
  const [selectedNetwork, setSelectedNetwork] = useState(mainnetNetworks[0]);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nikbase-theme', theme);
  }, [theme]);

  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const contractAddress = CONTRACTS[selectedNetwork.id] || undefined;
  const nftAddress = SOULBOUND_ADDR[selectedNetwork.id] || undefined;
  const onRightChain = chainId === selectedNetwork.id;

  const { data: countsData, refetch: refetchCounts } = useReadContract({
    address: contractAddress, abi: NIKBASE_ABI, functionName: 'getActionCounts',
    args: address ? [address] : undefined,
    query: { enabled: !!contractAddress && !!address && onRightChain, refetchInterval: 10_000 },
  });

  const { data: flagsData, refetch: refetchFlags } = useReadContract({
    address: contractAddress, abi: NIKBASE_ABI, functionName: 'getFlags',
    args: address ? [address] : undefined,
    query: { enabled: !!contractAddress && !!address && onRightChain, refetchInterval: 10_000 },
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: contractAddress, abi: NIKBASE_ABI, functionName: 'getUserData',
    args: address ? [address] : undefined,
    query: { enabled: !!contractAddress && !!address && onRightChain },
  });

  const parsedState: DailyState | null = (countsData && flagsData)
    ? {
        actionCount: Number(countsData[0]),
        maxActions: 15,
        checkedIn: flagsData[0],
        receptionDone: flagsData[1],
        gmDone: flagsData[2],
        gnDone: flagsData[3],
        doseCount: Number(countsData[1]),
        moodCount: Number(countsData[2]),
        sanitizeCount: Number(countsData[3]),
        counterCount: Number(countsData[4]),
        spinCount: Number(countsData[5]),
        maxSpins: 3,
      }
    : null;

  const { data: nftTokenId } = useReadContract({
    address: nftAddress, abi: SOULBOUND_ABI, functionName: 'userTokenId',
    args: address ? [address] : undefined,
    query: { enabled: !!nftAddress && !!address && onRightChain },
  });
  const hasNft = nftTokenId !== undefined && nftTokenId > 0;

  const { data: nftData } = useReadContract({
    address: nftAddress, abi: SOULBOUND_ABI, functionName: 'tokenData',
    args: hasNft && nftTokenId ? [nftTokenId] : undefined,
    query: { enabled: hasNft && !!nftAddress && !!nftTokenId },
  });

  const nftTier = nftData ? Number(nftData[0]) : 0;
  const nftStreak = nftData ? Number(nftData[1]) : 0;

  const streak = userData ? Number(userData[0]) : 0;
  const totalActions = userData ? Number(userData[2]) : 0;

  const { writeContract: writeMint, data: mintHash, isPending: mintPending } = useWriteContract();
  const { writeContract: writeUpgrade, data: upgradeHash, isPending: upgradePending } = useWriteContract();

  const handleMint = useCallback(() => {
    if (!ensureConnected() || !nftAddress) return;
    setErrMsg(null);
    writeMint({ address: nftAddress, abi: SOULBOUND_ABI, functionName: 'mint' });
  }, [ensureConnected, nftAddress, writeMint]);

  const handleUpgrade = useCallback(() => {
    if (!ensureConnected() || !nftAddress) return;
    setErrMsg(null);
    writeUpgrade({ address: nftAddress, abi: SOULBOUND_ABI, functionName: 'upgrade' });
  }, [ensureConnected, nftAddress, writeUpgrade]);

  const { writeContract: writeCheckIn, data: checkInHash, isPending: checkInPending, error: checkInError, reset: resetCheckIn } = useWriteContract();
  const { writeContract: writeReception, data: receptionHash, isPending: receptionPending, error: receptionError } = useWriteContract();
  const { writeContract: writeGm, data: gmHash, isPending: gmPending, error: gmError } = useWriteContract();
  const { writeContract: writeGn, data: gnHash, isPending: gnPending, error: gnError } = useWriteContract();
  const { writeContract: writeDose, data: doseHash, isPending: dosePending, error: doseError } = useWriteContract();
  const { writeContract: writeMood, data: moodHash, isPending: moodPending, error: moodError } = useWriteContract();
  const { writeContract: writeSanitize, data: sanitizeHash, isPending: sanitizePending, error: sanitizeError } = useWriteContract();
  const { writeContract: writeCounter, data: counterHash, isPending: counterPending, error: counterError } = useWriteContract();
  const { writeContract: writeSpin, data: spinHash, isPending: spinPending, error: spinError } = useWriteContract();

  const allHashes = [checkInHash, receptionHash, gmHash, gnHash, doseHash, moodHash, sanitizeHash, counterHash, spinHash].filter(Boolean);
  const allPending = checkInPending || receptionPending || gmPending || gnPending || dosePending || moodPending || sanitizePending || counterPending || spinPending;

  const latestHash = allHashes[allHashes.length - 1] as `0x${string}` | undefined;
  const { isSuccess: anySuccess } = useWaitForTransactionReceipt({ hash: latestHash });

  useEffect(() => {
    if (anySuccess) { refetchCounts(); refetchFlags(); refetchUser(); }
  }, [anySuccess, refetchCounts, refetchFlags, refetchUser]);

  const lastError = checkInError || receptionError || gmError || gnError || doseError || moodError || sanitizeError || counterError || spinError;
  useEffect(() => {
    if (lastError) {
      const msg = lastError.message?.includes("Already") ? "Already done today" : lastError.message?.slice(0, 80) || "Transaction failed";
      setErrMsg(msg);
    } else if (allHashes.length > 0) {
      setErrMsg(null);
    }
  }, [lastError, allHashes.length]);

  const handleNetworkChange = useCallback((network: NetworkConfig) => {
    setSelectedNetwork(network);
    if (switchChain && isConnected) switchChain({ chainId: network.id });
    setLastTxHash(null);
    setErrMsg(null);
  }, [switchChain, isConnected]);

  const ensureConnected = useCallback(() => {
    if (!isConnected) { openConnectModal?.(); return false; }
    if (!contractAddress) { setErrMsg("Contract not deployed on this chain"); return false; }
    return true;
  }, [isConnected, openConnectModal, contractAddress]);

  const actions: ActionConfig[] = [
    { id: 'checkIn', title: 'Daily Check-In', desc: 'Maintain your streak', icon: '🔥', limit: 1, getCurrent: (s) => s?.checkedIn ? 1 : 0 },
    { id: 'reception', title: 'Reception', desc: 'Daily clinic entry', icon: '🏥', limit: 1, getCurrent: (s) => s?.receptionDone ? 1 : 0 },
    { id: 'gm', title: 'GM', desc: 'Good morning!', icon: '☀️', limit: 1, getCurrent: (s) => s?.gmDone ? 1 : 0 },
    { id: 'gn', title: 'GN', desc: 'Good night!', icon: '🌙', limit: 1, getCurrent: (s) => s?.gnDone ? 1 : 0 },
    { id: 'dose', title: 'Take Dose', desc: 'Your daily medicine', icon: '💊', limit: 3, getCurrent: (s) => s?.doseCount ?? 0 },
    { id: 'mood', title: 'Mood Check', desc: 'How are you feeling?', icon: '🎭', limit: 3, getCurrent: (s) => s?.moodCount ?? 0, requiresSubAction: true },
    { id: 'sanitize', title: 'Sanitize', desc: 'Clean your wallet', icon: '🧼', limit: 3, getCurrent: (s) => s?.sanitizeCount ?? 0 },
    { id: 'counter', title: 'Counter', desc: 'Increment the counter', icon: '🔢', limit: 3, getCurrent: (s) => s?.counterCount ?? 0 },
    { id: 'spin', title: 'Lucky Spin', desc: 'Spin for rewards', icon: '🎲', limit: 3, getCurrent: (s) => s?.spinCount ?? 0 },
  ];

  const actionWriters: Record<ActionId, { write: (args: any) => void; pending: boolean }> = {
    checkIn: { write: writeCheckIn, pending: checkInPending },
    reception: { write: writeReception, pending: receptionPending },
    gm: { write: writeGm, pending: gmPending },
    gn: { write: writeGn, pending: gnPending },
    dose: { write: writeDose, pending: dosePending },
    mood: { write: (args: any) => writeMood({ ...args, functionName: 'moodCheck', args: [] }), pending: moodPending },
    sanitize: { write: writeSanitize, pending: sanitizePending },
    counter: { write: writeCounter, pending: counterPending },
    spin: { write: (args: any) => writeSpin({ ...args, functionName: 'luckySpin' }), pending: spinPending },
  };

  const handleAction = useCallback((id: ActionId) => {
    if (!ensureConnected() || !contractAddress) return;
    if (!canExecute(id)) { setErrMsg("Please wait a moment before next action"); return; }
    setErrMsg(null);
    const addr = contractAddress;
    const abi = NIKBASE_ABI;
    const writers: Record<ActionId, () => void> = {
      checkIn: () => { resetCheckIn(); writeCheckIn({ address: addr, abi, functionName: 'dailyCheckIn' }); },
      reception: () => writeReception({ address: addr, abi, functionName: 'reception' }),
      gm: () => writeGm({ address: addr, abi, functionName: 'gm' }),
      gn: () => writeGn({ address: addr, abi, functionName: 'gn' }),
      dose: () => writeDose({ address: addr, abi, functionName: 'takeDose' }),
      mood: () => {},
      sanitize: () => writeSanitize({ address: addr, abi, functionName: 'sanitizeWallet' }),
      counter: () => writeCounter({ address: addr, abi, functionName: 'incrementCounter' }),
      spin: () => writeSpin({ address: addr, abi, functionName: 'luckySpin' }),
    };
    writers[id]();
  }, [ensureConnected, contractAddress, writeCheckIn, writeReception, writeGm, writeGn, writeDose, writeSanitize, writeCounter, writeSpin, resetCheckIn]);

  const handleMoodSelect = useCallback((mood: string) => {
    if (!ensureConnected() || !contractAddress) return;
    if (!canExecute('mood')) { setErrMsg("Please wait a moment"); return; }
    setErrMsg(null);
    writeMood({ address: contractAddress, abi: NIKBASE_ABI, functionName: 'moodCheck', args: [mood] });
  }, [ensureConnected, contractAddress, writeMood]);

  const used = parsedState?.actionCount ?? 0;
  const total = parsedState?.maxActions ?? 15;
  const progressPct = Math.min((used / total) * 100, 100);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-bright)]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 0%, transparent 50%), radial-gradient(circle at 75% 75%, white 0%, transparent 50%)'
        }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="/logos/ogo.png" alt="OGO" className="w-9 h-9 rounded-xl" />
            <div>
              <h1 className="text-sm font-semibold tracking-wide">DGDreams</h1>
              <p className="text-[10px] text-[var(--text-quaternary)] tracking-widest uppercase">Multi-Chain Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NetworkSelector current={selectedNetwork} onSelect={handleNetworkChange} />
            <ThemeSwitcher current={theme} onChange={setTheme} />
            <button
              onClick={() => openConnectModal?.()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-strong)] border border-[var(--border-default)] hover:bg-[var(--bg-strong-hover)] hover:border-[var(--border-hover)] transition-all text-xs font-medium"
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {isConnected ? `${address?.slice(0, 5)}...${address?.slice(-3)}` : 'Connect Wallet'}
            </button>
          </div>
        </header>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)]">Daily Progress</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{used}/{total}</span>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-orange-400">🔥</span>
                <span className="text-[var(--text-secondary)]">Streak: <span className="text-orange-400 font-medium">{streak}</span></span>
              </div>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-strong)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${selectedNetwork.color}88, ${selectedNetwork.color})`,
              }}
            />
          </div>
        </div>

        {isConnected && contractAddress && onRightChain && nftAddress && turnstileToken && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{hasNft ? (TIER_INFO[nftTier]?.icon || '🎖️') : '🎫'}</span>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Membership</p>
                  {hasNft ? (
                    <p className="text-sm font-medium">{TIER_INFO[nftTier]?.label || `Tier ${nftTier}`} &middot; {nftStreak}-day streak</p>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Mint your Soulbound NFT</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!hasNft && streak >= 7 ? (
                  <button onClick={handleMint} disabled={mintPending}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-strong)] hover:bg-[var(--bg-strong-hover)] border border-[var(--border-default)] text-xs font-medium transition-all disabled:opacity-40">
                    {mintPending ? 'Minting...' : 'Mint NFT'}
                  </button>
                ) : hasNft && streak > nftStreak ? (
                  <button onClick={handleUpgrade} disabled={upgradePending}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-strong)] hover:bg-[var(--bg-strong-hover)] border border-[var(--border-default)] text-xs font-medium transition-all disabled:opacity-40">
                    {upgradePending ? 'Upgrading...' : `Upgrade to ${TIER_INFO[streak >= 100 ? 5 : streak >= 60 ? 4 : streak >= 30 ? 3 : streak >= 14 ? 2 : 1]?.label || 'next'}`}
                  </button>
                ) : hasNft ? (
                  <span className="text-[10px] text-[var(--text-faint)] self-center">Current</span>
                ) : (
                  <span className="text-[10px] text-[var(--text-faint)] self-center">Need {7 - streak} more day{streak >= 6 ? '' : 's'}</span>
                )}
              </div>
            </div>
            {hasNft && (
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((t) => (
                  <div key={t} className={`flex-1 h-1.5 rounded-full ${t <= nftTier ? '' : 'opacity-20'}`}
                    style={{ background: TIER_INFO[t]?.color || '#555' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {errMsg && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {errMsg}
          </div>
        )}

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-2xl">
              🔗
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">Connect your wallet to start</p>
            <button
              onClick={() => openConnectModal?.()}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-elevated-hover)] hover:bg-[var(--bg-accent)] border border-[var(--border-strong)] hover:border-[var(--border-hover)] transition-all text-xs font-medium"
            >
              Connect Wallet
            </button>
          </div>
        ) : !contractAddress ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">Contract not deployed on <span className="text-[var(--text-secondary)]">{selectedNetwork.name}</span></p>
          </div>
        ) : !onRightChain ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-2xl">
              🔄
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">Switch your wallet to <span className="text-[var(--text-secondary)]">{selectedNetwork.name}</span></p>
            <button onClick={() => switchChain?.({ chainId: selectedNetwork.id })}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-elevated-hover)] hover:bg-[var(--bg-accent)] border border-[var(--border-strong)] hover:border-[var(--border-hover)] transition-all text-xs font-medium">
              Switch Network
            </button>
          </div>
        ) : (
          <>
            {!turnstileToken && (
              <div className="mb-5 flex flex-col items-center p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <TurnstileWidget
                  onVerify={(t) => setTurnstileToken(t)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {actions.map((action) => {
                const a = actionWriters[action.id];
                const isLimitReached = parsedState ? parsedState.actionCount >= parsedState.maxActions : false;
                return (
                  <ActionCard
                    key={action.id}
                    action={action}
                    state={parsedState}
                    onAction={handleAction}
                    onMoodSelect={handleMoodSelect}
                    pending={a.pending}
                    disabled={!turnstileToken || !isConnected || !contractAddress || isLimitReached || allPending}
                  />
                );
              })}
            </div>

            {totalActions > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-6 text-xs text-[var(--text-tertiary)]">
                  <span>Total actions: <span className="text-[var(--text-secondary)] font-medium">{totalActions}</span></span>
                  {streak > 0 && <span>Check-in streak: <span className="text-orange-400 font-medium">{streak}</span></span>}
                  <span>Network: <span className="text-[var(--text-secondary)]">{selectedNetwork.name}</span></span>
                </div>
              </div>
            )}

            {lastTxHash && (
              <div className="mt-4 text-xs text-[var(--text-quaternary)] break-all">
                Last tx: <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">{lastTxHash.slice(0, 20)}...</a>
              </div>
            )}
          </>
        )}

        <footer className="mt-12 pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-faint)]">
          <span>NikBase v2.0.0</span>
          <span>Multi-Chain Hub</span>
        </footer>
      </div>
    </div>
  );
}
