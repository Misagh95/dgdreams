# Features

DGDreams is a unified dashboard where you connect your wallet once and execute daily on-chain tasks across **20 blockchain networks**.

## ✨ At a glance

| Feature | Description |
|---|---|
| 🔁 **One wallet, many chains** | Connect with RainbowKit, switch networks seamlessly |
| ✅ **3 daily tasks per network** | Check-in, GM, GN — one new day at **00:00 UTC** |
| 🚀 **5-in-1 runner** | Two missions plus three deploys in one click, ~69% less gas |
| 🧠 **GenLayer AI contracts** | Python-based Intelligent Contracts using the `genlayer-js` SDK |
| 🏆 **Soulbound NFT streaks** | Mint tiered NFTs (Bronze → Legend) for 7+ day streaks |
| 🔐 **Wallet-owned streaks** | Read from the chain, never self-reported |
| 🎮 **2048 milestone game** | A binary-themed game that doubles as an engagement milestone |
| 🛰️ **Prediction market** | A GenLayer market with AI-verified resolution |

## 🧠 GenLayer — AI-native contracts

GenLayer is a **non-EVM** chain that runs **Python Intelligent Contracts** validated by AI validators. DGDreams treats it as a first-class network:

- **Contract**: `NikBase` — a Python contract storing all user data as JSON in a single `str` state field.
- **Client**: `genlayer-js` SDK with a MetaMask provider (`window.ethereum`).
- **Read/Write**: fully separate code paths — `wagmi` for EVM chains, `genlayer-js` for GenLayer — decided by an `isGenLayer()` check.

Every task timestamp uses **real UTC time** fetched through `gl.nondet.web.render()` and enforced by `strict_eq` consensus, so "once per UTC day" is provable on-chain.

## 🏆 Soulbound NFT streaks

Networks with a soulbound NFT contract support minting and upgrading:

- **7-day streak** → Mint **Bronze** NFT
- **Streak milestones** → Upgrade through **Silver, Gold, Diamond, Legend**
- NFTs are **soulbound** (non-transferable) — they track your longest streak forever

## 📊 Real-time stats

Every action writes to an on-chain contract that tracks streaks, action counts and daily resets. The leaderboard indexes those on-chain values per wallet and network, so the numbers there are verifiable rather than self-reported.

## 🚀 5-in-1 runner

One button runs GM, GN and three deploys (a demo contract, a minimal ERC-20 and a
minimal ERC-721) back to back, on a network the card picks for itself.

Those three come from `contracts/OneClick.sol`, deliberately stripped down. Deploy
gas is charged at **200 gas per byte of runtime code**, so a function nobody calls
still costs on every deployment — trimming them cut the run from ~2.78M to ~0.87M
gas. The card also reuses addresses it has already deployed on that network.