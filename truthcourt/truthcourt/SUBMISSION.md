# Submission Notes — TruthCourt

## What it does

TruthCourt is a decentralized fact-check bounty market on GenLayer. Users post
factual claims with a GEN bond; others challenge claims they dispute with an
equal bond; the Intelligent Contract then fetches both sides' evidence URLs
live from the web, has an LLM adjudicate (true / false / unverifiable), and —
after validators independently agree under the Equivalence Principle — pays the
losing bond to the winner (minus a 2.5% protocol fee). Unverifiable claims
refund both sides.

## The problem it solves

Centralized fact-checking is slow, opaque, and distrusted, and it has no
economic incentive for accuracy. TruthCourt makes truth-seeking a market with
skin in the game: wrong claims and wrong challenges both cost money, while
verdicts, evidence URLs, and reasoning are all transparent and on-chain.

## How to use it

1. Deploy `contract/truth_court.py` in GenLayer Studio (pass a `treasury`
   address). Or run it against the simulator.
2. Call `submit_claim` with claim text + evidence URLs + a bond.
3. From a second account, call `challenge_claim` with an equal bond.
4. Call `resolve_claim` — the contract fetches evidence and settles.
5. Winners call `withdraw`.
6. Use the React frontend (`frontend/`) for a full UI over genlayer-js.

## Why GenLayer is central (not an add-on)

The core workflow — native web fetch, LLM judgment, and validator consensus on
a non-deterministic verdict — is only possible on GenLayer. A normal chain
cannot read web pages or agree on the truth of a natural-language claim.

## Evidence / artifacts

- `contract/truth_court.py` — the Intelligent Contract (GenVM SDK, Python)
- `tests/test_truth_court.py` — e2e lifecycle tests with mocked web responses
- `frontend/` — React + TypeScript dApp (genlayer-js), full tx lifecycle
- `docs/DESIGN.md` — mechanism + economics
- `README.md` — usage guide

## Continued-use path

The market is self-sustaining: the fee funds the treasury, and the symmetric
bond design means the protocol needs no operator to function. Future work
(challenge deadlines, appeals, on-chain reputation) is outlined in DESIGN.md.
