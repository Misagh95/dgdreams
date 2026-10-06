// Regression test for: "every day it says 'you already did it' though I didn't".
// Run: node scripts/test-preflight.mjs
import { strict as assert } from "node:assert";
import { createPublicClient, http, keccak256, toBytes } from "viem";
import {
  PREFLIGHT_TIMEOUT_MS,
  canStillRunTask,
  extractRevertData,
  isExecutionRevert,
} from "../src/lib/preflight.ts";
import { NIKBASE_CONTRACTS } from "../src/config/chains.ts";

const FRESH = "0x1111111111111111111111111111111111111111";
const ok = (name) => console.log(`  ok - ${name}`);

function fakeRevertClient(selectorHex) {
  // Mimics viem's wrap: CallExecutionError -> ExecutionRevertedError -> RpcRequestError(code 3, data)
  const rpcErr = new Error("execution reverted");
  rpcErr.name = "RpcRequestError";
  rpcErr.code = 3;
  rpcErr.data = selectorHex;
  const nodeErr = new Error("Execution reverted for an unknown reason.");
  nodeErr.name = "ExecutionRevertedError";
  nodeErr.cause = rpcErr;
  const outer = new Error("The contract function reverted.");
  outer.name = "CallExecutionError";
  outer.cause = nodeErr;
  return { call: async () => { throw outer; } };
}

function httpFailClient() {
  // Mimics viem's wrap for RPC-layer failures: CallExecutionError -> HttpRequestError
  const httpErr = new Error("HTTP request failed. Status: 429");
  httpErr.name = "HttpRequestError";
  const outer = new Error("An error occurred while executing: HTTP request failed.");
  outer.name = "CallExecutionError";
  outer.cause = httpErr;
  return { call: async () => { throw outer; } };
}

const sel = (sig) => keccak256(toBytes(sig)).slice(0, 10);

// ---- 1. unit: executor classification ----
console.log("unit: isExecutionRevert / extractRevertData");
const revertErr = await fakeRevertClient(sel("AlreadyDone()")).call().catch((e) => e);
assert.equal(isExecutionRevert(revertErr), true);
ok("real revert with data is a revert");
assert.equal(extractRevertData(revertErr), sel("AlreadyDone()"));
ok("revert data extracted");
const httpErr = await httpFailClient().call().catch((e) => e);
assert.equal(isExecutionRevert(httpErr), false);
ok("HTTP 429-style failure is NOT a revert");
assert.equal(isExecutionRevert(new Error("preflight timeout")), false);
ok("timeout is NOT a revert");
assert.equal(extractRevertData(httpErr), undefined);
ok("no revert data on RPC errors");

// ---- 2. unit: canStillRunTask with fabricated failures ----
// NOTE: fabricated clients reject on the getFlags path too, exercising the
// simulation fallback with the same error shape.
console.log("unit: canStillRunTask fallback classification");
assert.equal(await canStillRunTask(httpFailClient(), { account: FRESH, contract: NIKBASE_CONTRACTS[8453], method: "dailyCheckIn" }), true);
ok("RPC failure fails OPEN (runnable) — the reported bug");
assert.equal(await canStillRunTask(fakeRevertClient(sel("AlreadyDone()")), { account: FRESH, contract: NIKBASE_CONTRACTS[8453], method: "gm" }), false);
ok("AlreadyDone() revert means already done");
assert.equal(await canStillRunTask(fakeRevertClient(sel("ContractPaused()")), { account: FRESH, contract: NIKBASE_CONTRACTS[8453], method: "gn" }), true);
ok("unrelated revert fails OPEN (runnable), no false lockout");
assert.equal(await canStillRunTask({ call: async () => { throw new Error("preflight timeout"); } }, { account: FRESH, contract: NIKBASE_CONTRACTS[8453], method: "gm" }), true);
ok("timeout fails OPEN");
function emptyRevertClient() {
  const rpcErr = new Error("execution reverted");
  rpcErr.name = "RpcRequestError";
  rpcErr.code = 3;
  rpcErr.data = "0x"; // wrong contract / no fallback: revert WITHOUT reason
  const nodeErr = new Error("Execution reverted for an unknown reason.");
  nodeErr.name = "ExecutionRevertedError";
  nodeErr.cause = rpcErr;
  const outer = new Error("The contract function reverted.");
  outer.name = "CallExecutionError";
  outer.cause = nodeErr;
  return { call: async () => { throw outer; } };
}
assert.equal(isExecutionRevert(await emptyRevertClient().call().catch((e) => e)), true);
ok("empty revert IS a genuine contract revert");
assert.equal(await canStillRunTask(emptyRevertClient(), { account: FRESH, contract: NIKBASE_CONTRACTS[8453], method: "gm" }), true);
ok("empty revert fails OPEN (no false lockout)");

// ---- 3. live: fresh address must be runnable on real chains ----
console.log("live: fresh address runnable (getFlags path)");
const RPC_BY_CHAIN = {
  8453: "https://mainnet.base.org",
  1: "https://eth.llamarpc.com",
  56: "https://bsc-dataseed.binance.org",
  204: "https://opbnb-rpc.publicnode.com",
};
for (const chainId of [8453, 1, 56, 204]) {
  const pub = createPublicClient({ transport: http(RPC_BY_CHAIN[chainId], { timeout: 8000, retryCount: 0 }) });
  const t0 = Date.now();
  const results = await Promise.all(["dailyCheckIn", "gm", "gn"].map((m) =>
    canStillRunTask(pub, { account: FRESH, contract: NIKBASE_CONTRACTS[chainId], method: m })
  ));
  assert.deepEqual(results, [true, true, true], `chain ${chainId}`);
  ok(`chain ${chainId} fresh address runnable in ${Date.now() - t0}ms (timeout cap ${PREFLIGHT_TIMEOUT_MS}ms)`);
}

console.log("\nAll preflight tests passed.");
process.exit(0);
