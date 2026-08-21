# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# TruthCourt — a decentralized fact-check bounty market
#
# An Intelligent Contract for GenLayer. Anyone can post a factual claim and
# stake GEN behind it. Anyone who disagrees can challenge it with an equal
# stake. Once contested, the contract fetches the evidence URLs provided by
# both sides LIVE from the web, asks an LLM to adjudicate, and validators
# independently re-run the adjudication and agree on the verdict under the
# Equivalence Principle. The losing side's bond is paid to the winner (minus a
# protocol fee); if the claim is unverifiable, both bonds are returned.
#
# This creates skin-in-the-game: you only post claims you believe, and you
# only challenge claims you can refute.

from genlayer import *
from genlayer import allow_storage
from dataclasses import dataclass
import json
import re
import typing


BPS_DENOM = 10_000

VERDICT_TRUE = "true"
VERDICT_FALSE = "false"
VERDICT_UNVERIFIABLE = "unverifiable"

STATUS_OPEN = "open"
STATUS_CONTESTED = "contested"
STATUS_RESOLVED = "resolved"

# Safety caps so resolution cost stays bounded regardless of input.
# Each party (poster and challenger) gets an independent budget so neither can
# exclude the other side's evidence before settlement.
MAX_EVIDENCE_URLS_PER_PARTY = 6
MAX_BODY_CHARS = 4000


@dataclass
@allow_storage
class Claim:
    """State of a single claim in the market."""
    id: u256
    text: str
    evidence_urls: DynArray[str]
    poster: str                 # address (hex string)
    bond: u256                  # amount the poster staked
    challenger: str             # "" while uncontested
    challenger_urls: DynArray[str]
    status: str                 # open | contested | resolved
    verdict: str                # "" | true | false | unverifiable
    reasoning: str              # LLM explanation, stored but not consensus-compared


class TruthCourt(gl.Contract):
    """A market where truth claims are settled by stake + live evidence + AI consensus."""

    claims: TreeMap[u256, Claim]
    payouts: TreeMap[str, u256]   # withdrawable winnings, keyed by address
    treasury: str                     # address that collects protocol fees
    fee_bps: u256                     # protocol fee in basis points (250 == 2.5%)
    next_id: u256

    def __init__(self, treasury: str, fee_bps: int = 250):
        self.claims = gl.storage.inmem_allocate(TreeMap[u256, Claim])
        self.payouts = gl.storage.inmem_allocate(TreeMap[str, u256])
        self.treasury = treasury
        if fee_bps < 0 or fee_bps > 5000:
            raise gl.vm.UserError("fee_bps must be between 0 and 5000")
        self.fee_bps = u256(fee_bps)
        self.next_id = u256(1)

    # ------------------------------------------------------------------ #
    # Views
    # ------------------------------------------------------------------ #

    @gl.public.view
    def get_config(self) -> str:
        return json.dumps({
            "fee_bps": int(self.fee_bps),
            "treasury": self.treasury,
        }, sort_keys=True)

    @gl.public.view
    def get_claim_count(self) -> int:
        return int(self.next_id - 1)

    @gl.public.view
    def get_claim(self, claim_id: int) -> str:
        claim = self.claims.get(claim_id)
        if claim is None:
            raise gl.vm.UserError("claim not found")
        return json.dumps(self._claim_to_dict(claim), sort_keys=True)

    @gl.public.view
    def get_claims(self, offset: int = 0, limit: int = 50) -> typing.List[str]:
        """Return a page of claims (JSON-encoded), newest first."""
        ids = sorted(self.claims.keys(), reverse=True)[offset:offset + limit]
        return [json.dumps(self._claim_to_dict(self.claims[i]), sort_keys=True)
                for i in ids]

    @gl.public.view
    def get_payout(self, address: str) -> int:
        return int(self.payouts.get(address, u256(0)))

    # ------------------------------------------------------------------ #
    # Writes
    # ------------------------------------------------------------------ #

    @gl.public.write.payable
    def submit_claim(self, text: str, evidence_urls: typing.List[str]) -> int:
        """Post a claim and stake GEN behind it. Returns the claim id."""
        if not text or not text.strip():
            raise gl.vm.UserError("claim text must not be empty")
        if not evidence_urls:
            raise gl.vm.UserError("at least one evidence URL is required")
        bond = gl.message.value
        if bond <= u256(0):
            raise gl.vm.UserError("must stake a positive bond")

        urls = self._clean_urls(evidence_urls)
        if not urls:
            raise gl.vm.UserError("no valid evidence URLs provided")

        claim_id = self.next_id
        self.next_id += 1
        self.claims[claim_id] = Claim(
            id=claim_id,
            text=text.strip(),
            evidence_urls=urls,
            poster=str(gl.message.sender_address),
            bond=bond,
            challenger="",
            challenger_urls=[],
            status=STATUS_OPEN,
            verdict="",
            reasoning="",
        )
        return int(claim_id)

    @gl.public.write.payable
    def challenge_claim(self, claim_id: int, evidence_urls: typing.List[str]) -> None:
        """Challenge an open claim with an equal stake and your own evidence."""
        claim = self._require_claim(claim_id)
        if claim.status != STATUS_OPEN:
            raise gl.vm.UserError("claim is not open for challenge")
        if claim.poster == str(gl.message.sender_address):
            raise gl.vm.UserError("cannot challenge your own claim")
        if gl.message.value != claim.bond:
            raise gl.vm.UserError("challenge stake must match the claim's bond exactly")

        urls = self._clean_urls(evidence_urls)
        if not urls:
            raise gl.vm.UserError("no valid evidence URLs provided")

        claim.challenger = str(gl.message.sender_address)
        claim.challenger_urls = urls
        claim.status = STATUS_CONTESTED

    @gl.public.write
    def cancel_claim(self, claim_id: int) -> None:
        """An unchallenged poster may withdraw their claim and get the bond back."""
        claim = self._require_claim(claim_id)
        if claim.poster != str(gl.message.sender_address):
            raise gl.vm.UserError("only the poster may cancel")
        if claim.status != STATUS_OPEN:
            raise gl.vm.UserError("only open claims can be cancelled")
        self._credit(claim.poster, claim.bond)
        claim.status = STATUS_RESOLVED
        claim.verdict = "cancelled"

    @gl.public.write
    def resolve_claim(self, claim_id: int) -> str:
        """Adjudicate a contested claim using live web evidence + LLM consensus."""
        claim = self._require_claim(claim_id)
        if claim.status != STATUS_CONTESTED:
            raise gl.vm.UserError("claim is not contested")

        result = self._adjudicate(
            claim.text,
            claim.evidence_urls,
            claim.challenger_urls,
        )
        verdict = result["verdict"]
        reasoning = result["reasoning"]

        claim.verdict = verdict
        claim.reasoning = reasoning
        claim.status = STATUS_RESOLVED

        if verdict == VERDICT_TRUE:
            # Poster was right: challenger loses their bond (minus fee).
            self._settle(winner=claim.poster, loser_bond=claim.bond)
            self._credit(claim.poster, claim.bond)  # return poster's own bond
        elif verdict == VERDICT_FALSE:
            # Challenger was right: poster loses their bond (minus fee).
            self._settle(winner=claim.challenger, loser_bond=claim.bond)
            self._credit(claim.challenger, claim.bond)  # return challenger's own bond
        else:  # unverifiable
            # No one proved anything: refund both sides.
            self._credit(claim.poster, claim.bond)
            self._credit(claim.challenger, claim.bond)

        return json.dumps({"verdict": verdict, "reasoning": reasoning}, sort_keys=True)

    @gl.public.write
    def withdraw(self) -> None:
        """Withdraw any accumulated payout to the sender."""
        sender = str(gl.message.sender_address)
        amount = self.payouts.get(sender, u256(0))
        if amount <= u256(0):
            raise gl.vm.UserError("no payout available")
        if self.balance < amount:
            raise gl.vm.UserError("contract has insufficient balance")
        self.payouts[sender] = u256(0)
        to = gl.message.sender_address
        if not isinstance(to, Address):
            to = Address(to)
        gl.get_contract_at(to).emit_transfer(value=amount)

    # ------------------------------------------------------------------ #
    # Non-deterministic adjudication (Equivalence Principle)
    # ------------------------------------------------------------------ #

    def _adjudicate(self, text: str, poster_urls: typing.List[str],
                    challenger_urls: typing.List[str]) -> dict:
        """Fetch evidence live and ask an LLM for a verdict, verified by validators."""
        urls = poster_urls[:MAX_EVIDENCE_URLS_PER_PARTY] + challenger_urls[:MAX_EVIDENCE_URLS_PER_PARTY]

        def leader_fn() -> dict:
            evidence = self._fetch_evidence(urls)
            raw = gl.nondet.exec_prompt(self._build_prompt(text, evidence))
            return self._parse_verdict(raw)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata
            if not isinstance(leader_data, dict) or leader_data.get("verdict") not in (
                VERDICT_TRUE, VERDICT_FALSE, VERDICT_UNVERIFIABLE,
            ):
                return False
            # Independently re-run: fetch evidence + LLM, then compare the decision
            # field only. Two LLMs will word their reasoning differently.
            try:
                validator_data = leader_fn()
            except Exception:
                return False
            return validator_data["verdict"] == leader_data["verdict"]

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _fetch_evidence(self, urls: typing.List[str]) -> typing.List[dict]:
        evidence = []
        for url in urls:
            try:
                resp = gl.nondet.web.get(url)
                body = resp.body.decode("utf-8", "ignore")
                # Spend the LLM's attention budget on content, not markup.
                text = self._html_to_text(body)[:MAX_BODY_CHARS]
                evidence.append({"url": url, "body": text})
            except Exception:
                # Unreachable source: skip rather than fail the whole resolution.
                continue
        return evidence

    @staticmethod
    def _html_to_text(raw: str) -> str:
        """Crude HTML -> plain text. Deterministic and defensive: on any
        failure the raw body is returned so resolution never breaks."""
        try:
            t = re.sub(r"(?is)<(script|style|noscript)\b[^>]*>.*?</\1\s*>", " ", raw)
            t = re.sub(r"(?s)<[^>]+>", " ", t)
            try:
                import html as _html

                t = _html.unescape(t)
            except Exception:
                pass
            return re.sub(r"\s+", " ", t).strip()
        except Exception:
            return raw

    def _build_prompt(self, text: str, evidence: typing.List[dict]) -> str:
        sources = "\n\n".join(
            f"--- SOURCE: {e['url']} ---\n{e['body']}" for e in evidence
        )
        return (
            "You are an impartial fact-checker in a decentralized truth market. "
            "Your job is to adjudicate the claim below using ONLY the provided "
            "live sources. Do not rely on your training data for the facts.\n\n"
            f"CLAIM: {text}\n\n"
            "SOURCES:\n" + (sources if sources else "(no sources could be fetched)") + "\n\n"
            "Decide whether the claim is true, false, or unverifiable based on the "
            "sources. If sources are missing, contradictory, or insufficient, return "
            "'unverifiable'.\n\n"
            "You MUST respond with a single JSON object and nothing else, in exactly "
            "this shape:\n"
            '{"verdict": "true" | "false" | "unverifiable", "reasoning": "2-4 sentence '
            "explanation citing the sources\"}"
        )

    def _parse_verdict(self, raw: str) -> dict:
        # Robust parse: the LLM is asked for strict JSON, but tolerate minor noise.
        try:
            data = json.loads(raw)
            verdict = str(data.get("verdict", "")).strip().lower()
            reasoning = str(data.get("reasoning", "")).strip()
        except Exception:
            # Fallback: scan for an explicit verdict word.
            lowered = (raw or "").lower()
            if f'"{VERDICT_TRUE}"' in lowered or f'"{VERDICT_FALSE}"' in lowered \
                    or f'"{VERDICT_UNVERIFIABLE}"' in lowered:
                for v in (VERDICT_TRUE, VERDICT_FALSE, VERDICT_UNVERIFIABLE):
                    if f'"{v}"' in lowered:
                        verdict, reasoning = v, raw.strip()
                        break
            else:
                verdict, reasoning = VERDICT_UNVERIFIABLE, raw.strip()

        if verdict not in (VERDICT_TRUE, VERDICT_FALSE, VERDICT_UNVERIFIABLE):
            verdict = VERDICT_UNVERIFIABLE
        return {"verdict": verdict, "reasoning": reasoning}

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _require_claim(self, claim_id: int) -> Claim:
        claim = self.claims.get(claim_id)
        if claim is None:
            raise gl.vm.UserError("claim not found")
        return claim

    def _settle(self, winner: str, loser_bond: u256) -> None:
        """Pay winner the loser's bond minus the protocol fee; credit fee to treasury."""
        fee = loser_bond * self.fee_bps // BPS_DENOM
        self._credit(winner, loser_bond - fee)
        if fee > u256(0):
            self._credit(self.treasury, fee)

    def _credit(self, address: str, amount: u256) -> None:
        if amount <= u256(0):
            return
        self.payouts[address] = self.payouts.get(address, u256(0)) + amount

    @staticmethod
    def _clean_urls(urls: typing.List[str]) -> typing.List[str]:
        cleaned = []
        for u in urls:
            u = (u or "").strip()
            if not u:
                continue
            if not (u.startswith("http://") or u.startswith("https://")):
                continue
            if u not in cleaned:
                cleaned.append(u)
        return cleaned[:MAX_EVIDENCE_URLS_PER_PARTY]

    @staticmethod
    def _claim_to_dict(c: Claim) -> dict:
        return {
            "id": c.id,
            "text": c.text,
            "evidence_urls": list(c.evidence_urls),
            "poster": c.poster,
            "bond": str(c.bond),
            "challenger": c.challenger,
            "challenger_urls": list(c.challenger_urls),
            "status": c.status,
            "verdict": c.verdict,
            "reasoning": c.reasoning,
        }
