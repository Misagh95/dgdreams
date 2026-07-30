import { mainnet, sepolia, baseSepolia } from "viem/chains";
import { defineChain, type Chain } from "viem";

export const giwaSepoliaChain = /*#__PURE__*/ defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: { decimals: 18, name: "Ethereum", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.giwa.io"] },
    public: { http: ["https://sepolia-rpc.giwa.io"] },
  },
  blockExplorers: {
    default: { name: "GIWA Explorer", url: "https://sepolia.giwa.io" },
  },
});

export const liteforgeChain = /*#__PURE__*/ defineChain({
  id: 4441,
  name: "LITVM Liteforge",
  nativeCurrency: { decimals: 18, name: "zkLTC", symbol: "zkLTC" },
  rpcUrls: {
    default: { http: ["https://liteforge.rpc.caldera.xyz/http"] },
    public: { http: ["https://liteforge.rpc.caldera.xyz/http"] },
  },
  blockExplorers: {
    default: {
      name: "Liteforge Explorer",
      url: "https://liteforge.explorer.caldera.xyz",
    },
  },
});

export const arcTestChain = /*#__PURE__*/ defineChain({
  id: 5042002,
  name: "ARC Testnet",
  nativeCurrency: { decimals: 18, name: "ARC", symbol: "ARC" },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ARC Scan", url: "https://testnet.arcscan.app" },
  },
});

export const simpleChain = /*#__PURE__*/ defineChain({
  id: 1913,
  name: "SimpleChain",
  nativeCurrency: { decimals: 18, name: "Simple", symbol: "SIM" },
  rpcUrls: {
    default: {
      http: ["https://prod-simple-abroad.qukuaicunzheng.top/rpc/"],
    },
    public: {
      http: ["https://prod-simple-abroad.qukuaicunzheng.top/rpc/"],
    },
  },
  blockExplorers: {
    default: {
      name: "SimpleChain Explorer",
      url: "https://testnet-explorer.simplechain.com",
    },
  },
});

export const baseChain = /*#__PURE__*/ defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: { decimals: 18, name: "Ethereum", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] },
    public: { http: ["https://mainnet.base.org"] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://base.blockscout.com" },
  },
});

export const hyperEvmChain = /*#__PURE__*/ defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { decimals: 18, name: "HYPE", symbol: "HYPE" },
  rpcUrls: {
    default: { http: ["https://rpc.hyperliquid.xyz/evm"] },
    public: { http: ["https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: { name: "HyperScan", url: "https://hyperscan.xyz" },
  },
});

export const unichainChain = /*#__PURE__*/ defineChain({
  id: 130,
  name: "Unichain",
  nativeCurrency: { decimals: 18, name: "Ethereum", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://mainnet.unichain.org"] },
    public: { http: ["https://mainnet.unichain.org"] },
  },
  blockExplorers: {
    default: { name: "Unichain Explorer", url: "https://unichain.blockscout.com" },
  },
});

export const tempoChain = /*#__PURE__*/ defineChain({
  id: 4217,
  name: "Tempo",
  nativeCurrency: { decimals: 18, name: "TMP", symbol: "TMP" },
  rpcUrls: {
    default: { http: ["https://rpc.tempo.xyz"] },
    public: { http: ["https://rpc.tempo.xyz"] },
  },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: "https://tempo.blockscout.com" },
  },
});

export const robinhoodChain = /*#__PURE__*/ defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { decimals: 18, name: "Ethereum", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
    public: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

export const inkChain = /*#__PURE__*/ defineChain({
  id: 57073,
  name: "Ink",
  nativeCurrency: { decimals: 18, name: "Ethereum", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://rpc-gel.inkonchain.com"] },
    public: { http: ["https://rpc-gel.inkonchain.com"] },
  },
  blockExplorers: {
    default: { name: "Ink Explorer", url: "https://explorer.inkonchain.com" },
  },
});

export const genlayerBradburyChain = /*#__PURE__*/ defineChain({
  id: 4221,
  name: "GenLayer Bradbury",
  nativeCurrency: { decimals: 18, name: "GEN", symbol: "GEN" },
  rpcUrls: {
    default: { http: ["https://rpc-bradbury.genlayer.com"] },
    public: { http: ["https://rpc-bradbury.genlayer.com"] },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: "https://explorer-bradbury.genlayer.com",
    },
  },
});

export interface NetworkConfig {
  id: number;
  name: string;
  shortName: string;
  nativeCurrency: { decimals: number; name: string; symbol: string };
  rpcUrls: { default: { http: string[] }; public: { http: string[] } };
  blockExplorers: { default: { name: string; url: string } };
  logo: string;
  color: string;
  isTestnet?: boolean;
  /** Game2048 contract address on this network */
  game2048Contract?: `0x${string}`;
  /** NikBase contract address on this network */
  nikBaseContract?: `0x${string}`;
  /** CropInsurance contract address on this network */
  cropInsuranceContract?: `0x${string}`;
}

export const GAME2048_CONTRACTS: Record<number, `0x${string}`> = {
  1: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  8453: "0xa4561909Dd4be271Ed26B1f28b4Cf16cfF82fd1f",
  999: "0x6e17E98fF56b12886636fa9Ea3C17E0CD01D9790",
  130: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  4217: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  4663: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  57073: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  91342: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  4441: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  5042002: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  1913: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
};

export const NIKBASE_CONTRACTS: Record<number, `0x${string}`> = {
  1: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  8453: "0xbB123f450822A42AeDa8e71aF3534d7dc84627F7",
  999: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  130: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  4217: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4663: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  57073: "0x68bb9775B11551310D7A37Aae52e6505A0E1e733",
  11155111: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  84532: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  91342: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4441: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  5042002: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  1913: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
};

function makeNetworkConfig(
  chain: Chain,
  overrides: Partial<NetworkConfig>
): NetworkConfig {
  const httpUrls = [...(chain.rpcUrls.default?.http || [])];
  return {
    id: chain.id,
    name: chain.name,
    shortName: overrides.shortName || chain.name.split(" ")[0],
    nativeCurrency: chain.nativeCurrency || {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: { http: httpUrls },
      public: { http: httpUrls },
    },
    blockExplorers: chain.blockExplorers || {
      default: { name: "Explorer", url: "" },
    },
    logo: "",
    color: "#627eea",
    game2048Contract: GAME2048_CONTRACTS[chain.id],
    nikBaseContract: NIKBASE_CONTRACTS[chain.id],
    ...overrides,
  };
}

export const mainnetNetworks: NetworkConfig[] = [
  makeNetworkConfig(baseChain, {
    shortName: "Base",
    color: "#0052FF",
    logo: "/logos/base.svg",
  }),
  makeNetworkConfig(hyperEvmChain, {
    shortName: "HYPE",
    color: "#FF6B6B",
    logo: "/logos/hyperliquid.png",
  }),
  makeNetworkConfig(unichainChain, {
    shortName: "UNI",
    color: "#FC6C85",
    logo: "/logos/unichain.png",
  }),
  makeNetworkConfig(tempoChain, {
    shortName: "TMP",
    color: "#00D4AA",
    logo: "/logos/tempo.png",
  }),
  makeNetworkConfig(robinhoodChain, {
    shortName: "RH",
    color: "#00C805",
    logo: "/logos/robinhood.png",
  }),
  makeNetworkConfig(mainnet, {
    shortName: "ETH",
    color: "#627EEA",
    logo: "/logos/ethereum.png",
  }),
  makeNetworkConfig(inkChain, {
    shortName: "INK",
    color: "#0052FF",
    logo: "/logos/ink.svg",
  }),
];

export const testnetNetworks: NetworkConfig[] = [
  makeNetworkConfig(sepolia, {
    shortName: "SEP",
    color: "#627EEA",
    isTestnet: true,
    logo: "/logos/ethereum.png",
  }),
  makeNetworkConfig(baseSepolia, {
    shortName: "BSEP",
    color: "#0052FF",
    isTestnet: true,
    logo: "/logos/base.svg",
  }),
  makeNetworkConfig(giwaSepoliaChain, {
    shortName: "GIWA",
    color: "#FF6B6B",
    isTestnet: true,
    logo: "/logos/giwa.png",
  }),
  makeNetworkConfig(liteforgeChain, {
    shortName: "LIT",
    color: "#FFD700",
    isTestnet: true,
    logo: "/logos/litvm.png",
  }),
  makeNetworkConfig(arcTestChain, {
    shortName: "ARC",
    color: "#00D4AA",
    isTestnet: true,
    logo: "/logos/arc.png",
  }),
  makeNetworkConfig(simpleChain, {
    shortName: "SIM",
    color: "#FF8C00",
    isTestnet: true,
    logo: "/logos/simplechain.png",
  }),
  makeNetworkConfig(genlayerBradburyChain, {
    shortName: "GEN",
    color: "#110FFF",
    isTestnet: true,
    logo: "/logos/genlayer.svg",
    cropInsuranceContract: "0x5af45E1F050ffe09E7dD9adaeac83a3Ab7081E6a" as `0x${string}`,
  }),
];

export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return [...mainnetNetworks, ...testnetNetworks].find(
    (n) => n.id === chainId
  );
}

export const allChains = [
  mainnet,
  baseChain,
  hyperEvmChain,
  unichainChain,
  tempoChain,
  robinhoodChain,
  inkChain,
  sepolia,
  baseSepolia,
  giwaSepoliaChain,
  liteforgeChain,
  arcTestChain,
  simpleChain,
  genlayerBradburyChain,
];
