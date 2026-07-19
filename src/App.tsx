import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSwitchChain, useReadContract, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { isAddress as isAddr } from 'viem';
import { mainnetNetworks, testnetNetworks, type NetworkConfig, getNetworkConfig } from './config/chains';
import { cn } from './utils/cn';
import { parseTxError, getExplorerUrl, getNativeSymbol, shortenHash } from './utils/transactions';

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
  8453: '0xbB123f450822A42AeDa8e71aF3534d7dc84627F7',
  999: '0xdbeE9eA39FedD197D224EA7520A20b4434635A6a',
  130: '0xC288b68022e752d97E4395ECbA61C2079CE692Ad',
  4217: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  4663: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  1: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  11155111: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  84532: '0xdbeE9eA39FedD197D224EA7520A20b4434635A6a',
  91342: '0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff',
  4441: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  5042002: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
  1913: '0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B',
};

const SOULBOUND_ADDR: Record<number, `0x${string}` | ''> = {
  8453: '', 999: '', 130: '', 4217: '', 4663: '', 1: '',
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

interface TaskStep {
  id: ActionId;
  label: string;
  method: string;
  args: unknown[];
  isRepeatable?: boolean;
}

const DAILY_TASKS: TaskStep[] = [
  { id: 'checkIn', label: 'Daily Check-In', method: 'dailyCheckIn', args: [] },
  { id: 'reception', label: 'Reception', method: 'reception', args: [] },
  { id: 'gm', label: 'GM', method: 'gm', args: [] },
  { id: 'gn', label: 'GN', method: 'gn', args: [] },
  { id: 'dose', label: 'Take Dose', method: 'takeDose', args: [] },
  { id: 'mood', label: 'Mood Check', method: 'moodCheck', args: ['happy'] },
  { id: 'sanitize', label: 'Sanitize Wallet', method: 'sanitizeWallet', args: [] },
  { id: 'counter', label: 'Counter', method: 'incrementCounter', args: [] },
  { id: 'spin', label: 'Lucky Spin', method: 'luckySpin', args: [] },
];

type TaskStatus = 'pending' | 'signing' | 'confirmed' | 'failed' | 'skipped';

interface TaskProgress {
  status: TaskStatus;
  txHash?: string;
  error?: string;
}

const THEMES = [
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'midnight', label: 'Midnight', icon: '🌌' },
  { id: 'forest', label: 'Forest', icon: '🌿' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

function getInitialTheme(): ThemeId {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nikbase-theme');
    if (stored && THEMES.some(t => t.id === stored)) return stored as ThemeId;
  }
  return 'dark';
}

function ThemeSwitcher({ current, onChange }: { current: ThemeId; onChange: (t: ThemeId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] hover:bg-[var(--bg-strong)] transition-all duration-200 text-sm"
        title={`Theme: ${current}`}>
        {THEMES.find(t => t.id === current)?.icon}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 z-20 w-36 py-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => { onChange(t.id); setOpen(false); }}
                className={cn('w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
                  current === t.id ? 'bg-[var(--bg-strong)] text-[var(--text-bright)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-subtle)]'
                )}>
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
                {current === t.id && <span className="ml-auto text-xs text-[var(--accent)]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NetworkBlock({
  network,
  isConnected,
  walletChainId,
  progress,
  onStart,
  isSelected,
  isDisabled,
}: {
  network: NetworkConfig;
  isConnected: boolean;
  walletChainId?: number;
  progress: number;
  onStart: () => void;
  isSelected: boolean;
  isDisabled: boolean;
}) {
  const contractAddr = CONTRACTS[network.id];
  const hasContract = !!contractAddr;
  const completed = progress >= 9;

  const canInteract = hasContract && !completed && !isDisabled;

  return (
    <div
      onClick={canInteract ? onStart : undefined}
      className={cn(
        'p-6 rounded-xl bg-[var(--bg-card)] border transition-all duration-200',
        isSelected
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
          : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
        isDisabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer',
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div dangerouslySetInnerHTML={{ __html: network.logo }} style={{ width: 28, height: 28 }} />
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-bright)]">{network.name}</h3>
          <p className="text-xs text-[var(--text-tertiary)]">{getNativeSymbol(network)}</p>
        </div>
        <span className={cn(
          'ml-auto px-2.5 py-1 rounded-md text-xs font-medium',
          completed ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
        )}>
          {completed ? '9/9 ✓' : `${progress}/9`}
        </span>
      </div>

      {!isConnected ? (
        <button onClick={(e) => { e.stopPropagation(); onStart(); }}
          className="w-full py-2 rounded-lg bg-[var(--bg-strong)] border border-[var(--border-strong)] hover:bg-[var(--bg-strong-hover)] text-sm font-medium text-[var(--text-bright)] transition-all duration-200">
          Start Daily Tasks
        </button>
      ) : !hasContract ? (
        <p className="text-xs text-[var(--text-quaternary)]">Not deployed</p>
      ) : completed ? (
        <p className="text-xs text-[var(--success)]">Completed today</p>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); onStart(); }}
          disabled={isDisabled}
          className={cn(
            'w-full py-2 rounded-lg text-sm font-medium transition-all duration-200',
            'bg-[var(--bg-strong)] border border-[var(--border-strong)] hover:bg-[var(--bg-strong-hover)] text-[var(--text-bright)]',
            isDisabled ? 'opacity-40 cursor-not-allowed' : '',
          )}>
          Start Daily Tasks
        </button>
      )}
    </div>
  );
}

function SequentialTaskPanel({
  network,
  onClose,
  address,
  contractAddress,
  onComplete,
  autoStart,
}: {
  network: NetworkConfig;
  onClose: () => void;
  address: `0x${string}`;
  contractAddress: `0x${string}`;
  onComplete: () => void;
  autoStart?: boolean;
}) {
  const [tasks, setTasks] = useState<TaskProgress[]>(() => DAILY_TASKS.map(() => ({ status: 'pending' })));
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const isCancelled = useRef(false);

  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  const completedCount = tasks.filter(t => t.status === 'confirmed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  const startFrom = tasks.findIndex(t => t.status === 'pending');

  const execute = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    isCancelled.current = false;

    const startIdx = tasks.findIndex(t => t.status === 'pending');
    if (startIdx === -1) { setIsExecuting(false); return; }

    for (let i = startIdx; i < DAILY_TASKS.length; i++) {
      if (isCancelled.current) break;

      setCurrentIndex(i);
      setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'signing' as TaskStatus } : t));

      const step = DAILY_TASKS[i];
      let moods = ['happy', 'happy', 'happy'];
      let actualArgs = step.args;
      if (step.id === 'mood') {
        const moodIndex = i - 7;
        actualArgs = [moods[moodIndex]];
      }

      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: NIKBASE_ABI,
          functionName: step.method,
          args: actualArgs,
        });

        setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, txHash: hash } : t));

        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, timeout: 120_000 });
        if (receipt.status === 'reverted') {
          setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'failed' as TaskStatus, error: 'Transaction reverted' } : t));
          break;
        }

        setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'confirmed' as TaskStatus } : t));
      } catch (err: any) {
        const msg = parseTxError(err);
        if (msg.toLowerCase().includes('rejected')) {
          setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'pending' as TaskStatus, error: 'Rejected — can resume' } : t));
        } else {
          setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'failed' as TaskStatus, error: msg } : t));
        }
        break;
      }
    }

    setIsExecuting(false);
    setCurrentIndex(null);
    const allDone = tasks.every(t => t.status === 'confirmed');
    if (allDone) onComplete();
  }, [contractAddress, writeContractAsync, tasks, isExecuting, onComplete]);

  const executeRef = useRef<() => Promise<void>>();
  executeRef.current = execute;

  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => {
        executeRef.current?.();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  const handleCancel = () => {
    if (isExecuting) {
      isCancelled.current = true;
    } else {
      onClose();
    }
  };

  const StatusIcon = ({ status }: { status: TaskStatus }) => {
    switch (status) {
      case 'confirmed': return <span className="text-[var(--success)]">✓</span>;
      case 'failed': return <span className="text-[var(--danger)]">✗</span>;
      case 'signing': return <span className="text-[var(--accent)] animate-pulse">◆</span>;
      default: return <span className="text-[var(--text-faint)]">○</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={handleCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-5 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2.5">
                <div dangerouslySetInnerHTML={{ __html: network.logo }} style={{ width: 20, height: 20 }} />
                <h2 className="text-base font-semibold text-[var(--text-bright)]">{network.name}</h2>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Daily Tasks · {completedCount}/9</p>
            </div>
            <div className="flex items-center gap-3">
              {failedCount > 0 && !isExecuting && (
                <button onClick={execute}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-all duration-200">
                  Resume
                </button>
              )}
              {completedCount === 0 && !isExecuting && startFrom === 0 && (
                <button onClick={execute}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-all duration-200">
                  Start
                </button>
              )}
              <button onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-strong)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-strong-hover)] transition-all duration-200">
                {isExecuting ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1">
            {DAILY_TASKS.map((step, i) => {
              const p = tasks[i];
              const isActive = i === currentIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 my-0.5 transition-all duration-200',
                    isActive && p.status === 'signing' ? 'bg-[var(--accent-muted)] border border-[var(--border-default)]' : '',
                    p.status === 'confirmed' ? 'opacity-60' : '',
                    p.status === 'failed' ? 'bg-[var(--danger)]/5' : '',
                  )}
                >
                  <div className="w-5 text-center text-sm">
                    <StatusIcon status={p.status} />
                  </div>
                  <span className={cn(
                    'flex-1 text-sm',
                    p.status === 'confirmed' ? 'text-[var(--text-tertiary)]' : isActive ? 'text-[var(--text-bright)] font-medium' : 'text-[var(--text-secondary)]'
                  )}>
                    {step.label}
                  </span>
                  {p.status === 'signing' && (
                    <span className="text-xs text-[var(--accent)]">Waiting for signature...</span>
                  )}
                  {p.status === 'confirmed' && p.txHash && (
                    <a href={getExplorerUrl(network, p.txHash)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] underline underline-offset-2 transition-colors">
                      {shortenHash(p.txHash)}
                    </a>
                  )}
                  {p.status === 'failed' && p.error && (
                    <span className="text-xs text-[var(--danger)] max-w-[200px] truncate" title={p.error}>{p.error}</span>
                  )}
                </div>
              );
            })}
          </div>

          {completedCount === DAILY_TASKS.length && (
            <div className="p-5 pt-3 border-t border-[var(--border-subtle)]">
              <div className="px-4 py-3 rounded-lg bg-[var(--success)]/10 text-sm text-[var(--success)] text-center">
                All 9 tasks completed
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme);
  const [showFaq, setShowFaq] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [panelAutoStart, setPanelAutoStart] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [executingNetworkId, setExecutingNetworkId] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nikbase-theme', theme);
  }, [theme]);

  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const validatedAddr = address && isAddr(address) ? address as `0x${string}` : undefined;

  const allNetworks = [...mainnetNetworks, ...testnetNetworks];
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});

  const targetContract = selectedNetwork ? (CONTRACTS[selectedNetwork.id] || undefined) : undefined;
  const validatedContract = targetContract && isAddr(targetContract) ? targetContract as `0x${string}` : undefined;
  const onRightChain = selectedNetwork ? chainId === selectedNetwork.id : false;

  const { data: countsData, refetch: refetchCounts } = useReadContract({
    address: validatedContract,
    abi: NIKBASE_ABI, functionName: 'getActionCounts',
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedContract && !!validatedAddr && onRightChain, refetchInterval: 10_000 },
  });

  const { data: flagsData, refetch: refetchFlags } = useReadContract({
    address: validatedContract, abi: NIKBASE_ABI, functionName: 'getFlags',
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedContract && !!validatedAddr && onRightChain, refetchInterval: 10_000 },
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: validatedContract, abi: NIKBASE_ABI, functionName: 'getUserData',
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedContract && !!validatedAddr && onRightChain },
  });

  const streak = userData ? Number(userData[0]) : 0;
  const totalActions = userData ? Number(userData[2]) : 0;
  const actionCount = countsData ? Number(countsData[0]) : 0;

  const nftAddress = selectedNetwork ? (SOULBOUND_ADDR[selectedNetwork.id] || undefined) : undefined;
  const validatedNft = nftAddress && isAddr(nftAddress) ? nftAddress as `0x${string}` : undefined;

  const { data: nftTokenId } = useReadContract({
    address: validatedNft, abi: SOULBOUND_ABI, functionName: 'userTokenId',
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedNft && !!validatedAddr && onRightChain },
  });
  const hasNft = nftTokenId !== undefined && nftTokenId > 0;

  const { data: nftData } = useReadContract({
    address: validatedNft, abi: SOULBOUND_ABI, functionName: 'tokenData',
    args: hasNft && nftTokenId ? [nftTokenId] : undefined,
    query: { enabled: hasNft && !!validatedNft && !!nftTokenId },
  });

  const nftTier = nftData ? Number(nftData[0]) : 0;
  const nftStreak = nftData ? Number(nftData[1]) : 0;

  const { writeContract: writeMint, isPending: mintPending } = useWriteContract();
  const { writeContract: writeUpgrade, isPending: upgradePending } = useWriteContract();

  const handleMint = useCallback(() => {
    if (!validatedNft || !validatedAddr) return;
    writeMint({ address: validatedNft, abi: SOULBOUND_ABI, functionName: 'mint' });
  }, [validatedNft, validatedAddr, writeMint]);

  const handleUpgrade = useCallback(() => {
    if (!validatedNft || !validatedAddr) return;
    writeUpgrade({ address: validatedNft, abi: SOULBOUND_ABI, functionName: 'upgrade' });
  }, [validatedNft, validatedAddr, writeUpgrade]);

  const handleOpenNetwork = useCallback(async (network: NetworkConfig) => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    setSelectedNetwork(network);

    if (chainId !== network.id) {
      try {
        await switchChainAsync({ chainId: network.id });
      } catch {
        return;
      }
    }

    setShowTaskPanel(true);
    setPanelAutoStart(true);
    setExecutingNetworkId(network.id);
  }, [isConnected, chainId, switchChainAsync, openConnectModal]);

  const handleTaskComplete = useCallback(() => {
    refetchCounts();
    refetchFlags();
    refetchUser();
    setRefetchTrigger(t => t + 1);
    setExecutingNetworkId(null);
  }, [refetchCounts, refetchFlags, refetchUser]);

  const handleClosePanel = useCallback(() => {
    setShowTaskPanel(false);
    setSelectedNetwork(null);
    setPanelAutoStart(false);
    setExecutingNetworkId(null);
  }, []);

  const knownProgress = selectedNetwork && onRightChain ? actionCount : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <img src="/logos/ogo.png" alt="OGO" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-base font-semibold text-[var(--text-bright)]">DGDreams</h1>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">A minimal multi-chain Web3 task hub. Execute daily on-chain actions across networks in one place.</p>
              <a href="https://dgdreamss95.online" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors mt-0.5 inline-block">dgdreamss95.online</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher current={theme} onChange={setTheme} />
            <button onClick={() => openConnectModal?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-strong)] border border-[var(--border-strong)] hover:bg-[var(--bg-strong-hover)] transition-all duration-200 text-sm font-medium text-[var(--text-bright)]">
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {isConnected ? `${address?.slice(0, 5)}...${address?.slice(-3)}` : 'Connect Wallet'}
            </button>
          </div>
        </header>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-2xl">🔗</div>
            <p className="text-base text-[var(--text-tertiary)]">Connect your wallet to start</p>
            <button onClick={() => openConnectModal?.()}
              className="px-6 py-2.5 rounded-lg bg-[var(--bg-strong)] border border-[var(--border-strong)] hover:bg-[var(--bg-strong-hover)] text-sm font-medium text-[var(--text-bright)] transition-all duration-200">
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="flex gap-8">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--text-bright)] mb-4 uppercase tracking-wider">Mainnet</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {mainnetNetworks.map((net) => {
                  const p = selectedNetwork?.id === net.id && onRightChain ? actionCount : 0;
                  return (
                    <NetworkBlock
                      key={net.id}
                      network={net}
                      isConnected={isConnected}
                      walletChainId={chainId}
                      progress={p}
                      onStart={() => handleOpenNetwork(net)}
                      isSelected={selectedNetwork?.id === net.id}
                      isDisabled={executingNetworkId !== null && executingNetworkId !== net.id}
                    />
                  );
                })}
              </div>
              <h2 className="text-sm font-semibold text-[var(--text-bright)] mb-4 uppercase tracking-wider text-[var(--accent)]">Testnet</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {testnetNetworks.map((net) => {
                  const p = selectedNetwork?.id === net.id && onRightChain ? actionCount : 0;
                  return (
                    <NetworkBlock
                      key={net.id}
                      network={net}
                      isConnected={isConnected}
                      walletChainId={chainId}
                      progress={p}
                      onStart={() => handleOpenNetwork(net)}
                      isSelected={selectedNetwork?.id === net.id}
                      isDisabled={executingNetworkId !== null && executingNetworkId !== net.id}
                    />
                  );
                })}
              </div>
            </div>

            {selectedNetwork && (
              <div className="w-72 shrink-0">
                <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] sticky top-8">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div dangerouslySetInnerHTML={{ __html: selectedNetwork.logo }} style={{ width: 24, height: 24 }} />
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-bright)]">{selectedNetwork.name}</h3>
                      <p className="text-xs text-[var(--text-tertiary)]">{streak > 0 ? `Streak: ${streak}` : 'No streak'}</p>
                    </div>
                  </div>

                  {streak >= 7 && validatedNft && (
                    <div className="mb-4 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{hasNft ? TIER_INFO[nftTier]?.icon : '🎫'}</span>
                        <div className="text-xs">
                          {hasNft ? (
                            <p className="text-[var(--text-secondary)]">{TIER_INFO[nftTier]?.label} · {nftStreak}d</p>
                          ) : (
                            <p className="text-[var(--text-secondary)]">Mint available</p>
                          )}
                        </div>
                      </div>
                      {!hasNft && streak >= 7 && (
                        <button onClick={handleMint} disabled={mintPending}
                          className="mt-2 w-full py-1.5 rounded-lg bg-[var(--bg-strong)] text-xs font-medium text-[var(--text-bright)] hover:bg-[var(--bg-strong-hover)] transition-all duration-200 disabled:opacity-40">
                          {mintPending ? 'Minting...' : 'Mint NFT'}
                        </button>
                      )}
                      {hasNft && streak > nftStreak && (
                        <button onClick={handleUpgrade} disabled={upgradePending}
                          className="mt-2 w-full py-1.5 rounded-lg bg-[var(--bg-strong)] text-xs font-medium text-[var(--text-bright)] hover:bg-[var(--bg-strong-hover)] transition-all duration-200 disabled:opacity-40">
                          {upgradePending ? 'Upgrading...' : 'Upgrade'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-[var(--text-tertiary)] space-y-1.5">
                    <div className="flex justify-between">
                      <span>Daily progress</span>
                      <span className="text-[var(--text-bright)] font-medium">{actionCount}/9</span>
                    </div>
                    {onRightChain && validatedContract && (
                      <div className="flex justify-between">
                        <span>Gas</span>
                        <span className="text-[var(--text-secondary)]">{getNativeSymbol(selectedNetwork)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-6 text-sm">
          <button onClick={() => setShowFaq(!showFaq)}
            className="text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors underline underline-offset-2">FAQ</button>
          <button onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors underline underline-offset-2">Disclaimer</button>
        </div>

        {showFaq && (
          <div className="mt-6 p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h3 className="text-base font-semibold text-[var(--text-bright)] mb-4">FAQ</h3>
            <div className="space-y-4 text-sm text-[var(--text-secondary)]">
              <div><p className="text-[var(--text-bright)] font-medium mb-1">What is DGDreams?</p><p>Complete daily actions (Check-In, GM, GN, etc.) to build a streak and earn rewards.</p></div>
              <div><p className="text-[var(--text-bright)] font-medium mb-1">Which wallets?</p><p>MetaMask, Rainbow, Coinbase Wallet, or any WalletConnect wallet.</p></div>
              <div><p className="text-[var(--text-bright)] font-medium mb-1">How does the streak work?</p><p>Daily Check-In resets every 24h. Maintain streak to mint Soulbound NFTs.</p></div>
            </div>
          </div>
        )}

        {showDisclaimer && (
          <div className="mt-6 p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <h3 className="text-base font-semibold text-[var(--text-bright)] mb-4">Risk Disclaimer</h3>
            <div className="text-sm text-[var(--text-secondary)] space-y-3">
              <p>All transactions are irreversible. You are responsible for your wallet and private keys. Smart contract risks exist — use at your own risk.</p>
              <p className="text-[var(--text-quaternary)]">By continuing, you accept these terms.</p>
            </div>
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-quaternary)]">
          <span>NikBase v3.0.0</span>
          <a href="https://github.com/Misagh95" target="_blank" rel="noopener noreferrer" className="text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors group relative" title="View on GitHub">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-[var(--bg-strong)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">View on GitHub</span>
          </a>
        </footer>
      </div>

      {showTaskPanel && selectedNetwork && validatedContract && validatedAddr && (
        <SequentialTaskPanel
          network={selectedNetwork}
          onClose={handleClosePanel}
          address={validatedAddr}
          contractAddress={validatedContract}
          onComplete={handleTaskComplete}
          autoStart={panelAutoStart}
        />
      )}
    </div>
  );
}
