# Daily Tasks

Every network supports the same **3 daily tasks**. Each one writes to an on-chain contract that tracks streaks, action counts and daily resets.

## The 3 missions

| # | Task | What it does |
|---|---|---|
| 1 | **Daily Check-In** | Start the day and build your streak |
| 2 | **GM** | Morning greeting |
| 3 | **GN** | Night sign-off |

## ⚡ How it works

1. Select a network.
2. Open the **Daily Task** panel.
3. Click a task — DGDreams routes it through the right engine:

```
User clicks "Start"
        ↓
isGenLayer(chainId)?
   ├── yes ──► genLayerWriteTask()   (genlayer-js SDK)
   └──  no  ──► writeContractAsync()  (wagmi / viem)
        ↓
waitForTxReceipt / waitForTransactionReceipt
        ↓
 Confirm task ·  or ·  Handle revert
```

### ⏱️ Once per UTC day

Every action type can only be performed **once per UTC day**. The contract compares the current UTC timestamp against the user's stored `lastActionDay` and rejects duplicates — so the same person can't farm the same favorite action on a network in a single day.

## 🔢 Counter transaction (on its own)

Under the 6-in-1 runner there is a **Counter Transaction** card that sends `incrementCounter()` by itself — one transaction, one signature, no bundle.

| | |
|---|---|
| Contract call | `NikBase.incrementCounter()` |
| Limit | 3 per wallet per UTC day (`REPEAT_3`) |
| Also counts as | 1 of the 15 daily actions (`MAX_ACTIONS`) |
| Cost | network gas only |

The card reads today's counter count straight from `getActionCounts()` and shows `n/3` plus the time left until the reset. When the third increment is done, the button turns into **Limit reached** and a 4th call is blocked before the wallet can pop up — the contract would revert with `LimitReached()` anyway.

Pick any network that has a NikBase deployed; the wallet switches to it before the transaction is sent.