# Features

DGDreams is a unified dashboard where you connect your wallet once and execute daily on-chain tasks across **14 blockchain networks**.

## ✨ At a glance

| Feature | Description |
|---|---|
| 🔁 **One wallet, many chains** | Connect with RainbowKit, switch networks seamlessly |
| ✅ **9 daily tasks per network** | Check-in, GM, GN, Dose, Mood, Spin, Counter, Sanitize, Reception |
| 🧠 **GenLayer AI contracts** | Python-based Intelligent Contracts using the `genlayer-js` SDK |
| 🏆 **Soulbound NFT streaks** | Mint tiered NFTs (Bronze → Legend) for 7+ day streaks |
| 📊 **Real-time stats** | Per-network action counts, streak tracking, full history |
| 🎮 **2048 milestone game** | A binary-themed game that doubles as an engagement milestone |
| ⚙️ **LiteVM playground** | Experimental runtime playground with points, tournaments and tasks |

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

Every action writes to an on-chain contract that tracks streaks, action counts and daily resets. Your profile keeps a full, verifiable history across every network you touch.