# Soulbound NFT Streaks

Consistency gets you on-chain recognition. Networks with a soulbound NFT contract let you mint — and upgrade — a permanent badge for your streak.

## 🏅 The tiers

| Milestone | Tier |
|---|---|
| **7-day streak** | Bronze |
| Longer streaks | Silver |
| Even longer | Gold |
| Elite | Diamond |
| Maximum dedication | **Legend** |

## 🔒 What "soulbound" means

These NFTs are **non-transferable** — no listings, no gifts, no escaping. They're bound to your wallet forever and exist to record your longest streak publicly on-chain.

## 🎯 How to build a streak

1. Connect your wallet and pick a network with a soulbound contract.
2. Run your **Daily Check-In** every day.
3. Cross the **7-day** mark to mint your first Bronze NFT.
4. Keep going to upgrade the tier.

Missing a day resets your streak — that's the game. The on-chain daily-reset logic won't let you cheat the clock, because it validates against real UTC time. ⏱️

## 🕛 When does the day reset?

At **00:00 UTC**, for everyone. The contract buckets days as
`block.timestamp / 1 days`, so there is one global boundary rather than a
per-user one — a streak never depends on where you happen to be.

The app mirrors that same boundary (`src/lib/utcDay.ts`) so an open tab clears its
"already done today" state at the exact moment the contract does, instead of
staying locked until you hard-refresh.

## 🔐 Where the streak lives

Your streak belongs to your **wallet**. `NikBase` stores it against your address
on-chain, and the app only keeps an index of it for the leaderboard — a value it
re-reads from the contract rather than accepting from the browser. That means a
streak cannot be inflated by editing a request.

The app keeps **one record per wallet**, whichever network it was verified on.
You sign in once (a free signature, no transaction), and after that the check is
silent — switching networks updates the same record instead of adding a new one,
so you are never listed twice on the leaderboard.