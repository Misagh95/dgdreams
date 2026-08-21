# TruthCourt — Mechanism Design

## The problem

Fact-checking today is centralized, slow, and distrusted. Two people who
disagree about a factual claim (a news headline, a product claim, a political
statement) have no neutral, fast, and incentive-aligned way to settle it:

- **Centralized fact-checkers** (Snopes, Politifact, platform trust & safety)
  are opaque, have a throughput bottleneck, and are themselves accused of bias
  by the side they rule against.
- **Social moderation** is vulnerable to brigading and mob rule — the loudest
  group wins, not the most accurate.
- **No skin in the game**: posting a false claim is free, so misinformation
  floods in while corrections trickle out.

## The mechanism

TruthCourt is a permissionless, economically-incentivized fact-check market:

1. **Post** — anyone submits a factual claim, links at least one evidence URL,
   and stakes GEN as a bond.
2. **Challenge** — anyone who disputes the claim stakes an **equal** bond and
   supplies their own evidence URLs.
3. **Resolve** — anyone triggers resolution. The contract:
   - fetches the evidence URLs **live from the web** (`gl.nondet.web.get`),
   - asks an LLM to return a structured verdict (`true` / `false` /
     `unverifiable`) plus reasoning,
   - has validators **independently re-run** the fetch + LLM call and agree on
     the verdict field under the Equivalence Principle.
4. **Settle** — the losing side's bond goes to the winner (minus a protocol
   fee). If the claim is `unverifiable`, both bonds are returned.

### Why this creates trust

- **Skin in the game.** You only post a claim you believe is true, and you
  only challenge a claim you can actually refute — a wrong verdict costs you
  your bond.
- **Transparency.** The claim text, the evidence URLs, the verdict, and the
  LLM's reasoning are all stored on-chain. Anyone can re-check the sources.
- **Decentralized judgment.** No single operator decides; validators with
  different models must agree. This removes the single-point-of-bias problem.
- **Live, not memorized, data.** The LLM adjudicates against the sources
  fetched at resolution time — not against whatever its training data
  remembers. This satisfies the "authoritative/live data" requirement.

## Economic model

| Event | Poster | Challenger | Treasury |
|---|---|---|---|
| Verdict `true` | gets own bond + challenger's bond − fee | loses bond | gets fee |
| Verdict `false` | loses bond | gets own bond + poster's bond − fee | gets fee |
| Verdict `unverifiable` | refunded | refunded | 0 |
| Cancelled (uncontested) | refunded | — | 0 |

- `fee_bps` (default 250 = 2.5%) is set at deploy and paid to `treasury`.
- Bonds must be **exactly equal** between poster and challenger, which keeps
  the market symmetric and prevents griefing by under-funding a challenge.

## Anti-abuse properties

- **Frivolous claims** are deterred by the bond and by the fact that a single
  correct challenge flips the bond to the challenger.
- **Frivolous challenges** are deterred by the equal-bond requirement: a false
  challenge of a true claim loses the challenger's bond.
- **Source spam** is bounded: at most 6 URLs are fetched and at most 4000
  characters per source are fed to the LLM, so resolution cost stays bounded.
- **Unresolvable fights** end in `unverifiable` (both refunded) rather than a
  coin-flip payout.

## Extensions (future milestones)

- **Challenge deadline**: use GenVM block time to let uncontested claims expire
  automatically.
- **Appeals / escalation**: a second resolution round with a higher bond for
  edge cases.
- **Reputation**: track each address's accuracy history on-chain.
- **Multi-party resolution**: juries of stakers instead of a single challenger.

## Assumptions & limitations

- The contract trusts the LLM + validator consensus for the final verdict.
  For high-stakes claims, users should provide primary/authoritative sources.
- Web pages can change or be paywalled between leader and validator runs; the
  verdict-comparison-only validation tolerates minor source drift, and
  unreachable sources are skipped.
