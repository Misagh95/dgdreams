# Getting Started

Welcome aboard, space cadet. Getting your DGDreams dashboard running takes less than five minutes.

## Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/Misagh95/dgdreams.git
cd dgdreams

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# 4. Add your WalletConnect Project ID:
#    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# 5. Start the dev server
npm run dev
```

Open [`http://localhost:3000`](http://localhost:3000) and hit the dashboard. 🚀

## 📋 Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js** ≥ 18 | Any recent LTS works |
| **WalletConnect Project ID** | Free — get one at [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| **MetaMask** (browser extension) | Required for EVM chains *and* GenLayer via `genlayer-js` |
| **A wallet with a little gas** | You need native tokens per network to sign daily tasks |

## 🎮 Your first mission

1. Click **Connect Wallet** and approve with MetaMask.
2. Pick a network from the grid — start with **Base** or **Ethereum**.
3. Open the **Daily Task** panel and run your **Check-in**.
4. Come back tomorrow. Build the streak. Mint your first **Bronze NFT**. 🏅