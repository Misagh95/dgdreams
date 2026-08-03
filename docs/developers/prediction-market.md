# Prediction Market

A decentralized prediction market contract with **two resolution modes** — direct web fetching, or oracle-mediated resolution through the PriceOracle.

## 📜 The contract

```python
class PredictionMarket(gl.Contract):
    store: str

    @gl.public.write
    def createMarket(
        self, question: str, source_url: str, target_value: str,
        condition: str, resolves_at: int,
    ) -> int: ...

    @gl.public.write
    def predict(self, market_id: int, outcome: int, amount: int) -> str: ...

    @gl.public.write
    def resolveMarket(self, market_id: int, oracle_addr: str = "") -> str:
        # Direct resolution: validators fetch source_url and reach
        # strict_eq consensus on the outcome.

    @gl.public.write
    def resolveWithOracle(
        self, market_id: int, oracle_addr: str, symbol: str, max_age: int,
    ) -> str:
        # 1. Checks oracle.isFresh(symbol, max_age) — rejects if stale
        # 2. Calls oracle.getPrice(symbol) for the current price
        # 3. Resolves by comparing price vs target_value/condition
        # 4. Stores oracle price + freshness info for audit trail
```

## 🔍 Two resolution modes

### 1. `resolveMarket` — direct
Validators fetch the market's `source_url` directly and reach consensus via `strict_eq`. The optional `oracle_addr` parameter stores a reference for audit purposes.

### 2. `resolveWithOracle` — oracle-mediated
Resolves through a PriceOracle contract:
1. Checks freshness with `isFresh(symbol, max_age)` — **rejects stale data**.
2. Fetches the price via `getPrice(symbol)`.
3. Compares the price against `target_value` / `condition`.
4. Stores the oracle price and freshness info on-chain for a full audit trail.

## 🎯 Flow

```
User creates a market (question + source_url + condition)
        ↓
Others predict with amounts
        ↓
resolveMarket          OR          resolveWithOracle
(validators fetch URL)             (PriceOracle → isFresh → getPrice)
        ↓                                       ↓
  strict_eq consensus                    compare vs target
        ↓                                       ↓
       outcome resolved, audit trail stored
```