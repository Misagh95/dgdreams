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
SESSION_SECRET=                 # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DATABASE_URL=                   # PostgreSQL connection string
DEPLOYER_PRIVATE_KEY=           # only if you are deploying contracts
```

You can get a free Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

`SESSION_SECRET` signs the wallet-login tokens used for streaks. It is resolved
per request rather than at import time, so a build never needs it — but without it
the site builds fine while sign-in and streak recording stay disabled. Set the same
value in your deployment platform's environment.

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

## 🦾 Deploying the EVM contracts

```bash
forge build

npm run deploy:l2:dry    # preview the gas cost, sends nothing
npm run deploy:l2        # deploy + wire addresses into src/config/chains.ts
npm run verify:l2        # verify on the explorers (needs explorer API keys)
```

Useful flags: `--only <chainId>`, `--force` (redeploy even if an address is
recorded), `--skip-nft`.

Both scripts read their target addresses back out of the app config rather than
taking them as arguments, so a command can never be pointed at the wrong address.
A chain whose address is already recorded is **skipped** — redeploying `NikBase`
would orphan the existing one along with its users' streaks.

### Two Foundry profiles

| Profile | Used for | Metadata |
|---|---|---|
| `default` | contracts you deploy and verify | kept, so explorers can verify |
| `slim` | `contracts/OneClick.sol`, deployed from the browser | stripped, to save gas |

```bash
FOUNDRY_PROFILE=slim forge build
```

The one-click contracts are deployed by users themselves and never verified, so
their metadata is dead weight billed twice — once as calldata, once as code
deposit. Measure any change with:

```bash
node scripts/measure-deploy-cost.mjs
```

## 🐍 GenLayer contracts

The Python Intelligent Contracts live in [`genlayer-contracts/`](https://github.com/Misagh95/dgdreams/tree/master/genlayer-contracts). To redeploy after changing a contract, follow the existing Hardhat/GenLayer workflow and update the deployed addresses in `src/config`.

> ⚠️ GenLayer interactions go through `genlayer-js` — never through wagmi/viem. Keep the EVM and GenLayer code paths separate via `isGenLayer(chainId)`.