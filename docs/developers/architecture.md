# Architecture

DGDreams is a **Next.js 16** (App Router + Turbopack) application written in TypeScript, with two distinct on-chain backends: EVM via wagmi and GenLayer via `genlayer-js`.

## 🗂️ Repository layout

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

## 🔀 Data flow

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
       (genlayer-js SDK)            (wagmi / viem)
              ↓                               ↓
       waitForTxReceipt             waitForTransactionReceipt
              ↓                               ↓
         Confirm task               Handle revert / success
```

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | TypeScript |
| **Wallet** | RainbowKit + Wagmi 2.x + Viem |
| **GenLayer SDK** | genlayer-js |
| **Database** | PostgreSQL + Drizzle ORM |
| **Styling** | CSS Variables + Tailwind-like utility classes |
| **EVM contracts** | Solidity (Hardhat) |
| **GenLayer contracts** | Python (GenLayer Studio) |

> 🔑 The single abstraction that makes all of this possible is `isGenLayer(chainId)`. It splits every task into an EVM path and a GenLayer path so the wallet UI, task panel and stats stay identical no matter which backend you're talking to.