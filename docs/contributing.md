# Contributing

Thanks for wanting to help build the terminal. Here's how to jump in.

## 🧭 What you can work on

- **New networks** — add an entry to [`src/config/chains.ts`](https://github.com/Misagh95/dgdreams/blob/master/src/config/chains.ts) and you're most of the way there.
- **Daily tasks** — extend the task set or per-network task availability.
- **GenLayer contracts** — new Python Intelligent Contracts in [`genlayer-contracts/`](https://github.com/Misagh95/dgdreams/tree/master/genlayer-contracts).
- **UI / polish** — components in `src/components`, pages in `src/app`.
- **Docs** — this site lives in `docs/`; edit it and run `npm run docs:dev`.

## ✅ Checklist

1. Fork the repo and create a feature branch.
2. Keep changes focused — one concern per PR.
3. Follow the existing code style (TypeScript, no new deps unless needed).
4. Test with `npm run dev` on at least one EVM chain.
5. Update docs if you change user-facing behavior.
6. Open a PR against `master` with a clear description.

## 🐍 GenLayer gotchas

- Contracts are **Python**, not Solidity — no wagmi/viem.
- Always fetch and agree on **real UTC time** via `gl.eq_principle.strict_eq` for daily resets.
- Keep the EVM and GenLayer code paths separated through `isGenLayer(chainId)`.

## 🚀 Good first issues

Look for the `good first issue` label, or just come say hi — the repo is MIT-licensed and happy to have contributors.