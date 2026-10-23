"""Deploy the Grand Tour badge (badge_genlayer.py) to GenLayer Bradbury testnet.

GenLayer is a non-EVM chain — no Solidity here, so this does not touch
scripts/deploy-badges.mjs. Run:

  PowerShell:  $env:GENLAYER_PRIVATE_KEY = 'your_key_here'; python deploy_badge.py
  CMD:         set GENLAYER_PRIVATE_KEY=your_key_here && python deploy_badge.py

After deploying it wires the address into src/lib/genlayer/badge.ts
(GENLAYER_BADGE_CONTRACT) so the gallery card goes live.
"""
import json
import os
import re
import sys
from genlayer_py import create_account, create_client, testnet_bradbury
from genlayer_py.contracts.actions import deploy_contract

CONTRACT = ("badge_genlayer.py", "ChainBadge")
FRONTEND = ("src/lib/genlayer/badge.ts", "GENLAYER_BADGE_CONTRACT")
ENV_VAR = "NEXT_PUBLIC_GENLAYER_BADGE"

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def main():
    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        print("ERROR: Set GENLAYER_PRIVATE_KEY environment variable first")
        print("  PowerShell: $env:GENLAYER_PRIVATE_KEY = 'your_key_here'")
        print("  CMD: set GENLAYER_PRIVATE_KEY=your_key_here")
        sys.exit(1)

    account = create_account(private_key=key)
    client = create_client(rpc=testnet_bradbury.rpc_urls["default"]["http"][0])

    print(f"Chain: Bradbury (id={testnet_bradbury.id})")
    print(f"Account: {account.address}")
    print()

    filename, class_name = CONTRACT
    filepath = os.path.join(os.path.dirname(__file__), filename)
    with open(filepath) as f:
        source = f.read()

    print(f"Deploying {class_name} from {filename}...")
    tx_hash = deploy_contract(client, code=source, account=account, args=[])
    print(f"  Tx: {tx_hash}")

    addr = str(tx_hash).lower()
    if not addr.startswith("0x") or len(addr) != 42:
        print(f"  WARNING: unexpected return format: {addr}")
        print("  Check explorer for deployed contract address")
        sys.exit(1)

    print(f"  Address: {addr}")

    info = {"name": class_name, "address": addr, "chain_id": testnet_bradbury.id, "tx_hash": tx_hash}
    deploy_file = os.path.join(os.path.dirname(__file__), "deploy_badge.json")
    with open(deploy_file, "w") as f:
        json.dump(info, f, indent=2)
    print(f"  Saved: {deploy_file}")

    # Wire the address into the frontend lib (replace the existing 0x… there,
    # exactly like deploy_all.py does).
    fe_path, _var = FRONTEND
    abs_fe_path = os.path.join(ROOT, fe_path)
    if os.path.exists(abs_fe_path):
        with open(abs_fe_path) as f:
            content = f.read()
        matches = re.findall(r"0x[a-fA-F0-9]{40}", content)
        if matches:
            old_addr = matches[0]
            content = content.replace(old_addr, addr)
            with open(abs_fe_path, "w") as f:
                f.write(content)
            print(f"  Updated: {fe_path} ({old_addr[:10]}... -> {addr[:10]}...)")
        else:
            print(f"  WARNING: no existing 0x… address in {fe_path} to replace")
            print(f"  Set {ENV_VAR}={addr} in Vercel instead")
    print()
    print("DONE. Refresh the gallery — the GEN card is now mintable.")


if __name__ == "__main__":
    main()
