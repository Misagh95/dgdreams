# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class PredictionMarket(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    @gl.public.view
    def getMarket(self, market_id: int) -> str:
        data = json.loads(self.store)
        entry = data.get(str(market_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        return json.dumps(entry, sort_keys=True)

    @gl.public.view
    def getMarkets(self) -> str:
        data = json.loads(self.store)
        result = []
        for mid, market in data.items():
            market["id"] = int(mid)
            result.append(market)
        return json.dumps(result, sort_keys=True)

    @gl.public.view
    def getMyPredictions(self, wallet: str) -> str:
        data = json.loads(self.store)
        result = []
        for mid, market in data.items():
            preds = market.get("predictions", {})
            if wallet in preds:
                m = dict(market)
                m["id"] = int(mid)
                m["my_prediction"] = preds[wallet]
                result.append(m)
        return json.dumps(result, sort_keys=True)

    @gl.public.write
    def createMarket(self, question: str, source_url: str, target_value: str, condition: str, resolves_at: int) -> int:
        data = json.loads(self.store)
        next_id = len(data) + 1
        mid = str(next_id)
        market = {
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
            "creator": gl.message.sender(),
            "created_at": resolves_at,
        }
        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return next_id

    @gl.public.write
    def predict(self, market_id: int, outcome: int, amount: int) -> str:
        if outcome not in (0, 1):
            return json.dumps({"error": "outcome must be 0 (NO) or 1 (YES)"})
        data = json.loads(self.store)
        mid = str(market_id)
        market = data.get(mid)
        if market is None:
            return json.dumps({"error": "market not found"})
        if market["resolved"]:
            return json.dumps({"error": "market already resolved"})
        sender = gl.message.sender()
        preds = market["predictions"]
        if sender in preds:
            return json.dumps({"error": "already predicted"})
        preds[sender] = {"outcome": outcome, "amount": amount}
        if outcome == 1:
            market["yes_pool"] += amount
        else:
            market["no_pool"] += amount
        market["predictions"] = preds
        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"market_id": market_id, "outcome": outcome, "amount": amount})

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

    @gl.public.write
    def resolveMarket(self, market_id: int, oracle_addr: str = "") -> str:
        data = json.loads(self.store)
        mid = str(market_id)
        market = data.get(mid)
        if market is None:
            return json.dumps({"error": "market not found"})
        if market["resolved"]:
            return json.dumps({"error": "already resolved", "outcome": market["outcome"]})

        def decide() -> str:
            raw = gl.nondet.web.render(market["source_url"], mode="text")
            if raw is None or raw.strip() == "":
                return "no_result"
            value = market["target_value"]
            cond = market["condition"]
            result = "no_result"
            try:
                j = json.loads(raw)
                if cond == "gt":
                    if float(value) > 0 and float(j["lastPrice"]) > float(value):
                        result = "yes"
                    else:
                        result = "no"
                elif cond == "lt":
                    if float(value) > 0 and float(j["lastPrice"]) < float(value):
                        result = "yes"
                    else:
                        result = "no"
                elif cond == "eq":
                    if str(j.get("lastPrice", "")).strip() == value.strip():
                        result = "yes"
                    else:
                        result = "no"
                elif cond == "contains":
                    if value.lower() in str(raw).lower():
                        result = "yes"
                    else:
                        result = "no"
                else:
                    result = "no_result"
            except Exception:
                result = "no_result"
            return result

        outcome = str(gl.eq_principle.prompt_comparative(
            decide,
            "Two outcomes are equivalent if they are the same word: 'yes', 'no', or 'no_result'."
        ))
        market["resolved"] = True
        market["outcome"] = outcome
        market["resolved_at"] = self._now()

        # If oracle address provided, store reference for audit trail
        if oracle_addr != "":
            market["oracle"] = oracle_addr

        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"market_id": market_id, "outcome": outcome, "oracle": oracle_addr})

    @gl.public.write
    def resolveWithOracle(self, market_id: int, oracle_addr: str, symbol: str, max_age: int) -> str:
        data = json.loads(self.store)
        mid = str(market_id)
        market = data.get(mid)
        if market is None:
            return json.dumps({"error": "market not found"})
        if market["resolved"]:
            return json.dumps({"error": "already resolved", "outcome": market["outcome"]})

        oracle = gl.Contract.at(oracle_addr)
        fresh_raw = str(oracle.isFresh(symbol, max_age))
        fresh_info = json.loads(fresh_raw)
        if not fresh_info.get("fresh", False):
            return json.dumps({"error": "oracle price not fresh", "fresh_info": fresh_info})

        price_raw = str(oracle.getPrice(symbol))
        price_data = json.loads(price_raw)
        if price_data.get("status") != "ok":
            return json.dumps({"error": "oracle price unavailable", "price_data": price_data})

        current_price = price_data["price"]
        value = float(market["target_value"])
        cond = market["condition"]

        if cond == "gt":
            outcome = "yes" if current_price > value else "no"
        elif cond == "lt":
            outcome = "yes" if current_price < value else "no"
        elif cond == "eq":
            outcome = "yes" if abs(current_price - value) / max(value, 1) < 0.01 else "no"
        elif cond == "contains":
            outcome = "yes" if str(value) in str(current_price) else "no"
        else:
            outcome = "no_result"

        market["resolved"] = True
        market["outcome"] = outcome
        market["resolved_at"] = self._now()
        market["oracle"] = oracle_addr
        market["oracle_price"] = current_price
        market["oracle_fresh"] = fresh_info

        data[mid] = market
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"market_id": market_id, "outcome": outcome, "oracle_price": current_price, "oracle_fresh": fresh_info})

    @gl.public.view
    def getVersion(self) -> str:
        return json.dumps({"name": "PredictionMarket", "version": "2.0.0"})
