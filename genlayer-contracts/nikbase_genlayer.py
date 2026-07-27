# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class NikBase(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    @gl.public.write
    def dailyCheckIn(self) -> str:
        return self._exec("checkIn")

    @gl.public.write
    def reception(self) -> None:
        self._exec("reception")

    @gl.public.write
    def gm(self) -> None:
        self._exec("gm")

    @gl.public.write
    def gn(self) -> None:
        self._exec("gn")

    @gl.public.write
    def takeDose(self) -> None:
        self._exec("dose")

    @gl.public.write
    def moodCheck(self, _mood: str) -> None:
        self._exec("mood")

    @gl.public.write
    def sanitizeWallet(self) -> None:
        self._exec("sanitize")

    @gl.public.write
    def incrementCounter(self) -> None:
        self._exec("counter")

    @gl.public.write
    def luckySpin(self) -> str:
        self._exec("spin")
        return "42"

    @gl.public.view
    def getActionCounts(self, addr: str) -> str:
        data = json.loads(self.store)
        user = data.get(addr)
        if user is None:
            return json.dumps([0, 0, 0, 0, 0, 0])
        return json.dumps([
            user["actionCount"],
            user["doseCount"],
            user["moodCount"],
            user["sanitizeCount"],
            user["counterValue"],
            user["spinCount"],
        ])

    @gl.public.view
    def getUserData(self, addr: str) -> str:
        data = json.loads(self.store)
        user = data.get(addr)
        if user is None:
            return json.dumps([0, 0, 0])
        return json.dumps([
            user["streak"],
            user["totalCheckIns"],
            user["totalActions"],
        ])

    def _ensure(self, addr: str) -> dict:
        data = json.loads(self.store)
        if addr not in data:
            data[addr] = {
                "streak": 0, "lastCheckIn": 0,
                "totalCheckIns": 0, "totalActions": 0,
                "actionCount": 0, "doseCount": 0,
                "moodCount": 0, "sanitizeCount": 0,
                "counterValue": 0, "spinCount": 0,
                "lastResetDay": 0,
            }
            self.store = json.dumps(data, sort_keys=True)
        return data

    def _exec(self, action: str) -> str:
        addr = str(gl.message.sender_address)
        data = json.loads(self.store)
        if addr not in data:
            data[addr] = {
                "streak": 0, "lastCheckIn": 0,
                "totalCheckIns": 0, "totalActions": 0,
                "actionCount": 0, "doseCount": 0,
                "moodCount": 0, "sanitizeCount": 0,
                "counterValue": 0, "spinCount": 0,
                "lastResetDay": 0,
            }
        u = data[addr]
        now = 1234567890
        now_days = now // 86400
        if now_days != u["lastResetDay"]:
            u["actionCount"] = 0
            u["lastResetDay"] = now_days
        u["totalActions"] += 1
        u["actionCount"] += 1
        if action == "checkIn":
            if u["lastCheckIn"] > 0 and now > u["lastCheckIn"] + 172800:
                u["streak"] = 0
            u["streak"] += 1
            u["lastCheckIn"] = now
            u["totalCheckIns"] += 1
        elif action == "dose":
            u["doseCount"] += 1
        elif action == "mood":
            u["moodCount"] += 1
        elif action == "sanitize":
            u["sanitizeCount"] += 1
        elif action == "counter":
            u["counterValue"] += 1
        elif action == "spin":
            u["spinCount"] += 1
        data[addr] = u
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps(u)
