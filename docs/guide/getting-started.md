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
#    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
#    SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# 4. Start the dev server
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
2. Pick a network from the grid — start with **OP Mainnet** or **Arbitrum One**,
   where a full run costs a fraction of a cent.
3. Open the **Daily Task** panel and run your **Check-in**.
4. Come back tomorrow. The day resets at **00:00 UTC**, so the streak boundary is
   the same for everyone no matter where they are. Mint your first **Bronze NFT**
   at 7 days. 🏅

## 🚀 Try the 6-in-1 runner

On the tasks page, the 6-in-1 card runs Check-In, GM, GN and three contract deploys in one
click — on whichever network you select in that card. It shows the estimated gas
before you start, and reuses anything it has already deployed on that network, so
running it a second time is almost free.