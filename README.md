<div align="center">
  <img src="public/logo.svg" alt="DGDreams Logo" width="80" />
  <h1 align="center">DGDreams — Web3 Space Terminal</h1>
  <p align="center">
    Multi-chain daily task dashboard with <strong>14 networks</strong> • GenLayer AI contracts • NFT soulbound streaks
  </p>
  <p align="center">
    <a href="https://dgdreams.space" target="_blank"><strong>🌐 Live Site</strong></a>
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

## GenLayer Contracts

Intelligent Contracts written in Python and deployed on GenLayer Bradbury testnet. All contracts use real UTC time fetched via `gl.nondet.web.render("https://worldtimeapi.org/api/timezone/Etc/UTC")` with `gl.eq_principle.strict_eq` consensus.

### NikBase — Daily Check-In & Activity Tracker

[`genlayer-contracts/nikbase_genlayer.py`](genlayer-contracts/nikbase_genlayer.py)

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class NikBase(gl.Contract):
    store: str

    def _now(self) -> int:
        def fetch_time() -> str:
            raw = gl.nondet.web.render("https://worldtimeapi.org/api/timezone/Etc/UTC", mode="text")
            ...
        return int(gl.eq_principle.strict_eq(fetch_time))

    def _today(self) -> int:
        return self._now() // 86400

    @gl.public.write
    def dailyCheckIn(self) -> str: ...
    @gl.public.write
    def gm(self) -> None: ...
    @gl.public.write
    def gn(self) -> None: ...
```

Tracks daily on-chain actions (`gm`, `gn`, `checkIn`, `dose`, `mood`, `sanitize`, `counter`, `spin`) using real UTC time. Each action type can only be performed once per UTC day — enforced by comparing `_today()` against the stored `lastActionDay` per user.

### AI Price Oracle

[`genlayer-contracts/price_oracle.py`](genlayer-contracts/price_oracle.py)

Fetches live cryptocurrency prices from the Binance API using GenLayer's AI-validator consensus — 5 independent validators fetch the data and agree on the result via `gl.eq_principle.prompt_comparative` with 1% tolerance before it's written on-chain.

```python
class PriceOracle(gl.Contract):
    store: str

    @gl.public.view
    def getPrice(self, symbol: str) -> str: ...

    @gl.public.view
    def isFresh(self, symbol: str, max_age_seconds: int) -> str:
        # Returns {"fresh": bool, "age": int, "max_age": int}

    @gl.public.write
    def fetchPrice(self, symbol: str) -> typing.Any:
        def fetch() -> str:
            raw = gl.nondet.web.render(
                f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}USDT",
                mode="text"
            )
        result = gl.eq_principle.prompt_comparative(
            fetch,
            "Two prices are equivalent if they are for the same symbol and the price values differ by less than 1%."
        )
        parsed = json.loads(str(result))
        parsed["updated_at"] = self._now()           # freshness timestamp
        data[symbol] = parsed
        self.store = json.dumps(data, sort_keys=True)
```

**Flow**:
1. User clicks "Fetch BTC/USDT" on the frontend
2. Contract calls `gl.nondet.web.render()` — each validator independently fetches Binance
3. `gl.eq_principle.prompt_comparative()` ensures validators agree within 1% tolerance
4. Agreed price + `updated_at` timestamp is stored on-chain
5. `isFresh(symbol, max_age_seconds)` view method checks whether stored data is still fresh

**Page**: [`/genlayer-oracle`](https://dgdreams.space/genlayer-oracle) — switch to GenLayer, select a symbol, and fetch

### Prediction Market

[`genlayer-contracts/prediction_market.py`](genlayer-contracts/prediction_market.py)

A decentralized prediction market contract supporting conditional outcome resolution via direct web fetching or via the PriceOracle contract.

```python
class PredictionMarket(gl.Contract):
    store: str

    @gl.public.write
    def createMarket(self, question: str, source_url: str, target_value: str, condition: str, resolves_at: int) -> int: ...

    @gl.public.write
    def predict(self, market_id: int, outcome: int, amount: int) -> str: ...

    @gl.public.write
    def resolveMarket(self, market_id: int, oracle_addr: str = "") -> str:
        # Direct resolution: validators fetch source_url and reach strict_eq consensus on outcome
        # Optionally accepts oracle_addr for audit trail

    @gl.public.write
    def resolveWithOracle(self, market_id: int, oracle_addr: str, symbol: str, max_age: int) -> str:
        # Oracle-mediated resolution:
        #   1. Checks oracle.isFresh(symbol, max_age) — rejects if stale
        #   2. Calls oracle.getPrice(symbol) for the current price
        #   3. Resolves market by comparing price against target_value/condition
        #   4. Stores oracle price + freshness info for audit trail
```

Two resolution modes:
- **`resolveMarket`** — validators directly fetch the market's `source_url` and reach consensus via `strict_eq`. The optional `oracle_addr` parameter stores a reference for audit purposes.
- **`resolveWithOracle`** — resolves via a PriceOracle contract. First checks freshness via `isFresh(symbol, max_age)`, then fetches the price and resolves the market. Rejects stale data with an error message.

---

> ⚠️ GenLayer uses **Python** (not Solidity) and a non-EVM runtime. Contract interactions go through `genlayer-js`, not wagmi/viem.

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
    <a href="https://dgdreams.space">dgdreams.space</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/GenLayer-Bradbury-00D4FF?style=social&logo=python" />
  </p>
</div>
