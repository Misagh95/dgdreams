# AI Price Oracle

The **PriceOracle** contract fetches live cryptocurrency prices from the Binance API using GenLayer's AI-validator consensus — five independent validators fetch the data and must agree within **1% tolerance** before anything is written on-chain.

## 📜 The contract

```python
class PriceOracle(gl.Contract):
    store: str

    @gl.public.view
    def getPrice(self, symbol: str) -> str: ...

    @gl.public.view
    def isFresh(self, symbol: str, max_age_seconds: int) -> str:
        # Returns {"fresh": bool, "age": int, "max_age": int}

    @gl.public.write
    def fetchPrice(self, symbol: str) -> typing.Any:
        def fetch() -> str:
            raw = gl.nondet.web.render(
                f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}USDT",
                mode="text",
            )
        result = gl.eq_principle.prompt_comparative(
            fetch,
            "Two prices are equivalent if they are for the same symbol "
            "and the price values differ by less than 1%.",
        )
        parsed = json.loads(str(result))
        parsed["updated_at"] = self._now()      # freshness timestamp
        data[symbol] = parsed
        self.store = json.dumps(data, sort_keys=True)
```

## ⚙️ How a price fetch works

1. User clicks **Fetch BTC/USDT** on the frontend.
2. The contract calls `gl.nondet.web.render()` — each validator independently hits Binance.
3. `gl.eq_principle.prompt_comparative()` makes validators agree within a 1% tolerance.
4. The agreed price (plus a `updated_at` timestamp) is stored on-chain.
5. `isFresh(symbol, max_age_seconds)` tells consumers whether the stored price is still fresh.

## 🌐 Try it live

Switch to **GenLayer Bradbury** on the dashboard and head to [`/genlayer-oracle`](https://dgdreams.space/genlayer-oracle) — pick a symbol and fetch. This oracle is also used by the [Prediction Market](./prediction-market) for oracle-mediated resolution.