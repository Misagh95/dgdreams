# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class PriceOracle(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    def _now(self) -> int:
        def fetch_time() -> str:
            raw = gl.nondet.web.render("https://worldtimeapi.org/api/timezone/Etc/UTC", mode="text")
            if raw is None or raw.strip() == "" or raw.strip() == "null":
                return "0"
            try:
                j = json.loads(raw)
                return str(round(int(j["unixtime"]) / 60) * 60)
            except Exception:
                return "0"
        return int(gl.eq_principle.strict_eq(fetch_time))

    @gl.public.view
    def getPrice(self, symbol: str) -> str:
        data = json.loads(self.store)
        entry = data.get(symbol)
        if entry is None:
            return json.dumps({"symbol": symbol, "price": 0, "status": "unavailable"})
        return json.dumps(entry)

    @gl.public.view
    def isFresh(self, symbol: str, max_age_seconds: int) -> str:
        data = json.loads(self.store)
        entry = data.get(symbol)
        if entry is None:
            return json.dumps({"fresh": False, "reason": "no data"})
        now = self._now()
        age = now - entry.get("updated_at", 0)
        return json.dumps({"fresh": age <= max_age_seconds, "age": age, "max_age": max_age_seconds})

    @gl.public.write
    def fetchPrice(self, symbol: str) -> str:
        url = "https://api.binance.com/api/v3/ticker/24hr?symbol=" + symbol + "USDT"

        def fetch() -> str:
            raw = gl.nondet.web.render(url, mode="text")
            if raw is None or raw.strip() == "" or raw.strip() == "null":
                return json.dumps({"symbol": symbol, "price": 0, "status": "unavailable"}, sort_keys=True)
            try:
                j = json.loads(raw)
                p = float(j["lastPrice"])
                return json.dumps({"symbol": symbol, "price": round(p, 2), "status": "ok"}, sort_keys=True)
            except Exception:
                return json.dumps({"symbol": symbol, "price": 0, "status": "unavailable"}, sort_keys=True)

        result = gl.eq_principle.prompt_comparative(
            fetch,
            "Two prices are equivalent if they are for the same symbol and the price values differ by less than 1%."
        )

        data = json.loads(self.store)
        parsed = json.loads(str(result))
        parsed["updated_at"] = self._now()
        data[symbol] = parsed
        self.store = json.dumps(data, sort_keys=True)
        return str(result)
