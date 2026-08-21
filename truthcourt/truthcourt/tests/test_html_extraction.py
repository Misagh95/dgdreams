"""Direct-mode test: _fetch_evidence must convert HTML to plain text before
truncating to MAX_BODY_CHARS, so the LLM's budget goes to content not markup.

Deterministic proof via ordered LLM mocks:
  1. A mock matching a marker hidden inside <script> answers "false" — if the
     stripper failed, the prompt contains the marker and the verdict becomes
     "false", failing the test.
  2. A mock matching the clean fact sentence ("stands 8,849 metres") answers
     "true" — it can only match if tags were stripped and entities collapsed.
  3. Catch-all answers "unverifiable".
"""
import json
import re
from pathlib import Path

import pytest

from gltest.direct.vm import VMContext
import gltest.direct.loader as gl_loader

from direct_smoke import _inject_message_to_fd0_windows, _restore_stdin

CONTRACT = Path(__file__).resolve().parent.parent / "contract" / "truth_court.py"
TREASURY = "0x" + "aa" * 20
BOND = 1_000_000

PAGE_HTML = """<html><head><style>body { color: red; }</style>
<script>var decoyEverestMarker = "8849 fake";</script></head>
<body><nav><a href="/">Home</a></nav>
<h1>Mount&nbsp;Everest</h1>
<p>The mountain stands 8,849 metres above sea level.</p>
<script>anotherDecoyTag = true;</script>
</body></html>"""


@pytest.fixture
def court():
    vm = VMContext()
    vm.sender = gl_loader.create_address("poster")
    original = gl_loader._inject_message_to_fd0
    gl_loader._inject_message_to_fd0 = _inject_message_to_fd0_windows
    try:
        with vm.activate():
            contract = gl_loader.deploy_contract(
                CONTRACT, vm, TREASURY, fee_bps=250, sdk_version="v0.2.16"
            )
            _restore_stdin(vm)
            yield vm, contract
    finally:
        gl_loader._inject_message_to_fd0 = original


def test_html_stripped_before_llm(court):
    vm, contract = court
    url = "https://example.com/everest"
    vm.mock_web(re.escape(url), {"method": "GET", "status": 200, "body": PAGE_HTML})

    # 1) If script/style content leaks into the prompt -> "false".
    vm.mock_llm(r"(?s)decoyEverestMarker|anotherDecoyTag|color:\s*red",
                'Saw markup junk. {"verdict": "false", "reasoning": "junk"}')
    # 2) Clean sentence present (tags gone, &nbsp; collapsed) -> "true".
    vm.mock_llm(r"(?s)Mount Everest stands\s+8,849\s+metres above sea level",
                'Clean text seen. {"verdict": "true", "reasoning": "fact found"}')
    # 3) Anything else.
    vm.mock_llm(r"(?s).*",
                'Fallback. {"verdict": "unverifiable", "reasoning": "nothing"}')

    vm.value = BOND
    claim_id = contract.submit_claim(
        "Mount Everest stands 8,849 metres above sea level.", [url]
    )
    vm.sender = gl_loader.create_address("challenger")
    contract.challenge_claim(claim_id, ["https://example.com/challenger-source"])
    result = json.loads(contract.resolve_claim(claim_id))

    assert result["verdict"] == "true", (
        f"expected cleaned text in prompt, got verdict={result['verdict']}"
    )
    assert len(vm._web_mocks_hit) == 1
