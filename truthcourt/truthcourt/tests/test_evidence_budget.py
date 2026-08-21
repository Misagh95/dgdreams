"""Contract tests for the per-party evidence fetch budgets (review fix).

Two properties are verified:

1. Equal budgets: poster and challenger URLs are capped independently by
   MAX_EVIDENCE_URLS_PER_PARTY, so neither party can crowd the other out.
2. Reach-adjudication: when BOTH parties fill their full allowance, every
   source from BOTH sides is actually fetched AND included in the LLM
   adjudication prompt. This is proven deterministically by registering an
   LLM mock that answers "true" ONLY if all poster + challenger sources
   appear in the prompt; any missing source falls through to a catch-all
   mock answering "unverifiable".

Runs in gltest direct mode (no simulator/node required), reusing the
Windows-safe stdin injection from direct_smoke.py.
"""
import json
import re
from pathlib import Path

import gltest.direct.loader as gl_loader

from conftest import BOND, CONTRACT

CONTRACT_PATH = CONTRACT


def _per_party_budget() -> int:
    """Read MAX_EVIDENCE_URLS_PER_PARTY straight from the contract source."""
    src = CONTRACT_PATH.read_text(encoding="utf-8")
    m = re.search(r"^MAX_EVIDENCE_URLS_PER_PARTY\s*=\s*(\d+)", src, re.M)
    assert m, "MAX_EVIDENCE_URLS_PER_PARTY not found in contract"
    return int(m.group(1))


def _mock_all_sources(vm, poster_urls, challenger_urls):
    """One web mock per URL + two ordered LLM mocks.

    The strict LLM mock matches only prompts containing EVERY poster token
    (p0..pN) followed by EVERY challenger token (c0..cN) — i.e. the exact
    order _adjudicate concatenates the two per-party lists. The catch-all
    mock registered after it answers 'unverifiable', so a "true" verdict is
    proof that no side's evidence was dropped from adjudication.

    Mock replies embed the verdict JSON inside prose on purpose: the direct
    WASI layer auto-parses pure-JSON strings into dicts, which would bypass
    the contract's text-mode parsing path.
    """
    n = len(poster_urls)
    for u in poster_urls:
        vm.mock_web(re.escape(u), {"method": "GET", "status": 200,
                                   "body": f"poster evidence {u}"})
    for u in challenger_urls:
        vm.mock_web(re.escape(u), {"method": "GET", "status": 200,
                                   "body": f"challenger evidence {u}"})

    tokens = [f"p{i}" for i in range(n)] + [f"c{i}" for i in range(n)]
    strict_pattern = "(?s)" + ".*".join(tokens)
    vm.mock_llm(
        strict_pattern,
        'All sources reviewed. {"verdict": "true", '
        '"reasoning": "Every poster and challenger source supports the claim."}',
    )
    vm.mock_llm(
        r"(?s).*",
        'Not all sources present. {"verdict": "unverifiable", '
        '"reasoning": "evidence incomplete"}',
    )


def test_full_budgets_both_sides_reach_adjudication(court):
    """Both parties fill their allowance; every source must be fetched and
    reach the adjudication prompt — neither side can exclude the other."""
    vm, contract = court
    n = _per_party_budget()
    poster_urls = [f"https://example.com/p{i}" for i in range(n)]
    challenger_urls = [f"https://example.com/c{i}" for i in range(n)]
    _mock_all_sources(vm, poster_urls, challenger_urls)

    vm.value = BOND
    claim_id = contract.submit_claim("Test claim.", poster_urls)
    vm.sender = gl_loader.create_address("challenger")
    contract.challenge_claim(claim_id, challenger_urls)
    vm.value = 0

    result = json.loads(contract.resolve_claim(claim_id))

    # "true" can only come from the strict mock => ALL sources from BOTH
    # sides were present in the adjudication prompt.
    assert result["verdict"] == "true", result
    assert "challenger" in result["reasoning"].lower()

    # Every single web mock was hit => every source was actually fetched.
    assert len(vm._web_mocks_hit) == 2 * n, (
        f"fetched {len(vm._web_mocks_hit)} of {2 * n} mocked sources"
    )

    # A validator re-running leader_fn independently sees both sides too.
    assert vm.run_validator() is True


def test_over_budget_submissions_capped_equally(court):
    """Submitting more URLs than the budget caps EACH side to the same limit;
    the poster cannot buy extra evidence slots the challenger cannot get."""
    vm, contract = court
    n = _per_party_budget()
    overflow = n + 4
    poster_urls = [f"https://example.com/p{i}" for i in range(overflow)]
    challenger_urls = [f"https://example.com/c{i}" for i in range(overflow)]

    vm.value = BOND
    claim_id = contract.submit_claim("Test claim.", poster_urls)
    vm.sender = gl_loader.create_address("challenger")
    contract.challenge_claim(claim_id, challenger_urls)

    claim = json.loads(contract.get_claim(claim_id))
    assert len(claim["evidence_urls"]) == n
    assert len(claim["challenger_urls"]) == n
    assert claim["evidence_urls"] == poster_urls[:n]
    assert claim["challenger_urls"] == challenger_urls[:n]
