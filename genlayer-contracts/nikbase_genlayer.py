# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class NikBase(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    @gl.public.write
    def dailyCheckIn(self) -> str:
        addr = str(gl.message.sender_address)
        now = 1234567890
        data = json.loads(self.store)
        if addr not in data:
            data[addr] = {"streak": 0, "count": 0}
        data[addr]["streak"] += 1
        data[addr]["count"] += 1
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps(data[addr])

    @gl.public.write
    def gm(self) -> None:
        addr = str(gl.message.sender_address)
        data = json.loads(self.store)
        if addr not in data:
            data[addr] = {"streak": 0, "count": 0}
        data[addr]["count"] += 1
        self.store = json.dumps(data, sort_keys=True)

    @gl.public.write
    def gn(self) -> None:
        addr = str(gl.message.sender_address)
        data = json.loads(self.store)
        if addr not in data:
            data[addr] = {"streak": 0, "count": 0}
        data[addr]["count"] += 1
        self.store = json.dumps(data, sort_keys=True)

    @gl.public.view
    def getData(self, addr: str) -> str:
        data = json.loads(self.store)
        user = data.get(addr)
        if user is None:
            return json.dumps({"streak": 0, "count": 0})
        return json.dumps(user)
