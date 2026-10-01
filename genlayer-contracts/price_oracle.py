# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# PriceOracle v1.1.0
#  - a failed fetch no longer overwrites the last good price with 0
#  - symbol is normalized + validated (A-Z / 0-9 only)
#  - isFresh no longer does a web call inside a view: caller passes now_ts
from genlayer import *
import json

TIME_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC"


def _clean_symbol(symbol: str) -> str:
    s = symbol.strip().upper()
    if not s or len(s) > 12 or not s.isalnum():
        raise Exception("invalid symbol")
    return s


class PriceOracle(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    def _now(self) -> int:
        def fetch_time() -> str:
            raw = gl.nondet.web.render(TIME_URL, mode="text")
            return str((int(json.loads(raw)["unixtime"]) // 60) * 60)

        now = int(gl.eq_principle.strict_eq(fetch_time))
        if now <= 0:
            raise Exception("time source unavailable")
        return now

    @gl.public.view
    def getPrice(self, symbol: str) -> str:
        s = _clean_symbol(symbol)
        entry = json.loads(self.store).get(s)
        if entry is None:
            return json.dumps({"symbol": s, "price": 0, "status": "unavailable", "updated_at": 0})
        return json.dumps(entry)

    @gl.public.view
    def isFresh(self, symbol: str, max_age_seconds: int, now_ts: int) -> str:
        entry = json.loads(self.store).get(_clean_symbol(symbol))
        if entry is None:
            return json.dumps({"fresh": False, "reason": "no data"})
        age = now_ts - int(entry.get("updated_at", 0))
        return json.dumps({"fresh": 0 <= age <= max_age_seconds, "age": age, "max_age": max_age_seconds})

    @gl.public.write
    def fetchPrice(self, symbol: str) -> str:
        s = _clean_symbol(symbol)
        url = "https://api.binance.com/api/v3/ticker/24hr?symbol=" + s + "USDT"

        def fetch() -> str:
            raw = gl.nondet.web.render(url, mode="text")
            try:
                p = float(json.loads(raw)["lastPrice"])
                return json.dumps({"symbol": s, "price": round(p, 2), "status": "ok"}, sort_keys=True)
            except Exception:
                return json.dumps({"symbol": s, "price": 0, "status": "unavailable"}, sort_keys=True)

        result = gl.eq_principle.prompt_comparative(
            fetch,
            "Two results are equivalent if they have the same symbol and status, "
            "and when status is ok the prices differ by less than 1%."
        )
        parsed = json.loads(str(result))
        if parsed.get("status") != "ok" or float(parsed.get("price", 0)) <= 0:
            raise Exception("price unavailable for " + s + ", previous value kept")

        parsed["updated_at"] = self._now()
        data = json.loads(self.store)
        data[s] = parsed
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps(parsed)
