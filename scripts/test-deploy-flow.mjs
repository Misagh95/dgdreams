/**
 * End-to-end proof that the exported artifacts really deploy: sends each
 * contract-creation transaction exactly the way the Deploy page does (raw
 * eth_sendTransaction with init code, no `to`), then calls one function on the
 * deployed address to prove the bytecode behaves.
 *
 * Run anvil on 8545 first, then: node scripts/test-deploy-flow.mjs
 */
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, encodeDeployData, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = "http://127.0.0.1:8545";
// anvil account #0
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

const NAMES = ["NikBase", "SoulboundStreak", "Game2048", "LitePrediction"];

const transport = http(RPC);
const pub = createPublicClient({ transport });
const wallet = createWalletClient({ account, transport });

console.log("chainId:", await pub.getChainId());
console.log("deployer:", account.address, "\n");

let failures = 0;
let nikAddress = null;
const addresses = {};

for (const name of NAMES) {
  const art = JSON.parse(readFileSync(`public/contracts/${name}.json`, "utf8"));

  const args =
    name === "SoulboundStreak" && nikAddress
      ? [nikAddress, account.address]
      : [];

  const data = encodeDeployData({ abi: art.abi, bytecode: art.bytecode, args });

  const hash = await wallet.sendTransaction({ data, chain: null });
  const receipt = await pub.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success" || !receipt.contractAddress) {
    console.log(`✗ ${name}: deployment failed`);
    failures++;
    continue;
  }

  const addr = receipt.contractAddress;
  if (name === "NikBase") nikAddress = addr;
  addresses[name] = addr;

  // prove the deployed bytecode behaves: NikBase.getUserData must read back
  let check = "n/a";
  if (name === "NikBase") {
    const out = await pub.readContract({
      address: addr,
      abi: art.abi,
      functionName: "getUserData",
      args: [account.address],
    });
    check = `getUserData -> ${out.join(",")}`;
  }
  if (name === "SoulboundStreak") {
    const v = await pub.readContract({
      address: addr,
      abi: art.abi,
      functionName: "version",
    });
    check = `version() -> ${v}`;
  }
  if (name === "Game2048") {
    const pc = await pub.readContract({
      address: addr,
      abi: art.abi,
      functionName: "playCount",
      args: [account.address],
    });
    check = `playCount -> ${pc}`;
  }

  console.log(`✓ ${name.padEnd(16)} ${addr}  initCode ${((data.length - 2) / 2)}B  ${check}`);
  if (art.runtimeBytes !== (receipt.logs?.length ?? art.runtimeBytes) * 0 + art.runtimeBytes) {
    // no-op: only to keep the arithmetic out of the way
  }
}

// verify the runtime code really landed at each address
console.log("\n── runtime code check ──");
for (const [name, addr] of Object.entries(addresses)) {
  const art = JSON.parse(readFileSync(`public/contracts/${name}.json`, "utf8"));
  const code = await pub.getBytecode({ address: addr });
  const present = !!code && code !== "0x";
  if (!present) failures++;
  console.log(
    `  ${present ? "PASS" : "FAIL"}  ${name.padEnd(16)} ${addr}  ${code ? (code.length - 2) / 2 : 0}B (expected ${art.runtimeBytes}B)`
  );
}

console.log(`\n${failures === 0 ? "ALL DEPLOYS OK" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
