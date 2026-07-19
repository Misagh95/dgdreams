# DGDreams

A minimal multi-chain Web3 task hub for executing daily on-chain actions across 12 EVM networks.

**Live app:** [dgdreamss95.online](https://dgdreamss95.online)

## Overview

DGDreams lets you complete a set of 9 sequential daily tasks — check-in, reception, GM, GN, take dose, mood check, sanitize wallet, increment counter, and lucky spin — on any supported network. Each network tracks its own streak and progress independently.

Start by clicking any network block, approve the network switch in MetaMask, and the task panel opens automatically. Each transaction fires one at a time with its own MetaMask confirmation. Cancel anytime and resume from the failed step.

## Supported Networks

| Mainnet | Chain ID | Testnet | Chain ID |
|---------|----------|---------|----------|
| Ethereum | 1 | Sepolia | 11155111 |
| Base | 8453 | Base Sepolia | 84532 |
| HyperEVM | 999 | | |
| Unichain | 130 | | |
| Tempo | 4217 | | |
| Robinhood Chain | 4663 | | |

## Smart Contracts

| Contract | Description |
|----------|-------------|
| **NikBase** (v3.0.0) | Core contract with 9 individual task functions + `executeDailyTasks()` batch. Uses OpenZeppelin ReentrancyGuard. |
| **NikSoulbound** | ERC-721 soulbound NFT minted based on daily streak milestones. |

Both contracts are written in Solidity 0.8.24, compiled with viaIR + Cancun EVM, and deployed via Hardhat.

### NikBase Deployments

Deployer: `0xD580B2E3fE288fEC6D2Af2022EB6265B46C40231`

| Chain | Address |
|-------|---------|
| Ethereum | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| Base | `0xbB123f450822A42AeDa8e71aF3534d7dc84627F7` |
| HyperEVM | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |
| Unichain | `0xC288b68022e752d97E4395ECbA61C2079CE692Ad` |
| Tempo | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Robinhood Chain | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| Sepolia | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Base Sepolia | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |

## Features

- **9 sequential daily tasks** — one MetaMask popup per step, async/await loop with resume support
- **Auto network switch** — calls `wallet_switchEthereumChain` with `wallet_addEthereumChain` fallback
- **Active state highlighting** — selected network block stays visually active; others are disabled while tasks run
- **Streak tracking** — maintain daily progress across sessions
- **4 themes** — Dark, Light, Midnight, Forest; pure CSS custom properties, no runtime
- **Minimal design** — dark base (`#111217`), card surface (`#181a20`), Inter font, zero gradients

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Web3 | wagmi v2, RainbowKit, viem |
| Contracts | Solidity 0.8.24, OpenZeppelin v5 |
| Tooling | Hardhat, Hardhat Verify (Blockscout) |
| Deployment | Vercel (frontend), Hardhat (contracts) |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Compile contracts
npx hardhat compile

# Deploy NikBase (set DEPLOYER_PRIVATE_KEY in .env)
npx hardhat run scripts/deploy.cjs --network <network-name>

# Deploy NikSoulbound
npx hardhat run scripts/deploySoulbound.cjs --network <network-name>

# Verify contract on Blockscout
npx hardhat verify --network <network-name> <contract-address>

# Build for production
npm run build
```

## Project Structure

```
src/
├── App.tsx                  # Main app: network blocks + task panel
├── main.tsx                 # Wagmi + RainbowKit providers
├── index.css                # Theme system (4 themes, no gradients)
├── config/
│   └── chains.ts            # 12 EVM network definitions
├── hooks/
│   └── useSafeContractWrite.ts
├── utils/
│   ├── cn.ts                # className utility
│   └── transactions.ts      # Error parsing, explorer URLs
contracts/
├── NikBase.sol              # Core daily tasks (v3.0.0)
└── NikSoulbound.sol         # Soulbound NFT
scripts/
├── deploy.cjs               # NikBase deployment script
└── deploySoulbound.cjs      # NikSoulbound deployment script
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |
| `DEPLOYER_PRIVATE_KEY` | Deploy only | Private key for contract deployment (never committed) |

## License

MIT
