# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# NikBase (GenLayer) v1.1.0
#  - duplicate actions now RAISE (tx fails) instead of returning an error JSON
#  - time is fetched ONCE per tx, as a UTC day number agreed via strict_eq
#  - time API failure raises instead of silently writing "day 0"
#  - streak is day-based (missed a calendar day -> reset), not "48 hours"
#  - all per-day counters reset at the UTC day boundary
from genlayer import *
import json

TIME_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC"
VALID_MOODS = ("happy", "sad", "angry", "surprised")
DAILY_LIMITS = {"dose": 3, "mood": 3, "sanitize": 3, "spin": 3}  # counter is a lifetime value, no daily cap
ONCE_PER_DAY = ("checkIn", "reception", "gm", "gn")


def _new_user() -> dict:
    return {
        "streak": 0, "lastCheckInDay": 0,
        "totalCheckIns": 0, "totalActions": 0,
        "actionCount": 0, "doseCount": 0,
        "moodCount": 0, "sanitizeCount": 0,
        "counterValue": 0, "spinCount": 0,
        "lastResetDay": 0,
        "lastActions": {},
    }


class NikBase(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    # ── time ────────────────────────────────────────────────────────
    def _today(self) -> int:
        def fetch_day() -> str:
            raw = gl.nondet.web.render(TIME_URL, mode="text")
            j = json.loads(raw)
            return str(int(j["unixtime"]) // 86400)

        day = int(gl.eq_principle.strict_eq(fetch_day))
        if day <= 0:
            raise Exception("time source unavailable, try again")
        return day

    # ── writes ──────────────────────────────────────────────────────
    @gl.public.write
    def dailyCheckIn(self) -> str:
        return self._exec("checkIn")

    @gl.public.write
    def reception(self) -> str:
        return self._exec("reception")

    @gl.public.write
    def gm(self) -> str:
        return self._exec("gm")

    @gl.public.write
    def gn(self) -> str:
        return self._exec("gn")

    @gl.public.write
    def takeDose(self) -> str:
        return self._exec("dose")

    @gl.public.write
    def moodCheck(self, _mood: str) -> str:
        if _mood not in VALID_MOODS:
            raise Exception("invalid mood")
        return self._exec("mood")

    @gl.public.write
    def sanitizeWallet(self) -> str:
        return self._exec("sanitize")

    @gl.public.write
    def incrementCounter(self) -> str:
        return self._exec("counter")

    @gl.public.write
    def luckySpin(self) -> str:
        return self._exec("spin")

    # ── views ───────────────────────────────────────────────────────
    @gl.public.view
    def getActionCounts(self, addr: str) -> str:
        u = json.loads(self.store).get(addr)
        if u is None:
            return json.dumps([0, 0, 0, 0, 0, 0])
        return json.dumps([u["actionCount"], u["doseCount"], u["moodCount"],
                           u["sanitizeCount"], u["counterValue"], u["spinCount"]])

    @gl.public.view
    def getUserData(self, addr: str) -> str:
        u = json.loads(self.store).get(addr)
        if u is None:
            return json.dumps([0, 0, 0])
        return json.dumps([u["streak"], u["totalCheckIns"], u["totalActions"]])

    @gl.public.view
    def getLastActions(self, addr: str) -> str:
        """Day number of the last time each action ran. Frontend compares with today."""
        u = json.loads(self.store).get(addr)
        return json.dumps({} if u is None else u["lastActions"])

    # ── core ────────────────────────────────────────────────────────
    def _exec(self, action: str) -> str:
        addr = str(gl.message.sender_address)
        today = self._today()  # single nondet call per tx

        data = json.loads(self.store)
        u = data.get(addr) or _new_user()

        if u["lastResetDay"] != today:
            u["actionCount"] = 0
            u["doseCount"] = 0
            u["moodCount"] = 0
            u["sanitizeCount"] = 0
            u["spinCount"] = 0
            u["lastResetDay"] = today

        if action in ONCE_PER_DAY and u["lastActions"].get(action, 0) == today:
            raise Exception("already done today: " + action)

        limit = DAILY_LIMITS.get(action)
        key = {"dose": "doseCount", "mood": "moodCount", "sanitize": "sanitizeCount",
               "counter": "counterValue", "spin": "spinCount"}.get(action)
        if limit is not None and u[key] >= limit:
            raise Exception("daily limit reached: " + action)

        u["lastActions"][action] = today
        u["totalActions"] += 1
        u["actionCount"] += 1

        if action == "checkIn":
            last = u["lastCheckInDay"]
            u["streak"] = u["streak"] + 1 if (last > 0 and last + 1 == today) else 1
            u["lastCheckInDay"] = today
            u["totalCheckIns"] += 1
        elif key is not None:
            u[key] += 1

        data[addr] = u
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"ok": True, "action": action, "streak": u["streak"]})
