"""Deploy AIEscrow contract to GenLayer Bradbury testnet"""
import json
import os
from genlayer_py import create_account, create_client, testnet_bradbury
from genlayer_py.contracts import Contract

def main():
    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        raise ValueError("Set GENLAYER_PRIVATE_KEY env var")

    account = create_account(private_key=key)
    client = create_client(rpc=testnet_bradbury.rpc_urls["default"]["http"][0])

    with open("ai_escrow.py") as f:
        source = f.read()

    print("Deploying AIEscrow...")
    contract = Contract.deploy(
        client=client,
        sender=account,
        source=source,
        contract_class="AIEscrow",
        constructor_args=[],
    )
    print(f"Deployed at: {contract.address}")
    print(f"Tx hash: {contract.tx_hash}")

    # Save address to a JSON file for the frontend
    info = {"address": contract.address, "chain_id": testnet_bradbury.id}
    with open("escrow_deploy.json", "w") as f:
        json.dump(info, f, indent=2)
    print(f"Saved to escrow_deploy.json: {json.dumps(info)}")

if __name__ == "__main__":
    main()
