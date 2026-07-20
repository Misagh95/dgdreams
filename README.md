# DGDreams

A multi-chain Web3 task hub + 2048 game to keep your wallets active across EVM networks.

**Live app:** [dgdreamss95.online](https://dgdreamss95.online)

---

## Overview

DGDreams has two main features:

### 1. Daily Task Hub
Complete 9 sequential on-chain actions (check-in, reception, GM, GN, take dose, mood check, sanitize wallet, increment counter, lucky spin) on any supported network. Each network tracks its own streak independently. Tasks run one at a time with individual MetaMask confirmations — cancel anytime and resume from the failed step.

### 2. 2048 Game
Play the classic [2048 game](https://github.com/gabrielecirulli/2048) (originally by Gabriele Cirulli) with on-chain sync. Each time your score reaches a power-of-2 milestone (16, 32, 64, 128, 256, 512, 1024, 2048), a `recordPlay` transaction is sent to the Game2048 contract on your connected network — keeping your wallet active on-chain while you play.

---

## Supported Networks

| Mainnet | Chain ID | Testnet | Chain ID |
|---------|----------|---------|----------|
| Ethereum | 1 | Sepolia | 11155111 |
| Base | 8453 | Base Sepolia | 84532 |
| HyperEVM | 999 | GIWA Sepolia | 91342 |
| Unichain | 130 | LitVM Liteforge | 4441 |
| Tempo | 4217 | ARC Testnet | 5042002 |
| Robinhood Chain | 4663 | SimpleChain | 1913 |
| Ink | 57073 | | |

---

## Smart Contracts

| Contract | Description |
|----------|-------------|
| **NikBase** (v3.0.0) | Core contract with 9 individual task functions + `executeDailyTasks()` batch. Uses OpenZeppelin ReentrancyGuard. |
| **NikSoulbound** | ERC-721 soulbound NFT minted based on daily streak milestones. |
| **Game2048** | Simple contract with `recordPlay(uint256 score, uint256 moves)` event. |

All contracts in Solidity 0.8.24, compiled with viaIR + Cancun EVM, deployed via Hardhat.

### NikBase Deployments

| Chain | Address |
|-------|---------|
| Ethereum | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| Base | `0xbB123f450822A42AeDa8e71aF3534d7dc84627F7` |
| HyperEVM | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |
| Unichain | `0xC288b68022e752d97E4395ECbA61C2079CE692Ad` |
| Tempo | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Robinhood Chain | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| Ink | `0x68bb9775B11551310D7A37Aae52e6505A0E1e733` |
| Sepolia | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Base Sepolia | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |
| GIWA Sepolia | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| LitVM Liteforge | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| ARC Testnet | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| SimpleChain | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |

### Game2048 Deployments

| Chain | Address |
|-------|---------|
| Base | `0xa4561909Dd4be271Ed26B1f28b4Cf16cfF82fd1f` |
| HyperEVM | `0x6e17E98fF56b12886636fa9Ea3C17E0CD01D9790` |
| Unichain | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |
| Tempo | `0xC288b68022e752d97E4395ECbA61C2079CE692Ad` |
| Robinhood Chain | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Ethereum | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Ink | `0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0` |
| GIWA Sepolia | `0xC288b68022e752d97E4395ECbA61C2079CE692Ad` |
| LitVM Liteforge | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| ARC Testnet | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| SimpleChain | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |

---

## Features

- **9 sequential daily tasks** — one MetaMask popup per step, async/await loop with resume support
- **Auto network switch** — calls `wallet_switchEthereumChain` with `wallet_addEthereumChain` fallback
- **2048 game** — play at `/2048/` with on-chain milestone transactions (powers of 2: 16→2048)
- **Wallet connect/disconnect** — standalone 2048 page with ethers.js, no wagmi dependency
- **Active state highlighting** — selected network stays highlighted while tasks run
- **Streak tracking** — daily progress persists across sessions
- **Transaction history** — view past check-in events with dates and streaks
- **Soulbound NFT** — mint/upgrade based on streak milestones
- **Gas boost** — 50% buffer on priority fee to prevent "Gas price too low" errors
- **4 themes** — Dark, Light, Midnight, Forest; pure CSS custom properties
- **PWA** — service worker + manifest via vite-plugin-pwa
- **Security notice bar** — always verify network and contract before signing

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Web3 | wagmi v2, RainbowKit, viem, ethers.js v5 (2048 page) |
| Contracts | Solidity 0.8.24, OpenZeppelin v5 |
| Tooling | Hardhat, Hardhat Verify (Blockscout) |
| Deployment | Vercel (frontend), Hardhat (contracts) |
| PWA | vite-plugin-pwa (manifest + service worker) |

---

## 2048 Game Attribution

The 2048 game is based on the original [2048 by Gabriele Cirulli](https://github.com/gabrielecirulli/2048), licensed under the MIT License. Modifications include web3 wallet integration, network selection, and on-chain milestone transaction triggers.

---

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

---

## Project Structure

```
src/
├── App.tsx                  # Main app: network blocks, task panel, disclaimer
├── main.tsx                 # Wagmi + RainbowKit providers
├── index.css                # Theme system (4 themes)
├── config/
│   └── chains.ts            # 14 EVM network definitions (7 mainnet + 7 testnet)
├── components/
│   └── Game2048.tsx         # React 2048 component (embedded, unused — uses public/2048/)
├── utils/
│   ├── cn.ts                # className utility
│   └── transactions.ts      # Error parsing, explorer URLs
public/
├── 2048/                    # Standalone 2048 game page
│   ├── index.html           # Full game UI + web3 dashboard
│   ├── blockchain.js        # ethers.js wallet management
│   ├── networks.js          # Network definitions with Game2048 addresses
│   └── game_manager.js      # Game logic
└── logos/                   # Chain logos
contracts/
├── NikBase.sol              # Core daily tasks (v3.0.0)
├── NikSoulbound.sol         # Soulbound NFT
└── Game2048.sol             # 2048 recordPlay contract
scripts/
├── deploy.cjs               # NikBase deployment
├── deploySoulbound.cjs      # NikSoulbound deployment
├── deploy.ts                # Legacy NikBase v2 deployment
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |
| `DEPLOYER_PRIVATE_KEY` | Deploy only | Private key for contract deployment (never committed) |

---

## Security

- Private keys are removed from `.env` after each deployment session
- Content Security Policy enforced via Vercel headers
- Disclaimer modal on first visit with localStorage acceptance
- All transactions require explicit MetaMask confirmation
- Contract address with verified checkmark shown in task panel

---

## License

MIT
