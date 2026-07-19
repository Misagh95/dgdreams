# DGDreams

A minimal multi-chain Web3 task hub. Execute daily on-chain actions across supported networks in one place.

## Overview

DGDreams lets you complete a set of daily on-chain tasks — check-in, reception, GM, GN, take dose, mood check, sanitize wallet, counter, and lucky spin — across 12 EVM networks (6 mainnets + 6 testnets). Each network runs independently with its own streak and progress tracking.

**Live app:** [dgdreamss95.online](https://dgdreamss95.online)

## Features

- **One-click daily routine** — 9 sequential transactions per network, one MetaMask confirmation at a time
- **Multi-chain** — Base, HyperEVM, Unichain, Tempo, Robinhood Chain, Ethereum + 6 testnets
- **Auto network switch** — clicks `wallet_switchEthereumChain` with `wallet_addEthereumChain` fallback
- **Streak tracking** — maintain daily check-ins to mint and upgrade Soulbound NFTs
- **Resume support** — cancel mid-flow and resume from the failed step
- **4 themes** — Dark, Light, Midnight, Forest

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `NikBase` (v3.0.0) | Core daily tasks contract with `executeDailyTasks()` and 9 individual action functions |
| `NikSoulbound` | ERC-721 soulbound NFT minted based on streak milestones |

Both contracts use OpenZeppelin (`ReentrancyGuard`, `ERC721`) and are deployed on all supported chains via Hardhat.

### Deployed addresses

Deployer: `0xD580B2E3fE288fEC6D2Af2022EB6265B46C40231`

| Chain | NikBase |
|-------|---------|
| Ethereum | `0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B` |
| Base | `0xbB123f450822A42AeDa8e71aF3534d7dc84627F7` |
| HyperEVM | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |
| Unichain | `0xC288b68022e752d97E4395ECbA61C2079CE692Ad` |
| Tempo | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Sepolia | `0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff` |
| Base Sepolia | `0xdbeE9eA39FedD197D224EA7520A20b4434635A6a` |

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Web3:** wagmi v2 + RainbowKit + viem
- **Backend:** Solidity 0.8.24 + Hardhat + OpenZeppelin
- **Deployment:** Vercel (frontend) + Hardhat (contracts)

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Compile contracts
npx hardhat compile

# Deploy contracts (set DEPLOYER_PRIVATE_KEY in .env)
npx hardhat run scripts/deploy.cjs --network <network-name>

# Build for production
npm run build
```

## Project Structure

```
src/
├── App.tsx              # Main app component
├── index.css            # Global styles + theme system
├── main.tsx             # Entry point with Wagmi + RainbowKit
├── config/
│   └── chains.ts        # Network definitions
├── utils/
│   ├── cn.ts            # className merge utility
│   └── transactions.ts  # Error parsing, explorer URLs
├── hooks/
│   └── useSafeContractWrite.ts
contracts/
├── NikBase.sol          # Core daily tasks contract
├── NikSoulbound.sol     # Soulbound NFT contract
scripts/
├── deploy.cjs           # NikBase deployment
└── deploySoulbound.cjs  # NikSoulbound deployment
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |
| `DEPLOYER_PRIVATE_KEY` | For deploy | Private key for contract deployment |

## License

MIT
