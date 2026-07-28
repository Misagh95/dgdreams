# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import typing

class PriceOracle(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    @gl.public.view
    def getPrice(self, symbol: str) -> str:
        data = json.loads(self.store)
        entry = data.get(symbol)
        if entry is None:
            return json.dumps({"symbol": symbol, "price": 0, "status": "unavailable"})
        return json.dumps(entry)

    @gl.public.write
    def fetchPrice(self, symbol: str) -> typing.Any:
        url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}USDT"

        def fetch() -> str:
            try:
                raw = gl.nondet.web.render(url, mode="text")
                if not raw or raw.strip() == "null":
                    return json.dumps({"error": "down", "status": "unavailable"})
                data = json.loads(raw)
                price = float(data["lastPrice"])
                return json.dumps({
                    "symbol": symbol,
                    "price": round(price, 2),
                    "status": "ok"
                }, sort_keys=True)
            except Exception:
                return json.dumps({"error": "down", "status": "unavailable"})

        result = gl.eq_principle.prompt_comparative(
            fetch,
            "These are crypto price reports. They are equivalent if both report 'unavailable', "
            "or if both have the same symbol and price within 1% of each other."
        )

        data = json.loads(self.store)
        data[symbol] = json.loads(result)
        self.store = json.dumps(data, sort_keys=True)
        return result
