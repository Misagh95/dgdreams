/**
 * Proves the standalone counter transaction:
 *   - runSequence() can send `incrementCounter()` on its own (one step)
 *   - the counter really moves on-chain (0 -> 1 -> 2 -> 3)
 *   - the 4th call is refused by the contract (REPEAT_3 per UTC day)
 *   - canStillRunTask() reports the limit BEFORE the wallet would revert
 *
 * Run: node scripts/test-counter.mjs   (needs anvil on 127.0.0.1:8545)
 */
import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { createWalletClient, createPublicClient, http, encodeDeployData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { runSequence } from "../src/lib/sequence.ts";
import { canStillRunTask } from "../src/lib/preflight.ts";

const RPC = "http://127.0.0.1:8545";
const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const wallet = createWalletClient({ account, transport: http(RPC) });
const pub = createPublicClient({ transport: http(RPC) });
const ok = (name) => console.log(`  ok - ${name}`);

// ── deploy NikBase so the counter has somewhere to land ──────────────────
const nik = JSON.parse(readFileSync("out/NikBase.sol/NikBase.json", "utf8"));
const nikBytecode = nik.bytecode.object.startsWith("0x")
  ? nik.bytecode.object
  : "0x" + nik.bytecode.object;
const nikHash = await wallet.sendTransaction({
  data: encodeDeployData({ abi: nik.abi, bytecode: nikBytecode, args: [] }),
  chain: null,
});
const nikRec = await pub.waitForTransactionReceipt({ hash: nikHash });
const nikAddr = nikRec.contractAddress;
console.log("NikBase:", nikAddr, "\n");

const counterOf = async () => {
  const counts = await pub.readContract({
    address: nikAddr,
    abi: nik.abi,
    functionName: "getActionCounts",
    args: [account.address],
  });
  return Number(counts[4]);
};

const fakeProvider = {
  request: async ({ method, params }) => {
    if (method === "eth_sendTransaction") {
      return wallet.sendTransaction({
        data: params[0].data,
        to: params[0].to,
        chain: null,
      });
    }
    if (method === "eth_getTransactionReceipt") {
      const r = await pub.getTransactionReceipt({ hash: params[0] });
      return r ?? null;
    }
    throw new Error(`unexpected method ${method}`);
  },
};

const runCounter = async () =>
  runSequence({
    steps: [
      { id: "counter", label: "Counter", kind: "mission", method: "incrementCounter" },
    ],
    account: account.address,
    chainId: 31337,
    contractAddress: nikAddr,
    rpcUrls: [RPC],
    explorerUrl: "http://127.0.0.1:8545",
    getProvider: async () => fakeProvider,
    onUpdate: () => {},
  });

// ── 1. a single counter transaction moves the counter ───────────────────
console.log("single counter transaction");
assert.equal(await counterOf(), 0, "starts at 0");
let out = await runCounter();
assert.equal(out[0].status, "done", `first run failed: ${out[0].error}`);
ok("runSequence sends incrementCounter() on its own");
assert.equal(await counterOf(), 1, "counter is 1 after the first tx");

// ── 2. the preflight still says "runnable" ───────────────────────────────
const runnable = await canStillRunTask(pub, {
  account: account.address,
  contract: nikAddr,
  method: "incrementCounter",
});
assert.equal(runnable, true, "preflight must allow the 2nd increment");
ok("preflight allows the counter while under the limit");

// ── 3. up to 3 per day ───────────────────────────────────────────────────
out = await runCounter();
assert.equal(out[0].status, "done");
out = await runCounter();
assert.equal(out[0].status, "done", `third run failed: ${out[0].error}`);
assert.equal(await counterOf(), 3, "counter is 3 after three txs");
ok("three increments land on-chain");

// ── 4. the 4th is refused, and the preflight says so first ──────────────
const stillRunnable = await canStillRunTask(pub, {
  account: account.address,
  contract: nikAddr,
  method: "incrementCounter",
});
assert.equal(stillRunnable, false, "preflight must block the 4th increment");
ok("preflight blocks the 4th increment (no wallet revert)");

out = await runCounter();
assert.notEqual(out[0].status, "done", "the 4th increment must not succeed");
assert.equal(await counterOf(), 3, "counter stays at 3");
ok(`the 4th increment is refused on-chain (${out[0].error?.slice(0, 60)})`);

console.log("\nall counter checks passed");
