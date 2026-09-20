# Networks

DGDreams supports **15 networks** — 8 mainnets and 7 testnets — all from one wallet.

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

> 💡 Each network needs **native gas** for writes. Check the currency column above — that's what you need in your wallet for that chain. On Arc mainnet that means **USDC**.