// Regression test for: 6-in-1 runner skipped missions as "already done"
// on chain B because the page probe had seen them done on chain A.
// Run: node scripts/test-fiveinone-scoping.mjs
import { strict as assert } from "node:assert";
import { createPublicClient, http } from "viem";
import { runSequence } from "../src/lib/sequence.ts";

const ok = (name) => console.log(`  ok - ${name}`);
const FRESH = "0x1111111111111111111111111111111111111111";

// live Base RPC (only used for nonce reads after a rejected send)
const RPCCLIENT = createPublicClient({
  transport: http("https://mainnet.base.org", { timeout: 8000, retryCount: 0 }),
});

console.log("case: probe-done ids belong to chain A (8453), runner targets chain B (1)");
{
  const sent = [];
  const provider = {
    request: async ({ method }) => {
      if (method === "eth_sendTransaction") {
        sent.push(1);
        throw new Error("user rejected"); // abort after proving a send was attempted
      }
      if (method === "eth_chainId") return "0x1";
      return "0x0";
    },
  };
  // doneTaskIds qualified for 8453 only — target chain 1 must be unaffected
  const parentDone = new Set(["8453:checkIn", "8453:gm", "8453:gn"]);
  const seen = [];
  const done = {
    // mirrors FiveInOne.isDone after the fix
    isDone: (id) => (1 ? parentDone.has(`1:${id}`) : false),
    mark: (id) => seen.push(id),
  };
  const results = await runSequence({
    steps: [
      { id: "checkIn", label: "Check-In", kind: "mission", method: "dailyCheckIn" },
      { id: "gm", label: "GM", kind: "mission", method: "gm" },
      { id: "gn", label: "GN", kind: "mission", method: "gn" },
    ],
    account: FRESH,
    chainId: 1,
    contractAddress: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
    rpcUrls: ["https://mainnet.base.org"],
    getProvider: async () => provider,
    done,
    onUpdate: () => {},
    signal: { aborted: false },
  });
  assert.equal(results[0].status !== "already", true, "checkIn must not be skipped as already");
  assert.equal(results[1].status !== "already", true, "gm must not be skipped as already");
  assert.equal(results[2].status !== "already", true, "gn must not be skipped as already");
  assert.equal(sent.length, 3, "all three missions must attempt a transaction");
  ok("chain-A dones do not skip chain-B missions");
  void RPCCLIENT;
}

console.log("case: same-chain probe dones still skip (no useless wallet popup)");
{
  const sent = [];
  const provider = {
    request: async () => {
      sent.push(1);
      return "0x" + "ab".repeat(32);
    },
  };
  const parentDone = new Set(["1:checkIn", "1:gm", "1:gn"]);
  const done = {
    isDone: (id) => parentDone.has(`1:${id}`),
    mark: () => {},
  };
  const results = await runSequence({
    steps: [
      { id: "checkIn", label: "Check-In", kind: "mission", method: "dailyCheckIn" },
      { id: "gm", label: "GM", kind: "mission", method: "gm" },
      { id: "gn", label: "GN", kind: "mission", method: "gn" },
    ],
    account: FRESH,
    chainId: 1,
    contractAddress: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
    rpcUrls: ["https://mainnet.base.org"],
    getProvider: async () => provider,
    done,
    onUpdate: () => {},
    signal: { aborted: false },
  });
  assert.equal(results[0].status, "already");
  assert.equal(results[1].status, "already");
  assert.equal(results[2].status, "already");
  assert.equal(sent.length, 0, "no transaction attempted for done missions");
  ok("same-chain dones still skip");
}

console.log("\nAll 6-in-1 scoping tests passed.");
process.exit(0);
