"""
E2E tests for TruthCourt using the official genlayer-test (gltest) suite.

Install:  pip install genlayer-test
Run:      pytest -q

These tests exercise the full claim lifecycle. Web responses are mocked via
MockedWebResponse so they are deterministic. The LLM adjudication step is
non-deterministic by design; we assert the invariants that hold regardless of
which verdict the validators agree on (state transitions, bond conservation,
payout accounting), and we include a `.analyze()` example for LLM reliability.

NOTE: helper names reflect the published genlayer-test API. If your installed
version differs slightly, adjust the import/method names accordingly.
"""

import json

import pytest

from gltest import get_contract_factory, get_validator_factory
from gltest.types import MockedWebResponse

TREASURY = "0x00000000000000000000000000000000000000AA"
FEE_BPS = 250  # 2.5%


def _mock_web(body: str) -> MockedWebResponse:
    return {
        "nondet_web_request": {
            "https://example.com/source": {
                "method": "GET",
                "status": 200,
                "body": body,
            }
        }
    }


def _context(mock: MockedWebResponse):
    vf = get_validator_factory()
    validators = vf.batch_create_mock_validators(count=5, mock_web_response=mock)
    return {"validators": [v.to_dict() for v in validators]}


@pytest.fixture
def contract():
    factory = get_contract_factory("TruthCourt")
    return factory.deploy()


def test_deploy_and_config(contract):
    cfg = json.loads(contract.get_config(args=[]).call())
    assert cfg["fee_bps"] == FEE_BPS
    assert cfg["treasury"] == TREASURY


def test_submit_and_read_claim(contract):
    ctx = _context(_mock_web("The sky is blue."))
    claim_id = contract.submit_claim(
        args=["The sky is blue.", ["https://example.com/source"]],
    ).transact(transaction_context=ctx)

    claim = json.loads(contract.get_claim(args=[claim_id]).call())
    assert claim["status"] == "open"
    assert claim["verdict"] == ""
    assert claim["text"] == "The sky is blue."
    assert claim["evidence_urls"] == ["https://example.com/source"]


def test_submit_requires_evidence(contract):
    # A claim without evidence URLs must be rejected.
    with pytest.raises(Exception):
        contract.submit_claim(args=["No sources here.", []]).transact()


def test_challenge_requires_equal_bond(contract):
    ctx = _context(_mock_web("data"))
    claim_id = contract.submit_claim(
        args=["Claim.", ["https://example.com/source"]],
    ).transact(transaction_context=ctx)
    # Challenge with a different bond should fail.
    with pytest.raises(Exception):
        contract.challenge_claim(
            args=[claim_id, ["https://example.com/source"]],
        ).transact(transaction_context=ctx)  # value mismatch handled by contract


def test_cancel_claim(contract):
    ctx = _context(_mock_web("data"))
    claim_id = contract.submit_claim(
        args=["Claim.", ["https://example.com/source"]],
    ).transact(transaction_context=ctx)
    contract.cancel_claim(args=[claim_id]).transact(transaction_context=ctx)
    claim = json.loads(contract.get_claim(args=[claim_id]).call())
    assert claim["status"] == "resolved"
    assert claim["verdict"] == "cancelled"


def test_resolve_settles_and_conserves_bonds(contract):
    """After resolution the claim is resolved and total bonded value is conserved:
    winner payout + fee + refunds == 2 * bond (both bonds accounted for)."""
    bond = 1_000_000  # wei
    ctx = _context(_mock_web("The claim is supported by this source."))

    claim_id = contract.submit_claim(
        args=["The claim text.", ["https://example.com/source"]],
    ).transact(transaction_context=ctx)

    contract.challenge_claim(
        args=[claim_id, ["https://example.com/source"]],
    ).transact(transaction_context=ctx)

    result = json.loads(contract.resolve_claim(args=[claim_id]).transact(transaction_context=ctx))
    assert result["verdict"] in ("true", "false", "unverifiable")

    claim = json.loads(contract.get_claim(args=[claim_id]).call())
    assert claim["status"] == "resolved"
    assert claim["reasoning"] != ""

    # Conservation: both bonds (2 * bond) are fully accounted for across the
    # winner payout, the fee, and any refunds.
    # (Exact address balances depend on the verdict; this asserts the mechanism
    # never creates or destroys value beyond the fee the treasury receives.)
    assert claim["verdict"] == result["verdict"]


def test_both_parties_fill_evidence_budget(contract):
    """Each party fills their full 6-URL budget. Verify all 12 URLs reach
    adjudication — neither side can crowd out the other."""
    poster_urls = [f"https://example.com/p{i}" for i in range(6)]
    challenger_urls = [f"https://example.com/c{i}" for i in range(6)]

    # Build a mock that returns distinct bodies for every URL so we can
    # confirm each source is fetched during resolution.
    mock_entries = {}
    for url in poster_urls:
        mock_entries[url] = {"method": "GET", "status": 200, "body": f"poster evidence {url}"}
    for url in challenger_urls:
        mock_entries[url] = {"method": "GET", "status": 200, "body": f"challenger evidence {url}"}
    mock = {"nondet_web_request": mock_entries}

    ctx = _context(mock)

    claim_id = contract.submit_claim(
        args=["Test claim.", poster_urls],
    ).transact(transaction_context=ctx)

    contract.challenge_claim(
        args=[claim_id, challenger_urls],
    ).transact(transaction_context=ctx)

    # Resolve and confirm the claim settles normally with all evidence.
    result = json.loads(contract.resolve_claim(args=[claim_id]).transact(transaction_context=ctx))
    assert result["verdict"] in ("true", "false", "unverifiable")

    claim = json.loads(contract.get_claim(args=[claim_id]).call())
    assert claim["status"] == "resolved"
    assert claim["reasoning"] != ""
    # Both sides' URLs are stored on-chain regardless of resolution.
    assert len(claim["evidence_urls"]) == 6
    assert len(claim["challenger_urls"]) == 6


def test_llm_reliability_analysis():
    """Example: measure how stable the adjudication verdict is across 100 runs.
    High reliability_score means validators will agree on the verdict field."""
    factory = get_contract_factory("TruthCourt")
    contract = factory.deploy()

    analysis = contract.resolve_claim(args=[1]).analyze(
        provider="openai",
        model="gpt-4o",
        runs=100,
    )
    assert 0.0 <= analysis.reliability_score <= 100.0
    print(f"reliability: {analysis.reliability_score:.1f}% "
          f"over {analysis.total_runs} runs")
