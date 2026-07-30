"""Deploy NikBase, PriceOracle, and PredictionMarket to GenLayer Bradbury testnet"""
import json
import os
import re
import sys
from genlayer_py import create_account, create_client, testnet_bradbury
from genlayer_py.contracts.actions import deploy_contract

CONTRACTS = [
    ("nikbase_genlayer.py", "NikBase"),
    ("price_oracle.py", "PriceOracle"),
    ("prediction_market.py", "PredictionMarket"),
]

FRONTEND_MAP = {
    "NikBase": ("src/lib/genlayer/tasks.ts", "GENLAYER_CONTRACT"),
    "PriceOracle": ("src/lib/genlayer/oracle.ts", "PRICE_ORACLE_CONTRACT"),
    "PredictionMarket": ("src/lib/genlayer/market.ts", "MARKET_CONTRACT"),
}

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

    for filename, class_name in CONTRACTS:
        filepath = os.path.join(os.path.dirname(__file__), filename)
        if not os.path.exists(filepath):
            print(f"SKIP: {filepath} not found")
            continue

        with open(filepath) as f:
            source = f.read()

        print(f"Deploying {class_name} from {filename}...")
        tx_hash = deploy_contract(
            client,
            code=source,
            account=account,
            args=[],
        )
        print(f"  Tx: {tx_hash}")

        # Read the address from deploy_contract return
        # The function returns the contract address as hex string
        addr = str(tx_hash).lower()
        if not addr.startswith("0x") or len(addr) != 42:
            print(f"  WARNING: unexpected return format: {addr}")
            print(f"  Check explorer for deployed contract address")
            continue

        print(f"  Address: {addr}")

        # Save to JSON
        info = {"name": class_name, "address": addr, "chain_id": testnet_bradbury.id, "tx_hash": tx_hash}
        deploy_file = os.path.join(os.path.dirname(__file__), f"deploy_{class_name.lower()}.json")
        with open(deploy_file, "w") as f:
            json.dump(info, f, indent=2)
        print(f"  Saved: {deploy_file}")

        # Update frontend files
        fe_info = FRONTEND_MAP.get(class_name)
        if fe_info:
            fe_path, var_name = fe_info
            abs_fe_path = os.path.join(ROOT, fe_path)
            if os.path.exists(abs_fe_path):
                with open(abs_fe_path) as f:
                    content = f.read()
                old_pattern = r'0x[a-fA-F0-9]{40}'
                matches = re.findall(old_pattern, content)
                if matches:
                    old_addr = matches[0]
                    content = content.replace(old_addr, addr)
                    with open(abs_fe_path, "w") as f:
                        f.write(content)
                    print(f"  Updated: {fe_path} ({old_addr[:10]}... -> {addr[:10]}...)")
        print()

    print("ALL DONE.")
    print("Next steps:")
    print("  1. git diff (verify frontend address changes)")
    print("  2. git add -A && git commit -m 'redeploy contracts' && git push")
    print("  3. npx vercel deploy --prod")

if __name__ == "__main__":
    main()
