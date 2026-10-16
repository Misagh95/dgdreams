# Networks

DGDreams supports **22 networks** — 13 mainnets and 9 testnets — all from one wallet.

## 🟢 Mainnet

| Network | Chain ID | Currency |
|---|---|---|
| **Ethereum** | 1 | ETH |
| **Base** | 8453 | ETH |
| **HyperEVM** | 999 | HYPE |
| **Unichain** | 130 | ETH |
| **Tempo** | 4217 | USD |
| **Robinhood** | 4663 | ETH |
| **Ink** | 57073 | ETH |
| **Arc** | 5042 | USDC |
| **BNB Chain** | 56 | BNB |
| **opBNB** | 204 | BNB |
| **Arbitrum One** | 42161 | ETH |
| **OP Mainnet** | 10 | ETH |
| **Soneium** | 1868 | ETH |

## 🟡 Testnet

| Network | Chain ID | Currency |
|---|---|---|
| Sepolia | 11155111 | ETH |
| Base Sepolia | 84532 | ETH |
| GIWA Sepolia | 91342 | ETH |
| LitVM Liteforge | 4441 | zkLTC |
| **GenLayer Bradbury** | **4221** | **GEN** |
| ARC Testnet | 5042002 | ARC |
| SimpleChain | 1913 | SIM |
| **Arbitrum Sepolia** | 421614 | ETH |
| **Maroo Testnet** | 450815 | tOKRW |

## 💸 Cost

Network choice matters a lot for the 6-in-1 runner, because deployment gas is
charged at 200 gas per byte of contract code. Measured on Arbitrum One:

| Contract | Gas |
|---|---|
| `NikBase` | ~1.7M |
| `Game2048` | ~156K |
| `SoulboundStreak` | ~2.2M |

**OP Mainnet is by far the cheapest** — a full three-contract deploy there costs
roughly $0.000004. Base and BNB are the most expensive. If you are trying the app
for the first time, start on OP Mainnet.

## 🔀 Switching networks

All network definitions and `NetworkConfig` live in a single source of truth — [`config/chains.ts`](https://github.com/Misagh95/dgdreams/blob/master/src/config/chains.ts). Adding a new chain is just one entry away.

### GenLayer switching

GenLayer isn't EVM, so it needs a manual wallet switch. When you select GenLayer, the app asks you to switch networks inside MetaMask, then routes all reads/writes through `genlayer-js` instead of `wagmi`.

### Arc mainnet endpoints

Arc mainnet (chain `5042`) settles gas in **USDC** and is defined with two RPC endpoints in
[`config/chains.ts`](https://github.com/Misagh95/dgdreams/blob/master/src/config/chains.ts) — Circle's
official node `https://rpc.mainnet.arc.io` first, with the public Arcscan node
`https://rpc.arc-scan.org` as an automatic fallback for networks where `arc.io` is DNS-filtered.
Transactions link to the official explorer `https://explorer.arc.io` (an independent
[Arcscan](https://arc-scan.org) explorer is also listed on the chain config).

### Maroo testnet

Maroo is a compliant, EVM-compatible sovereign **Layer 1** for the Korean Won economy
(built by Hashed Open Finance). DGDreams tracks it as a **testnet** — mainnet (chain `815`)
has not launched yet, so only the testnet endpoints exist:

| Field | Value |
|---|---|
| Chain ID (EVM) | `450815` (`0x6e0ff`) |
| Cosmos chain-id | `maroo-testnet-1` |
| RPC | `https://rpc-testnet.maroo.io` |
| WebSocket | `wss://ws-testnet.maroo.io` |
| Explorer | https://explorer-testnet.maroo.io |
| Faucet | https://faucet.maroo.io |
| Native gas | **tOKRW** (testnet OKRW, 18 decimals) |

Two gas rules are different from a normal EVM chain:

1. **Never send a fixed 21,000 gas limit.** Every transaction runs compliance (PCL) and agent
   checks — a plain transfer costs ~104,000 gas, and at least half of the gas limit is charged
   even when less is used (`min_gas_multiplier = 0.5`). Let the wallet estimate (`eth_estimateGas`).
2. **tOKRW is the native coin, not an ERC-20.** It moves as `msg.value`; there is no token
   contract to approve.

DGDreams has not deployed `NikBase` / `Game2048` / `SoulboundStreak` there yet, so the mission
button shows *Not deployed* for this network. To ship them: grab tOKRW from the faucet, then run
`node scripts/deploy-l2.mjs --only 450815` (RPC: `MAROO_RPC_URL`) and record the addresses in
[`config/chains.ts`](https://github.com/Misagh95/dgdreams/blob/master/src/config/chains.ts).

> 💡 Each network needs **native gas** for writes. Check the currency column above — that's what you need in your wallet for that chain. On Arc mainnet that means **USDC**, on Maroo Testnet it means **tOKRW** from the faucet.