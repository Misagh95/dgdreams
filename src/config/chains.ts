import { defineChain } from 'viem';
import { mainnet, sepolia, baseSepolia } from 'viem/chains';

export const baseChain = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde0597b8555f4a7ec17267c99638af8c64e',
      blockCreated: 2825271,
    },
  },
});

export const hyperEvmChain = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { decimals: 18, name: 'Hyperliquid', symbol: 'HYPE' },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVMScan', url: 'https://hyperevmscan.io' },
  },
});

export const unichainChain = defineChain({
  id: 130,
  name: 'Unichain',
  nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://mainnet.unichain.org'] },
    public: { http: ['https://mainnet.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Uniscan', url: 'https://uniscan.xyz' },
  },
});

export const tempoChain = defineChain({
  id: 4217,
  name: 'Tempo',
  nativeCurrency: { decimals: 18, name: 'USD Stablecoin', symbol: 'USD' },
  rpcUrls: {
    default: { http: ['https://rpc.tempo.xyz'] },
    public: { http: ['https://rpc.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
});

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
    public: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
});

export interface NetworkConfig {
  id: number;
  name: string;
  shortName: string;
  chain: ReturnType<typeof defineChain>;
  color: string;
  glow: string;
  border: string;
  logo: string;
  type?: 'mainnet' | 'testnet';
}

export const mainnetNetworks: NetworkConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    chain: mainnet,
    color: '#8A8AFF',
    glow: 'rgba(138, 138, 255, 0.3)',
    border: '#8A8AFF',
    logo: '<img src="/logos/ethereum.png" alt="Ethereum" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    chain: baseChain,
    color: '#0055FF',
    glow: 'rgba(0, 85, 255, 0.3)',
    border: '#0055FF',
    logo: '<img src="/logos/base.svg" alt="Base" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 999,
    name: 'HyperEVM',
    shortName: 'HYPE',
    chain: hyperEvmChain,
    color: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.3)',
    border: '#00FF88',
    logo: '<img src="/logos/hyperliquid.png" alt="HyperEVM" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 130,
    name: 'Unichain',
    shortName: 'UNI',
    chain: unichainChain,
    color: '#FF0077',
    glow: 'rgba(255, 0, 119, 0.3)',
    border: '#FF0077',
    logo: '<img src="/logos/unichain.png" alt="Unichain" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 4217,
    name: 'Tempo',
    shortName: 'TMP',
    chain: tempoChain,
    color: '#AA66FF',
    glow: 'rgba(170, 102, 255, 0.3)',
    border: '#AA66FF',
    logo: '<img src="/logos/tempo.png" alt="Tempo" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 4663,
    name: 'Robinhood',
    shortName: 'RH',
    chain: robinhoodChain,
    color: '#00BFA6',
    glow: 'rgba(0, 191, 166, 0.3)',
    border: '#00BFA6',
    logo: '<img src="/logos/robinhood.png" alt="Robinhood" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
];

export const testnetNetworks: NetworkConfig[] = [
  {
    id: sepolia.id,
    name: 'Sepolia',
    shortName: 'ETH',
    chain: sepolia,
    color: '#F5A623',
    glow: 'rgba(245, 166, 35, 0.3)',
    border: '#F5A623',
    type: 'testnet',
    logo: '<img src="/logos/ethereum.png" alt="Sepolia" style="width:100%;height:100%;border-radius:6px;object-fit:cover;opacity:0.6" />',
  },
  {
    id: baseSepolia.id,
    name: 'Base Sepolia',
    shortName: 'BASE',
    chain: baseSepolia,
    color: '#0055FF',
    glow: 'rgba(0, 85, 255, 0.3)',
    border: '#0055FF',
    type: 'testnet',
    logo: '<img src="/logos/base.svg" alt="Base Sepolia" style="width:100%;height:100%;border-radius:6px;object-fit:cover;opacity:0.6" />',
  },
  {
    id: 91342,
    name: 'GIWA Sepolia',
    shortName: 'GIWA',
    chain: defineChain({
      id: 91342,
      name: 'GIWA Sepolia',
      nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
      rpcUrls: { default: { http: ['https://sepolia-rpc.giwa.io'] }, public: { http: ['https://sepolia-rpc.giwa.io'] } },
      blockExplorers: { default: { name: 'GIWA Explorer', url: 'https://sepolia.giwa.io' } },
    }),
    color: '#FF6B6B',
    glow: 'rgba(255, 107, 107, 0.3)',
    border: '#FF6B6B',
    type: 'testnet',
    logo: '<img src="/logos/giwa.png" alt="GIWA" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 4441,
    name: 'LitVM Liteforge',
    shortName: 'zkLTC',
    chain: defineChain({
      id: 4441,
      name: 'LitVM Liteforge',
      nativeCurrency: { decimals: 18, name: 'zkLTC', symbol: 'zkLTC' },
      rpcUrls: { default: { http: ['https://liteforge.rpc.caldera.xyz/http'] }, public: { http: ['https://liteforge.rpc.caldera.xyz/http'] } },
      blockExplorers: { default: { name: 'Liteforge Explorer', url: 'https://liteforge.explorer.caldera.xyz' } },
    }),
    color: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.3)',
    border: '#FFD700',
    type: 'testnet',
    logo: '<img src="/logos/litvm.svg" alt="LitVM" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 5042002,
    name: 'ARC Testnet',
    shortName: 'ARC',
    chain: defineChain({
      id: 5042002,
      name: 'ARC Testnet',
      nativeCurrency: { decimals: 18, name: 'ARC', symbol: 'ARC' },
      rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] }, public: { http: ['https://rpc.testnet.arc.network'] } },
      blockExplorers: { default: { name: 'ARC Scan', url: 'https://testnet.arcscan.app' } },
    }),
    color: '#00D4AA',
    glow: 'rgba(0, 212, 170, 0.3)',
    border: '#00D4AA',
    type: 'testnet',
    logo: '<img src="/logos/arc.png" alt="ARC" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
  {
    id: 1913,
    name: 'SimpleChain',
    shortName: 'SIM',
    chain: defineChain({
      id: 1913,
      name: 'SimpleChain',
      nativeCurrency: { decimals: 18, name: 'Simple', symbol: 'SIM' },
      rpcUrls: { default: { http: ['https://prod-simple-abroad.qukuaicunzheng.top/rpc/'] }, public: { http: ['https://prod-simple-abroad.qukuaicunzheng.top/rpc/'] } },
      blockExplorers: { default: { name: 'SimpleChain Explorer', url: 'https://testnet-explorer.simplechain.com' } },
    }),
    color: '#FF8C00',
    glow: 'rgba(255, 140, 0, 0.3)',
    border: '#FF8C00',
    type: 'testnet',
    logo: '<img src="/logos/simplechain.png" alt="SimpleChain" style="width:100%;height:100%;border-radius:6px;object-fit:cover" />',
  },
];

export const networks: NetworkConfig[] = [...mainnetNetworks, ...testnetNetworks];

export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return networks.find(n => n.id === chainId);
}
