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