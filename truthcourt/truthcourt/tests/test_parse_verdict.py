"""Direct-mode tests for _parse_verdict robustness.

The prompt asks the LLM for a bare JSON object, but real models sometimes
wrap it in markdown fences (```json ... ```) or prose. The verdict must be
extracted either way, and when the JSON path succeeds the stored reasoning
must be the clean "reasoning" field — not the raw fenced payload.
"""
import json

from conftest import BOND
import gltest.direct.loader as gl_loader


def test_fenced_json_answer_parsed_cleanly(court):
    vm, contract = court
    url = "https://example.com/source"
    vm.mock_web(url, {"method": "GET", "status": 200, "body": "plain fact"})
    vm.mock_llm(
        r"(?s).*",
        '```json\n{"verdict": "true", "reasoning": "Clean reasoning text."}\n```',
    )

    vm.value = BOND
    claim_id = contract.submit_claim("Some claim.", [url])
    vm.sender = gl_loader.create_address("challenger")
    contract.challenge_claim(claim_id, [url])
    result = json.loads(contract.resolve_claim(claim_id))

    assert result["verdict"] == "true"
    # No fences, no JSON wrapper — just the reasoning field.
    assert result["reasoning"] == "Clean reasoning text."


def test_bare_json_answer_still_works(court):
    vm, contract = court
    url = "https://example.com/source"
    vm.mock_web(url, {"method": "GET", "status": 200, "body": "plain fact"})
    vm.mock_llm(
        r"(?s).*",
        '{"verdict": "false", "reasoning": "Sources contradict the claim."}',
    )

    vm.value = BOND
    claim_id = contract.submit_claim("Some claim.", [url])
    vm.sender = gl_loader.create_address("challenger")
    contract.challenge_claim(claim_id, [url])
    result = json.loads(contract.resolve_claim(claim_id))

    assert result["verdict"] == "false"
    assert result["reasoning"] == "Sources contradict the claim."


def test_prose_wrapped_verdict_uses_fallback(court):
    vm, contract = court
    url = "https://example.com/source"
    vm.mock_web(url, {"method": "GET", "status": 200, "body": "plain fact"})
    vm.mock_llm(
        r"(?s).*",
        'After reviewing everything, my answer is {"verdict": "unverifiable", '
        '"reasoning": "not enough"} as requested.',
    )

    vm.value = BOND
    claim_id = contract.submit_claim("Some claim.", [url])
    vm.sender = gl_loader.create_address("challenger")
    contract.challenge_claim(claim_id, [url])
    result = json.loads(contract.resolve_claim(claim_id))

    assert result["verdict"] == "unverifiable"
