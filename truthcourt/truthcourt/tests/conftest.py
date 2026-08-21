"""Shared fixtures for TruthCourt direct-mode tests."""
from pathlib import Path

import pytest

from gltest.direct.vm import VMContext
import gltest.direct.loader as gl_loader

from direct_smoke import _inject_message_to_fd0_windows, _restore_stdin

CONTRACT = Path(__file__).resolve().parent.parent / "contract" / "truth_court.py"
TREASURY = "0x" + "aa" * 20
BOND = 1_000_000


@pytest.fixture
def court():
    """Deploy TruthCourt in the direct VM; yields (vm, contract)."""
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
