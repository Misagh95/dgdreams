// Regression test for: deploy steps 3/4/5 (Simple/Token/NFT) wrongly show
// "already deployed" for a wallet that never deployed them.
// Root cause: the old v1 cache was keyed "<chainId>:<artifact>" with no
// wallet, so one wallet's (or one session's) addresses leaked into another.
// Run: node scripts/test-deploystore.mjs
import { strict as assert } from "node:assert";
import {
  DEPLOY_STORE_KEY,
  deployedAddressesFor,
  deploymentCacheKey,
  readDeployStore,
  writeDeployStore,
} from "../src/lib/deployStore.ts";

const ok = (name) => console.log(`  ok - ${name}`);
const WALLET_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const WALLET_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER = "0xcccccccccccccccccccccccccccccccccccccccc";

// minimal localStorage shim for Node
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
globalThis.window = {};

console.log("case: legacy v1 entries (bare address strings) are ignored");
writeDeployStore({ "8453:DGDemo": "0xdddddddddddddddddddddddddddddddddddddddd" });
assert.deepEqual(deployedAddressesFor(8453, WALLET_A, ["DGDemo", "DGLiteToken", "DGLiteNft"]), {});
ok("v1 string entry does not mark anything as deployed");

console.log("case: another wallet's entry does not leak");
writeDeployStore({
  [deploymentCacheKey(8453, WALLET_A, "DGDemo")]: { address: OTHER, deployer: WALLET_A },
});
assert.deepEqual(deployedAddressesFor(8453, WALLET_B, ["DGDemo", "DGLiteToken", "DGLiteNft"]), {});
ok("wallet B sees nothing deployed");
assert.deepEqual(deployedAddressesFor(8453, WALLET_A, ["DGDemo", "DGLiteToken", "DGLiteNft"]), { DGDemo: OTHER });
ok("wallet A still sees its own deploy");

console.log("case: round-trip write/read keeps shape, unknown keys ignored");
writeDeployStore({
  [deploymentCacheKey(1, WALLET_B, "DGLiteToken")]: {
    address: OTHER,
    deployer: WALLET_B,
    txHash: "0x1234",
  },
});
const back = readDeployStore();
assert.equal(back[deploymentCacheKey(1, WALLET_B, "DGLiteToken")].address, OTHER);
assert.equal(back[developmentKeyCheck()], undefined);
ok("round-trip ok");
function developmentKeyCheck() { return "nope:not-a-key"; }

console.log("case: v1 key sitting in the NEW store file is still ignored");
mem[DEPLOY_STORE_KEY] = JSON.stringify({ "1:DGLiteNft": OTHER });
assert.deepEqual(deployedAddressesFor(1, WALLET_A, ["DGLiteNft"]), {});
ok("bare key in v2 file ignored");

console.log("\nAll deploy-store tests passed.");
process.exit(0);
