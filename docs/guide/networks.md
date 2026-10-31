# Networks

DGDreams supports **25 networks** — 14 mainnets and 11 testnets — all from one wallet.

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
| **XRP EVM** | 1440000 | XRP |

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
| **DogeOS Chikyū Testnet** | 6281971 | DOGE |
| **Elysium Testnet** | 99801 | HYPE |

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

All three DGDreams contracts are **live and verified** on Maroo Testnet:

| Contract | Address |
|---|---|
| `NikBase` | [`0x68bb9775…1e733`](https://explorer-testnet.maroo.io/address/0x68bb9775b11551310d7a37aae52e6505a0e1e733) |
| `Game2048` | [`0xaf1f1ec7…7ebab0`](https://explorer-testnet.maroo.io/address/0xaf1f1ec78f94bf9b6facf876c77a51562b7ebab0) |
| `SoulboundStreak` | [`0x344ad6a0…798e3b`](https://explorer-testnet.maroo.io/address/0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b) |

Maintenance: `node scripts/deploy-l2.mjs --only 450815` re-runs safely (recorded
addresses are skipped unless you pass `--force`) and
`node scripts/verify-l2.mjs --only 450815` re-verifies them — custom chains are
verified by numeric chain id against the Blockscout API.

### DogeOS testnet

DogeOS is **the app layer for Dogecoin** — an EVM-equivalent optimistic rollup
settling onto the Dogecoin testnet. It is bytecode compatible with Ethereum's
Prague upgrade, so the standard EVM tooling (wagmi, forge, hardhat) works
unmodified. DGDreams tracks the Chikyū **testnet**:

| Field | Value |
|---|---|
| Chain ID (EVM) | `6281971` (`0x5fdaf3`, verified live) |
| RPC | `https://rpc.testnet.dogeos.com` |
| Explorer | https://dogeos-testnet.l2scan.co |
| Faucet | https://faucet.testnet.dogeos.com |
| Testnet portal | https://portal.testnet.dogeos.com |
| Native gas | **DOGE** (testnet DOGE, 18 decimals) |

Make sure your Solidity compiler is `>= 0.8.30` when targeting DogeOS — the
docs recommend `prague` as the EVM target.

All three DGDreams contracts are **live on DogeOS Testnet**:

| Contract | Address |
|---|---|
| `NikBase` | [`0x68bb9775…1e733`](https://dogeos-testnet.l2scan.co/address/0x68bb9775b11551310d7a37aae52e6505a0e1e733) |
| `Game2048` | [`0xaf1f1ec7…7ebab0`](https://dogeos-testnet.l2scan.co/address/0xaf1f1ec78f94bf9b6facf876c77a51562b7ebab0) |
| `SoulboundStreak` | [`0x344ad6a0…798e3b`](https://dogeos-testnet.l2scan.co/address/0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b) |

Maintenance: `node scripts/deploy-l2.mjs --only 6281971` re-runs safely (recorded
addresses are skipped unless you pass `--force`) and
`node scripts/verify-l2.mjs --only 6281971` re-verifies them — verification goes
through the Blockscout API at `https://dogeos-testnet.l2scan.co/api`.

### Elysium testnet

Elysium is Kinetiq's general-purpose **DeFi chain aligned with Hyperliquid**: an
Arbitrum Orbit (Nitro/ArbOS) L2 that settles to HyperEVM, runs co-located with
HyperCore and uses 100 ms blocks. Native gas is **HYPE**, bridged 1:1 as native
gas from HyperEVM — there is no wrapper asset. DGDreams tracks the **testnet**
(mainnet is pre-launch; its chain ID and explorer are published at launch):

| Field | Value |
|---|---|
| Chain ID (EVM) | `99801` (`0x185d9`, verified live) |
| RPC | `https://testnet-rpc.elysium.kinetiq.xyz` |
| Explorer | https://testnet.elysium.kinetiq.xyz/explorer |
| Faucet | https://testnet.elysium.kinetiq.xyz/faucet |
| Docs | https://testnet.elysium.kinetiq.xyz/docs/what-is-elysium |
| X | https://x.com/Enter_Elysium |
| Native gas | **HYPE** (native, 18 decimals) |

Contract addresses on Elysium are recorded automatically the first time you run
`node scripts/deploy-l2.mjs --only 99801`.

### XRP EVM Sidechain

XRP EVM is Ripple's Ethereum-compatible **sidechain bridged to the XRP Ledger**:
a Cosmos-SDK based standalone L1 with a stock EVM implementation — any Solidity
contract runs unchanged, with **XRP** as the native gas token (18 decimals on the
EVM side). The explorer is self-hosted **Blockscout**. All network details below
are verified live against the official RPC:

| Field | Value |
|---|---|
| Chain ID (EVM) | `1440000` (`0x15f900`, verified live) |
| RPC | `https://rpc.xrplevm.org` |
| Explorer | https://explorer.xrplevm.org (Blockscout) |
| Bridge | https://app.squidrouter.com (Axelar) · native XRPL bridge |
| Docs | https://docs.xrplevm.org |
| Brand kit | https://www.xrplevm.org/brand-kit |
| Native gas | **XRP** (native, 18 decimals) |

Contract addresses on XRP EVM are recorded automatically the first time you run
`node scripts/deploy-l2.mjs --only 1440000`.

> ⚠️ Contract verification on the self-hosted Blockscout currently answers the
> generic `Fail - Unable to verify` even for a byte-exact standard-JSON
> submission (source recompiled locally reproduces the deployed creation and
> runtime bytecode exactly). The legacy API accepts the submission and returns
> a GUID, so `node scripts/verify-l2.mjs --only 1440000` can simply be re-run
> once the explorer's verifier recovers — or verify through the explorer UI's
> "Verify & Publish" (Standard JSON Input), the flow other projects use there.

> 💡 Each network needs **native gas** for writes. Check the currency column above — that's what you need in your wallet for that chain. On Arc mainnet that means **USDC**, on Maroo Testnet it means **tOKRW**, and on DogeOS Testnet it means **testnet DOGE** from https://faucet.testnet.dogeos.com.