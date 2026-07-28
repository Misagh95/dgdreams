# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

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
    def fetchPrice(self, symbol: str) -> str:
        url = "https://api.binance.com/api/v3/ticker/24hr?symbol=" + symbol + "USDT"

        raw = gl.nondet.web.render(url, mode="text")

        if raw is None or raw.strip() == "" or raw.strip() == "null":
            result = json.dumps({"symbol": symbol, "price": 0, "error": "down", "status": "unavailable"}, sort_keys=True)
        else:
            try:
                j = json.loads(raw)
                p = float(j["lastPrice"])
                result = json.dumps({
                    "symbol": symbol,
                    "price": round(p, 2),
                    "status": "ok"
                }, sort_keys=True)
            except Exception:
                result = json.dumps({"symbol": symbol, "price": 0, "error": "parse", "status": "unavailable"}, sort_keys=True)

        data = json.loads(self.store)
        data[symbol] = json.loads(result)
        self.store = json.dumps(data, sort_keys=True)
        return result
