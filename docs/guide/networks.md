# Networks

DGDreams supports **14 networks** — 7 mainnets and 7 testnets — all from one wallet.

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

> 💡 Each network needs **native gas** for writes. Check the currency column above — that's what you need in your wallet for that chain.