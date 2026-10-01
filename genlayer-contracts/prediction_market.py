# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# PredictionMarket v2.1.0
#  - sender uses gl.message.sender_address (same as NikBase)
#  - markets cannot be resolved before resolves_at
#  - "no_result" no longer closes a market forever (tx fails, retry later)
#  - oracle path checks freshness locally from getPrice().updated_at
#  - getMarkets no longer mutates loaded state
#  NOTE: amounts are still bookkeeping only (no token transfer / payout yet).
from genlayer import *
import json

TIME_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC"
CONDITIONS = ("gt", "lt", "eq", "contains")


class PredictionMarket(gl.Contract):
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

    def _sender(self) -> str:
        return str(gl.message.sender_address)

    def _load(self, market_id: int):
        data = json.loads(self.store)
        mid = str(market_id)
        market = data.get(mid)
        if market is None:
            raise Exception("market not found")
        return data, mid, market

    # ── views ───────────────────────────────────────────────────────
    @gl.public.view
    def getMarket(self, market_id: int) -> str:
        entry = json.loads(self.store).get(str(market_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        return json.dumps(entry, sort_keys=True)

    @gl.public.view
    def getMarkets(self) -> str:
        data = json.loads(self.store)
        return json.dumps([dict(m, id=int(mid)) for mid, m in data.items()], sort_keys=True)

    @gl.public.view
    def getMyPredictions(self, wallet: str) -> str:
        data = json.loads(self.store)
        out = []
        for mid, m in data.items():
            preds = m.get("predictions", {})
            if wallet in preds:
                out.append(dict(m, id=int(mid), my_prediction=preds[wallet]))
        return json.dumps(out, sort_keys=True)

    # ── writes ──────────────────────────────────────────────────────
    @gl.public.write
    def createMarket(self, question: str, source_url: str, target_value: str, condition: str, resolves_at: int) -> int:
        if condition not in CONDITIONS:
            raise Exception("condition must be one of gt, lt, eq, contains")
        if not source_url.startswith("https://"):
            raise Exception("source_url must be https")
        now = self._now()
        if resolves_at <= now:
            raise Exception("resolves_at must be in the future")

        data = json.loads(self.store)
        next_id = len(data) + 1
        data[str(next_id)] = {
            "question": question,
            "source_url": source_url,
            "target_value": target_value,
            "condition": condition,
            "resolves_at": resolves_at,
            "resolved": False,
            "outcome": "",
            "yes_pool": 0,
            "no_pool": 0,
            "predictions": {},
            "creator": self._sender(),
            "created_at": now,
        }
        self.store = json.dumps(data, sort_keys=True)
        return next_id

    @gl.public.write
    def predict(self, market_id: int, outcome: int, amount: int) -> str:
        if outcome not in (0, 1):
            raise Exception("outcome must be 0 (NO) or 1 (YES)")
        if amount <= 0:
            raise Exception("amount must be positive")
        data, mid, market = self._load(market_id)
        if market["resolved"]:
            raise Exception("market already resolved")
        if self._now() >= market["resolves_at"]:
            raise Exception("market closed for predictions")
        sender = self._sender()
        if sender in market["predictions"]:
            raise Exception("already predicted")

        market["predictions"][sender] = {"outcome": outcome, "amount": amount}
        market["yes_pool" if outcome == 1 else "no_pool"] += amount
        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"market_id": market_id, "outcome": outcome, "amount": amount})

    @gl.public.write
    def resolveMarket(self, market_id: int, oracle_addr: str = "") -> str:
        data, mid, market = self._load(market_id)
        if market["resolved"]:
            raise Exception("already resolved")
        now = self._now()
        if now < market["resolves_at"]:
            raise Exception("too early to resolve")

        src, value, cond = market["source_url"], market["target_value"], market["condition"]

        def decide() -> str:
            raw = gl.nondet.web.render(src, mode="text")
            if raw is None or raw.strip() == "":
                return "no_result"
            try:
                if cond == "contains":
                    return "yes" if value.lower() in raw.lower() else "no"
                price = float(json.loads(raw)["lastPrice"])
                if cond == "gt":
                    return "yes" if price > float(value) else "no"
                if cond == "lt":
                    return "yes" if price < float(value) else "no"
                if cond == "eq":
                    t = float(value)
                    return "yes" if abs(price - t) / max(abs(t), 1e-9) < 0.01 else "no"
            except Exception:
                return "no_result"
            return "no_result"

        outcome = str(gl.eq_principle.strict_eq(decide))
        if outcome not in ("yes", "no"):
            raise Exception("source gave no result, market stays open, retry later")

        market.update({"resolved": True, "outcome": outcome, "resolved_at": now})
        if oracle_addr:
            market["oracle"] = oracle_addr
        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"market_id": market_id, "outcome": outcome})

    @gl.public.write
    def resolveWithOracle(self, market_id: int, oracle_addr: str, symbol: str, max_age: int) -> str:
        data, mid, market = self._load(market_id)
        if market["resolved"]:
            raise Exception("already resolved")
        if market["condition"] not in ("gt", "lt", "eq"):
            raise Exception("oracle resolution supports gt / lt / eq only")
        now = self._now()
        if now < market["resolves_at"]:
            raise Exception("too early to resolve")

        oracle = gl.Contract.at(oracle_addr)  # keep the same call style you already use
        price_data = json.loads(str(oracle.getPrice(symbol)))
        if price_data.get("status") != "ok":
            raise Exception("oracle price unavailable")
        age = now - int(price_data.get("updated_at", 0))
        if age < 0 or age > max_age:
            raise Exception("oracle price not fresh (age " + str(age) + "s)")

        price, target, cond = float(price_data["price"]), float(market["target_value"]), market["condition"]
        if cond == "gt":
            outcome = "yes" if price > target else "no"
        elif cond == "lt":
            outcome = "yes" if price < target else "no"
        else:
            outcome = "yes" if abs(price - target) / max(abs(target), 1e-9) < 0.01 else "no"

        market.update({
            "resolved": True, "outcome": outcome, "resolved_at": now,
            "oracle": oracle_addr, "oracle_price": price, "oracle_age": age,
        })
        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"market_id": market_id, "outcome": outcome, "oracle_price": price, "oracle_age": age})

    @gl.public.view
    def getVersion(self) -> str:
        return json.dumps({"name": "PredictionMarket", "version": "2.1.0"})
