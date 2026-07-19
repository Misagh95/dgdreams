require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun" },
  },
  etherscan: {
    apiKey: { robinhood: "no-key-required" },
    customChains: [
      {
        network: "robinhood",
        chainId: 4663,
        urls: { apiURL: "https://robinhoodchain.blockscout.com/api", browserURL: "https://robinhoodchain.blockscout.com" },
      },
    ],
  },
  networks: {
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    hyperevm: {
      url: "https://rpc.hyperliquid.xyz/evm",
      chainId: 999,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    unichain: {
      url: "https://mainnet.unichain.org",
      chainId: 130,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    tempo: {
      url: "https://rpc.tempo.xyz",
      chainId: 4217,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    robinhood: {
      url: "https://rpc.mainnet.chain.robinhood.com",
      chainId: 4663,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    ethereum: {
      url: "https://eth.drpc.org",
      chainId: 1,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    giwaSepolia: {
      url: "https://sepolia-rpc.giwa.io",
      chainId: 91342,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    liteforge: {
      url: "https://liteforge.rpc.caldera.xyz/http",
      chainId: 4441,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    arcTest: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    simpleChain: {
      url: "https://prod-simple-abroad.qukuaicunzheng.top/rpc/",
      chainId: 1913,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

module.exports = config;
