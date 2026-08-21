"""Direct smoke test: run the TruthCourt lifecycle with no simulator/RPC.

Uses gltest's direct VM so the core lifecycle (deploy -> submit -> cancel ->
withdraw) executes in plain Python. Patches _inject_message_to_fd0 so the temp
stdin file is removed safely on Windows (restore original stdin, close our fd,
then unlink — naively unlinking while fd 0 still refers to it fails on Win32).
"""
import json
import os
import sys
import tempfile
import typing
from pathlib import Path

from gltest.direct.vm import VMContext
import gltest.direct.loader as gl_loader

CONTRACT = Path(__file__).resolve().parent.parent / "contract" / "truth_court.py"
TREASURY = "0x00000000000000000000000000000000000000AA"
BOND = 1_000_000

# Direct VM mode has no on-chain ledger, so `wasi.get_self_balance()` always
# returns 0. Stub it with a tracked counter so the contract's balance check in
# `withdraw` behaves like it would on a real node. `_genlayer_wasi` only exists
# in sys.modules while the contract is deployed.
_sim_balance = [0]


def _fake_get_self_balance() -> int:
    return _sim_balance[0]


def _inject_message_to_fd0_windows(vm: "VMContext") -> None:
    """Drop-in replacement: encodes the message, leaves fd 0 = temp file so the
    genlayer SDK reads it during contract import (as the original does), and
    defers cleanup until after the module has been loaded."""
    from genlayer.py import calldata

    message_data = {
        "contract_address": vm._contract_address,
        "sender_address": vm.sender,
        "origin_address": vm.origin,
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }

    encoded = calldata.encode(message_data)

    fd, path = tempfile.mkstemp()
    os.write(fd, encoded)
    os.lseek(fd, 0, os.SEEK_SET)

    original_stdin = os.dup(0)
    vm._original_stdin_fd = original_stdin
    os.dup2(fd, 0)
    vm._stdin_resources = (fd, path)


def _restore_stdin(vm: "VMContext") -> None:
    """After contract load, put stdin back and remove the temp file (Windows-safe)."""
    fd, path = getattr(vm, "_stdin_resources", (None, None))
    original = getattr(vm, "_original_stdin_fd", None)
    if original is not None:
        os.dup2(original, 0)
        os.close(original)
        vm._original_stdin_fd = None
    if fd is not None:
        os.close(fd)
    vm._stdin_resources = (None, None)
    if path:
        try:
            os.unlink(path)
        except OSError:
            pass


def run() -> None:
    vm = VMContext()
    vm.sender = "0x00000000000000000000000000000000000000BB"

    original = gl_loader._inject_message_to_fd0
    gl_loader._inject_message_to_fd0 = _inject_message_to_fd0_windows
    wasi = real_wasi_get_self_balance = None
    try:
        with vm.activate():
            contract = gl_loader.deploy_contract(
                CONTRACT, vm, TREASURY, fee_bps=250, sdk_version="v0.2.16"
            )
            _restore_stdin(vm)

            wasi = sys.modules["_genlayer_wasi"]
            real_wasi_get_self_balance = wasi.get_self_balance
            wasi.get_self_balance = _fake_get_self_balance

            cfg = json.loads(contract.get_config())
            assert cfg["fee_bps"] == 250, cfg
            assert cfg["treasury"] == TREASURY, cfg
            print("OK get_config")

            vm.value = BOND
            claim_id = contract.submit_claim(
                "The sky is blue.", ["https://example.com/source"]
            )
            claim = json.loads(contract.get_claim(claim_id))
            assert claim["status"] == "open"
            assert claim["verdict"] == ""
            assert claim["text"] == "The sky is blue."
            assert claim["evidence_urls"] == ["https://example.com/source"]
            print("OK submit_claim ->", claim_id)

            contract.cancel_claim(claim_id)
            claim = json.loads(contract.get_claim(claim_id))
            assert claim["status"] == "resolved"
            assert claim["verdict"] == "cancelled"
            print("OK cancel_claim")

            assert contract.get_payout(TREASURY) == 0
            payout = contract.get_payout(vm.sender)
            assert payout == BOND, payout
            _sim_balance[0] = BOND  # simulate the bond sitting on the contract
            contract.withdraw()
            _sim_balance[0] = 0
            assert contract.get_payout(vm.sender) == 0
            print("OK withdraw")

            print("SUCCESS: TruthCourt direct lifecycle works without simulator")
    finally:
        if real_wasi_get_self_balance is not None:
            wasi.get_self_balance = real_wasi_get_self_balance
        gl_loader._inject_message_to_fd0 = original


if __name__ == "__main__":
    run()