# Local Development

Get the full stack running locally with GenLayer contracts, the oracle and the prediction market.

## 1. Clone & install

```bash
git clone https://github.com/Misagh95/dgdreams.git
cd dgdreams
npm install
```

## 2. Environment variables

```bash
cp .env.example .env.local
```

Then open `.env.local` and add:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

You can get a free Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

## 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Connect MetaMask

Install **MetaMask** and make sure you're on a supported network (e.g. **Base** or **Ethereum**, or **GenLayer Bradbury** for AI contracts). You'll need native gas for the chain you use.

## 5. Docs site (this site)

```bash
npm run docs:dev
```

Serves the VitePress docs locally at [http://localhost:5173](http://localhost:5173) with hot reload.

## 🐍 GenLayer contracts

The Python Intelligent Contracts live in [`genlayer-contracts/`](https://github.com/Misagh95/dgdreams/tree/master/genlayer-contracts). To redeploy after changing a contract, follow the existing Hardhat/GenLayer workflow and update the deployed addresses in `src/config`.

> ⚠️ GenLayer interactions go through `genlayer-js` — never through wagmi/viem. Keep the EVM and GenLayer code paths separate via `isGenLayer(chainId)`.