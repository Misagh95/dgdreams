<div align="center">
  <img src="public/logo.svg" alt="DGDreams Logo" width="80" />
  <h1 align="center">DGDreams — Web3 Space Terminal</h1>
  <p align="center">
    Multi-chain daily task dashboard with <strong>14 networks</strong> • GenLayer AI contracts • NFT soulbound streaks
  </p>
  <p align="center">
    <a href="https://dgdreamss95.online" target="_blank"><strong>🌐 Live Site</strong></a>
    ·
    <a href="#features"><strong>Features</strong></a>
    ·
    <a href="#architecture"><strong>Architecture</strong></a>
    ·
    <a href="#networks"><strong>Networks</strong></a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&style=flat-square" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&style=flat-square" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Wagmi-2.46-purple?logo=web3dotjs&style=flat-square" alt="Wagmi" />
    <img src="https://img.shields.io/badge/RainbowKit-latest-violet?style=flat-square" alt="RainbowKit" />
    <img src="https://img.shields.io/badge/GenLayer-Bradbury-00D4FF?style=flat-square" alt="GenLayer Bradbury" />
    <img src="https://img.shields.io/badge/Vercel-deployed-success?logo=vercel&style=flat-square" alt="Vercel" />
  </p>
</div>

---

## Overview

**DGDreams** is a unified dashboard where users connect their wallet once and execute daily on-chain tasks across **14 blockchain networks** — Ethereum, Base, HyperEVM, Unichain, Tempo, Robinhood, Ink, and testnets including **GenLayer Bradbury**, LitVM, GIWA, ARC, and SimpleChain.

| Feature | Description |
|---|---|
| 🔁 **One wallet, many chains** | Connect with RainbowKit, switch networks seamlessly |
| ✅ **9 daily tasks per network** | Check-in, GM, GN, Dose, Mood, Spin, Counter, Sanitize, Reception |
| 🧠 **GenLayer AI contracts** | Python-based Intelligent Contract using `genlayer-js` SDK |
| 🏆 **Soulbound NFT streaks** | Mint tiered NFTs (Bronze → Legend) for 7+ day streaks |
| 📊 **Real-time stats** | Per-network action counts, streak tracking, history |

---

## Features

### ✨ Multi-Chain Task Execution

Users can run the same 9 daily tasks on any supported network:

1. **Daily Check-In** — Start the day, build your streak
2. **Reception** — Social onboarding action
3. **GM** — Morning greeting
4. **GN** — Night sign-off
5. **Take Dose** — Daily medication metaphor
6. **Mood Check** — Log your mood (with message)
7. **Sanitize Wallet** — Clean up approvals
8. **Increment Counter** — Simple counter action
9. **Lucky Spin** — RNG-based reward

Each task writes to an on-chain contract that tracks streaks, action counts, and daily resets.

### 🧠 GenLayer Integration

GenLayer is a non-EVM chain using Python-based Intelligent Contracts with AI-validator consensus. This project integrates GenLayer as a first-class network:

- **Contract**: [`NikBase`](genlayer-contracts/nikbase_genlayer.py) — Python Intelligent Contract storing all user data as JSON in a single `str` state field
- **Client**: [`genlayer-js`](https://www.npmjs.com/package/genlayer-js) SDK with MetaMask provider (`window.ethereum`)
- **Read/Write**: Separate code paths via `isGenLayer()` check — wagmi for EVM chains, genlayer-js for GenLayer
- **Address**: [`0x1203ab4E8386220F792f129C605460fD0F52C412`](https://explorer-bradbury.genlayer.com/address/0x1203ab4E8386220F792f129C605460fD0F52C412)

### 🏆 Soulbound NFT Streaks

Networks with a soulbound NFT contract support minting and upgrading:

- **7-day streak** → Mint Bronze NFT
- **Streak milestones** → Upgrade through Silver, Gold, Diamond, Legend tiers
- NFTs are soulbound (non-transferable) and track your longest streak

---

## Architecture

```
src/
├── app/
│   ├── dashboard/       # Network grid overview
│   ├── tasks/           # Daily task execution page
│   ├── 2048/            # Binary milestone game
│   ├── litevm/          # LiteVM playground
│   ├── activity/        # Transaction history
│   ├── profile/         # User profile & NFT view
│   ├── faq/             # Help & documentation
│   └── api/             # Backend API routes
├── components/
│   ├── DailyTaskPanel   # Task execution modal (wagmi + genlayer-js)
│   ├── WalletModal      # Wallet connection UI
│   ├── Sidebar          # Navigation sidebar
│   ├── DashboardLayout  # Shared layout wrapper
│   └── ...
├── config/
│   └── chains.ts        # All 14 chain definitions & NetworkConfig
├── lib/
│   ├── genlayer/
│   │   ├── client.ts    # genlayer-js client factory
│   │   └── tasks.ts     # Write/read helpers for GenLayer
│   └── utils.ts         # Shared utilities
└── db/
    ├── schema.ts        # Drizzle ORM schema
    └── index.ts         # Database client

genlayer-contracts/
└── nikbase_genlayer.py  # Python Intelligent Contract for GenLayer
```

### Data Flow

```
User connects wallet → RainbowKit → wagmi (EVM chains)
                                    └── genlayer-js (GenLayer)
                                           ↓
User selects network → switchChainAsync (wagmi)
                    └── manual wallet switch (GenLayer)
                           ↓
User clicks "Start" → DailyTaskPanel opens
                         ↓
              ┌──── isGenLayer(chainId)? ────┐
              ↓                               ↓
       genLayerWriteTask()           writeContractAsync()
       (genlayer-js SDK)            (wagmi viem)
              ↓                               ↓
       waitForTxReceipt              waitForTransactionReceipt
              ↓                               ↓
         Confirm task              Handle revert / success
```

---

## Networks

### Mainnet
| Network | Chain ID | Currency |
|---|---|---|
| Ethereum | 1 | ETH |
| Base | 8453 | ETH |
| HyperEVM | 999 | HYPE |
| Unichain | 130 | ETH |
| Tempo | 4217 | USD |
| Robinhood | 4663 | ETH |
| Ink | 57073 | ETH |

### Testnet
| Network | Chain ID | Currency |
|---|---|---|
| Sepolia | 11155111 | ETH |
| Base Sepolia | 84532 | ETH |
| GIWA Sepolia | 91342 | ETH |
| LitVM Liteforge | 4441 | zkLTC |
| **GenLayer Bradbury** | **4221** | **GEN** |
| ARC Testnet | 5042002 | ARC |
| SimpleChain | 1913 | SIM |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Misagh95/dgdreams.git
cd dgdreams

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your WalletConnect Project ID to .env.local:
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Run development server
npm run dev
```

### Prerequisites

- **Node.js** >= 18
- **WalletConnect Project ID** — get one at [cloud.walletconnect.com](https://cloud.walletconnect.com)
- **MetaMask** browser extension (for EVM chains + GenLayer via genlayer-js)

---

## GenLayer Contract

The NikBase Intelligent Contract is written in Python and deployed on GenLayer Bradbury testnet:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class NikBase(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    @gl.public.write
    def dailyCheckIn(self) -> str: ...
    @gl.public.write
    def gm(self) -> None: ...
    @gl.public.write
    def gn(self) -> None: ...
    # ... see genlayer-contracts/nikbase_genlayer.py for full code
```

> ⚠️ GenLayer uses **Python** (not Solidity) and a non-EVM runtime. Contract interactions go through `genlayer-js`, not wagmi/viem.

### AI Price Oracle

An Intelligent Contract that fetches live cryptocurrency prices from the Binance API using GenLayer's AI-validator consensus — meaning 5 independent validators each fetch the data and agree on the result before it's written on-chain.

**Contract**: [`PriceOracle`](genlayer-contracts/price_oracle.py)

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class PriceOracle(gl.Contract):
    store: str

    @gl.public.view
    def getPrice(self, symbol: str) -> str: ...

    @gl.public.write
    def fetchPrice(self, symbol: str) -> typing.Any:
        # 1. Each validator fetches price from Binance API
        def fetch() -> str:
            raw = gl.nondet.web.render(
                f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}USDT",
                mode="text"
            )
            ...
        # 2. Validators reach consensus via prompt_comparative
        result = gl.eq_principle.prompt_comparative(
            fetch,
            "Equivalent if same symbol and price within 1%"
        )
        # 3. Agreed price is stored on-chain
        self.store = json.dumps(all_data, sort_keys=True)
```

**Flow**:
1. User clicks "Fetch BTC/USDT" on the frontend
2. Contract calls `gl.nondet.web.render()` — each validator independently fetches Binance
3. `gl.eq_principle.prompt_comparative()` ensures validators agree within 1% tolerance
4. Agreed-upon price is stored on GenLayer and displayed in real-time

**Page**: [`/genlayer-oracle`](https://dgdreamss95.online/genlayer-oracle) — switch to GenLayer, select a symbol, and fetch

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Wallet** | [RainbowKit](https://www.rainbowkit.com/) + [Wagmi 2.x](https://wagmi.sh/) + [Viem](https://viem.sh/) |
| **GenLayer SDK** | [genlayer-js](https://www.npmjs.com/package/genlayer-js) |
| **Database** | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) |
| **Styling** | CSS Variables + Tailwind-like utility classes |
| **Deployment** | [Vercel](https://vercel.com) |
| **Contracts (EVM)** | Solidity (Hardhat) |
| **Contracts (GenLayer)** | Python (GenLayer Studio) |

---

## License

This project is licensed under the MIT License.

---

<div align="center">
  <p>
    Built by <a href="https://github.com/Misagh95">@Misagh95</a>
    ·
    <a href="https://dgdreamss95.online">dgdreamss95.online</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/GenLayer-Bradbury-00D4FF?style=social&logo=python" />
  </p>
</div>
