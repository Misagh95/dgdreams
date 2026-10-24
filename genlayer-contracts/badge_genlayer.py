# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

BASE = "https://dgdreams.space/api/badge"
CHAIN_ID = 4221
VERSION = "2.0.0"


class ChainBadge(gl.Contract):
    store: str

    def __init__(self):
        # owners: tokenId -> address, counts: address -> minted count,
        # last: address -> most recent tokenId, minted: running total.
        self.store = json.dumps(
            {"owners": {}, "counts": {}, "last": {}, "minted": 0}, sort_keys=True
        )

    # ── writes ──────────────────────────────────────────────────────
    @gl.public.write
    def mint(self) -> str:
        # Unlimited: a wallet may mint as many badges as it likes.
        addr = str(gl.message.sender_address).lower()
        data = json.loads(self.store)
        data["minted"] = int(data["minted"]) + 1
        token_id = data["minted"]
        data["owners"][str(token_id)] = addr
        data["counts"][addr] = int(data["counts"].get(addr, 0)) + 1
        data["last"][addr] = token_id
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"ok": True, "tokenId": token_id})

    # ── views ───────────────────────────────────────────────────────
    @gl.public.view
    def mintCount(self, addr: str) -> int:
        counts = json.loads(self.store)["counts"]
        return int(counts.get(str(addr).lower(), 0))

    @gl.public.view
    def userTokenId(self, addr: str) -> int:
        last = json.loads(self.store)["last"]
        return int(last.get(str(addr).lower(), 0))

    @gl.public.view
    def totalMinted(self) -> int:
        return int(json.loads(self.store)["minted"])

    @gl.public.view
    def tokenURI(self, _token_id: int) -> str:
        return "{0}?chain={1}&id={2}".format(BASE, CHAIN_ID, int(_token_id))

    @gl.public.view
    def ownerOf(self, _token_id: int) -> str:
        owners = json.loads(self.store)["owners"]
        return str(owners.get(str(int(_token_id)), ""))

    @gl.public.view
    def version(self) -> str:
        return VERSION
