# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from genlayer import allow_storage
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class UserData:
    streak: u256
    lastCheckIn: u256
    totalCheckIns: u256
    totalActions: u256
    actionCount: u256
    doseCount: u256
    moodCount: u256
    sanitizeCount: u256
    counterValue: u256
    spinCount: u256
    lastResetDay: u256


class NikBase(gl.Contract):
    users: TreeMap[Address, UserData]

    @gl.public.write
    def dailyCheckIn(self) -> u256:
        return self._exec("checkIn")

    @gl.public.write
    def reception(self):
        self._exec("reception")

    @gl.public.write
    def gm(self):
        self._exec("gm")

    @gl.public.write
    def gn(self):
        self._exec("gn")

    @gl.public.write
    def takeDose(self):
        self._exec("dose")

    @gl.public.write
    def moodCheck(self, _mood: str):
        self._exec("mood")

    @gl.public.write
    def sanitizeWallet(self):
        self._exec("sanitize")

    @gl.public.write
    def incrementCounter(self):
        self._exec("counter")

    @gl.public.write
    def luckySpin(self) -> u256:
        self._exec("spin")
        return u256(42)

    @gl.public.view
    def getActionCounts(self, addr: Address) -> str:
        user = self.users.get(addr)
        if user is None:
            return json.dumps([0, 0, 0, 0, 0, 0])
        return json.dumps([
            int(user.actionCount),
            int(user.doseCount),
            int(user.moodCount),
            int(user.sanitizeCount),
            int(user.counterValue),
            int(user.spinCount),
        ])

    @gl.public.view
    def getUserData(self, addr: Address) -> str:
        user = self.users.get(addr)
        if user is None:
            return json.dumps([0, 0, 0])
        return json.dumps([
            int(user.streak),
            int(user.totalCheckIns),
            int(user.totalActions),
        ])

    def _ensure(self, addr: Address) -> UserData:
        user = self.users.get(addr)
        if user is None:
            user = UserData(
                streak=u256(0), lastCheckIn=u256(0),
                totalCheckIns=u256(0), totalActions=u256(0),
                actionCount=u256(0), doseCount=u256(0),
                moodCount=u256(0), sanitizeCount=u256(0),
                counterValue=u256(0), spinCount=u256(0),
                lastResetDay=u256(0),
            )
            self.users[addr] = user
        return user

    def _daily_reset(self, u: UserData) -> UserData:
        now = u256(int(__import__("time").time()) // 86400)
        if now != u.lastResetDay:
            u.actionCount = u256(0)
            u.lastResetDay = now
        return u

    def _exec(self, action: str):
        addr = gl.message.sender_address
        u = self._ensure(addr)
        u = self._daily_reset(u)
        u.totalActions += u256(1)
        u.actionCount += u256(1)
        if action == "checkIn":
            now = u256(int(__import__("time").time()))
            if u.lastCheckIn > u256(0) and now > u.lastCheckIn + u256(172800):
                u.streak = u256(0)
            u.streak += u256(1)
            u.lastCheckIn = now
            u.totalCheckIns += u256(1)
        elif action == "dose":
            u.doseCount += u256(1)
        elif action == "mood":
            u.moodCount += u256(1)
        elif action == "sanitize":
            u.sanitizeCount += u256(1)
        elif action == "counter":
            u.counterValue += u256(1)
        elif action == "spin":
            u.spinCount += u256(1)
        self.users[addr] = u
