<div align="center">

# ⚖️ TruthCourt

### A decentralized fact-check bounty market on **GenLayer**

Post a claim, stake **GEN**, back it with **live web evidence** — and let a
court of AI validators settle the truth. Wrong claims and wrong challenges
both cost money.

[![GenLayer](https://img.shields.io/badge/GenLayer-Bradbury-6D6AFF?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdib3g9IjAgMCAzMiAzMiI+PHJlY3QgeGQ9IjEiIHk9IjEiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgcng9IjgiIGZpbGw9IiM2RDZBRkYiLz48L3N2Zz4=)](https://genlayer.com)
[![Contract](https://img.shields.io/badge/Intelligent%20Contract-Python%20%E2%80%93%20GenVM-22C58B)](#the-contract)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-00D4FF)](#frontend)
[![Tests](https://img.shields.io/badge/tests-pytest%20e2e-F59E0B)](tests/test_truth_court.py)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Try the live dApp → [dgdreams.space/truthcourt](https://dgdreams.space/truthcourt)**

</div>

---

> **The 30-second pitch.** Anybody can post a factual claim and stake GEN behind
> it. Anybody who disagrees can **challenge** it with an equal stake. Once
> contested, the contract fetches both sides' evidence URLs **live from the
> web**, an LLM renders a verdict, and GenLayer validators independently re-run
> the adjudication and agree on it under the **Equivalence Principle**. The
> losing side's bond is paid to the winner (minus a 2.5% protocol fee). If the
> claim is unverifiable, **both** bonds are returned.

## 🚀 Live on Bradbury

| | |
|---|---|
| **Contract** | [`0x999Fc79026afdF38472c5E15970AF454F13Ddbc1`](https://genlayer-scan.org/address/0x999Fc79026afdF38472c5E15970AF454F13Ddbc1) |
| **Deploy tx** | `0x7146377b245d5b7f1d7b4455b08e9a0dbbc3fff63830df14f29b8d0246576d74` |
| **Chain** | GenLayer **Bradbury** testnet |
| **Treasury** | `0x8A394953f15d80F0E299c717A310e933a269313b` (receives 2.5% fee) |
| **Test claim #1** | *“The sky is blue.”* → settled `AGREE` (poster won) |

> ✔️ Deployed bytecode was read back from the chain and **byte-verified against
> the source in this repo** (`MATCH`), line-by-line including the pinned
> `py-genlayer` dependency hash.

## ✨ Features

- **🔎 Live web evidence** — `gl.nondet.web.get()` fetches both sides' evidence
  URLs at resolution time. No oracles, no trusted feeds.
- **🧠 AI adjudication** — `gl.nondet.exec_prompt()` instructs an LLM to
  judge *true / false / unverifiable* using only the live sources.
- **⚖️ Validator consensus** — `gl.vm.run_nondet_unsafe(leader, validator)`
  makes validators independently re-run the ruling (Equivalence Principle)
  before any on-chain state changes.
- **💰 Skin in the game** — symmetric bonds make wrong claims *and* wrong
  challenges expensive; the winner takes the loser's bond.
- **🏦 Protocol treasury** — a 250 bps fee funds the treasury on every payout,
  keeping the market self-sustaining with no operator.
- **🖥️ Full dApp** — React + TypeScript frontend (`genlayer-js`) with the
  complete transaction lifecycle (PENDING → … → FINALIZED) and a
  glassmorphism space UI.

## 🔁 How it works

```
 submit_claim           challenge_claim          resolve_claim
(none) ────────────► OPEN ────────────────► CONTESTED ─────────────► RESOLVED
                       │ cancel_claim (poster)                 verdict stored
                       ▼                                        payout settled
                    RESOLVED
```

1. **Submit** — a poster calls `submit_claim(text, evidence_urls)` with a bond.
2. **Challenge** — anyone staking an equal bond calls `challenge_claim`.
3. **Resolve** — anyone calls `resolve_claim(claim_id)`; the contract fetches
   both sides' evidence, the LLM adjudicates, validators agree, and bonds are
   settled.
4. **Withdraw** — winners collect via `withdraw()`.

## 📜 The contract

`contract/truth_court.py` — an Intelligent Contract in **Python (GenVM SDK)**.

| Method | Type | Purpose |
|---|---|---|
| `submit_claim(text, evidence_urls)` | payable | post a claim + stake a bond |
| `challenge_claim(claim_id, evidence_urls)` | payable | match the bond and contest |
| `resolve_claim(claim_id)` | write | fetch evidence → LLM verdict → settle |
| `cancel_claim(claim_id)` | write | poster withdraws an uncontested claim |
| `withdraw()` | write | collect your winnings |
| `get_claim(id)` · `get_claims(o, n)` · `get_payout(addr)` · `get_config()` | view | read state |

## 🧱 Why GenLayer is central

This app **cannot exist** on a normal blockchain:

| Requirement | Normal chain | TruthCourt on GenLayer |
|---|---|---|
| Fetch web pages natively | ❌ | ✅ `gl.nondet.web.get()` |
| Reason about natural-language truth | ❌ | ✅ `gl.nondet.exec_prompt()` |
| Validators agree on a non-deterministic verdict | ❌ | ✅ Equivalence Principle |

The source, evidence URLs, verdict, and reasoning are all **on-chain and
transparent** — public, verifiable fact-checking.

## 📁 Repository layout

```
truthcourt/
├── contract/truth_court.py   # the Intelligent Contract (Python, GenVM SDK)
├── tests/                    # e2e tests (genlayer-test / gltest) + no-node smoke
├── frontend/                 # React + TypeScript dApp (genlayer-js)
├── docs/DESIGN.md            # mechanism design & economics
├── SUBMISSION.md             # platform submission notes
└── README.md
```

## 🚀 Quick start

### Contract

1. Install the [GenLayer CLI](https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup)
   and launch **GenLayer Studio**.
2. Paste `contract/truth_court.py` into a new contract and deploy it — the
   constructor takes `treasury` (your address) and optional `fee_bps`.
3. Call `submit_claim` → `challenge_claim` (from a second account) →
   `resolve_claim` → `withdraw`.

> The `Depends` header pins a `py-genlayer` build hash for reproducibility. If
> the Studio warns about a newer version, replace the hash with the one the
> Studio suggests (or `py-genlayer:test` for the simulator).

### Tests

```bash
pip install genlayer-test
pytest -q
```

The e2e suite needs a running localnet RPC (e.g. GenLayer Studio on
`127.0.0.1:4000`), see `tests/gltest.config.yaml`. No node? The full lifecycle
also runs as plain Python:

```bash
python tests/direct_smoke.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Connect an account, post claims, challenge them, trigger resolution, and watch
the transaction lifecycle — deployed with `genlayer-js` `writeContract` +
`waitForTransactionReceipt`.

## ✅ GenLayer quality bar

- **Real trust problem** — replaces opaque centralized fact-checking with a
  permissionless, stake-backed, transparent market.
- **Live/authoritative data** — evidence fetched from the web at resolution
  time; the LLM is instructed to rely on sources, not memory.
- **Complete source + docs** — contract, tests, frontend, design notes.
- **Frontend calls the contract** — full read/write lifecycle in
  `frontend/src/genlayer.ts`.
- **Not boilerplate** — symmetric bonds, three-way verdict, fee treasury,
  source-fetch caps, and reproducible deployments.

## 🗺️ Roadmap

- Challenge deadlines & appeal windows
- On-chain reputation / dispute history
- Source-relevance scoring in the prompt
- Multi-language claims

## 📄 License

MIT — see [LICENSE](LICENSE).