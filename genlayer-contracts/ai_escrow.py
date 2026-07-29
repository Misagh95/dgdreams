# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class AIEscrow(gl.Contract):
    store: str

    def __init__(self):
        self.store = "{}"

    @gl.public.view
    def getEscrow(self, escrow_id: int) -> str:
        data = json.loads(self.store)
        entry = data.get(str(escrow_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        return json.dumps(entry, sort_keys=True)

    @gl.public.view
    def getEscrowsByParty(self, party: str) -> str:
        data = json.loads(self.store)
        result = []
        for eid, escrow in data.items():
            if escrow.get("party_a") == party or escrow.get("party_b") == party:
                escrow["id"] = int(eid)
                result.append(escrow)
        return json.dumps(result, sort_keys=True)

    @gl.public.write
    def createEscrow(self, party_b: str, terms: str, amount: int) -> str:
        data = json.loads(self.store)
        eid = str(len(data) + 1)
        escrow = {
            "escrow_id": int(eid),
            "party_a": gl.message.sender(),
            "party_b": party_b,
            "amount": amount,
            "terms": terms,
            "status": "pending",
            "winner": "",
            "evidence_a": "",
            "evidence_b": "",
        }
        data[eid] = escrow
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps(escrow, sort_keys=True)

    @gl.public.write
    def acceptEscrow(self, escrow_id: int) -> str:
        data = json.loads(self.store)
        entry = data.get(str(escrow_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        if entry["status"] != "pending":
            return json.dumps({"error": "wrong status", "status": entry["status"]})
        if gl.message.sender() != entry["party_b"]:
            return json.dumps({"error": "only party_b can accept"})
        entry["status"] = "active"
        data[str(escrow_id)] = entry
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"escrow_id": escrow_id, "status": "active"})

    @gl.public.write
    def releaseFunds(self, escrow_id: int) -> str:
        data = json.loads(self.store)
        entry = data.get(str(escrow_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        if entry["status"] not in ("active", "disputed"):
            return json.dumps({"error": "wrong status", "status": entry["status"]})
        if gl.message.sender() not in (entry["party_a"], entry["party_b"]):
            return json.dumps({"error": "only parties can release"})
        entry["status"] = "released"
        entry["winner"] = gl.message.sender()
        data[str(escrow_id)] = entry
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"escrow_id": escrow_id, "status": "released", "winner": gl.message.sender()})

    @gl.public.write
    def raiseDispute(self, escrow_id: int, evidence: str) -> str:
        data = json.loads(self.store)
        entry = data.get(str(escrow_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        if entry["status"] not in ("active", "disputed"):
            return json.dumps({"error": "wrong status", "status": entry["status"]})
        sender = gl.message.sender()
        if sender == entry["party_a"]:
            entry["evidence_a"] = evidence
        elif sender == entry["party_b"]:
            entry["evidence_b"] = evidence
        else:
            return json.dumps({"error": "only parties can dispute"})
        if entry["evidence_a"] and entry["evidence_b"]:
            entry["status"] = "disputed"
        data[str(escrow_id)] = entry
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"escrow_id": escrow_id, "status": entry["status"]})

    @gl.public.write
    def resolveDispute(self, escrow_id: int) -> str:
        data = json.loads(self.store)
        entry = data.get(str(escrow_id))
        if entry is None:
            return json.dumps({"error": "not found"})
        if entry["status"] != "disputed":
            return json.dumps({"error": "not disputed", "status": entry["status"]})

        def decide() -> str:
            raw = gl.nondet.web.render("https://proof-of-delivery.genlayer.com/verify", mode="text")
            if raw is not None and entry["party_b"] in str(raw) and entry["party_a"] not in str(raw):
                return entry["party_b"]
            return entry["party_a"]

        winner = gl.eq_principle.strict_eq(decide)
        entry["status"] = "resolved"
        entry["winner"] = str(winner)
        data[str(escrow_id)] = entry
        self.store = json.dumps(data, sort_keys=True)
        return json.dumps({"escrow_id": escrow_id, "status": "resolved", "winner": str(winner)})
