/**
 * Deploy badge_genlayer.py to GenLayer Bradbury — the genlayer-js edition of
 * scripts/deploy-badges.mjs. GenLayer is non-EVM, so the Solidity deploy
 * script skips chain 4221 and this one owns it.
 *
 *   1) set DEPLOYER_PRIVATE_KEY in .env.local (the wallet must hold GEN gas)
 *   2) node scripts/deploy-genlayer-badge.mjs
 *
 * The script patches src/lib/genlayer/badge.ts (GENLAYER_BADGE_CONTRACT) so
 * the gallery card goes live right after a contract lands.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const CONFIG_FILE = "src/lib/genlayer/badge.ts";
const SOURCE_FILE = "genlayer-contracts/badge_genlayer.py";

function loadPrivateKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    return process.env.DEPLOYER_PRIVATE_KEY.trim().replace(/^0x/, "");
  }
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(
      /^\s*DEPLOYER_PRIVATE_KEY\s*=\s*["']?([0-9a-fA-Fx]+)["']?\s*$/m
    );
    if (m) return m[1].replace(/0x/, "");
  }
  throw new Error("No DEPLOYER_PRIVATE_KEY found in .env.local");
}

const OK_STATUSES = ["ACCEPTED", "FINALIZED"];
const FAIL_STATUSES = ["UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"];

function executionFailed(tx) {
  const name = String(
    tx?.txExecutionResultName ??
      tx?.resultName ??
      tx?.consensus_data?.leader_receipt?.[0]?.execution_result ??
      tx?.consensus_data?.leader_receipt?.execution_result ??
      ""
  ).toUpperCase();
  if (name.includes("ERROR") || name.includes("ROLLBACK")) {
    return (
      tx?.consensus_data?.leader_receipt?.[0]?.error ??
      tx?.consensus_data?.leader_receipt?.error ??
      "execution failed"
    );
  }
  return null;
}

const account = createAccount(`0x${loadPrivateKey()}`);
const client = createClient({ chain: testnetBradbury, account });

console.log(`Account: ${account.address}`);
console.log(`Chain:   ${testnetBradbury.name} (id=${testnetBradbury.id})`);

// genlayer-py does this implicitly; genlayer-js exposes it as a wallet action.
try {
  await client.initializeConsensusSmartContract();
  console.log("  ✓ consensus smart contract initialized");
} catch (e) {
  console.log("  (init note: " + String(e).split("\n")[0].slice(0, 120) + ")");
}

// Fund check — deploying writes consensus data, so an empty wallet goes nowhere.
let balance = 0n;
try {
  balance = await client.publicClient.getBalance({ address: account.address });
} catch {
  balance = await client.getBalance({ address: account.address });
}
console.log(`Balance: ${balance} wei`);
if (balance === 0n) {
  console.error("✗ unfunded — send a little GEN to the account above, then re-run.");
  process.exit(1);
}

if (
  process.argv.includes("--dry-run")
) {
  console.log("DRY RUN: everything checks out, re-run without --dry-run to deploy.");
  process.exit(0);
}

const raw = readFileSync(SOURCE_FILE, "utf8");

console.log(`Deploying ${SOURCE_FILE}...`);
const hash = await client.deployContract({
  account,
  code: raw,
  args: [],
});
console.log(`  Tx: ${hash}`);

// GenLayer consensus is async — poll until ACCEPTED/FINALIZED (or fail loudly).
const start = Date.now();
let done = false;
let tx = null;
while (Date.now() - start < 240000) {
  try {
    tx = await client.getTransaction({ hash });
    const status = String(tx?.statusName || tx?.status || "PENDING").toUpperCase();
    if (OK_STATUSES.includes(status)) {
      const err = executionFailed(tx);
      if (err) {
        console.error(`✗ ${err}`);
        process.exit(1);
      }
      done = true;
      break;
    }
    if (FAIL_STATUSES.includes(status)) {
      console.error(`✗ GenLayer: ${status}`);
      process.exit(1);
    }
    process.stdout.write(".");
  } catch {
    /* not indexed yet */
  }
  await new Promise((r) => setTimeout(r, 4000));
}
if (!done) {
  console.error("\n✗ confirmation timed out — check the explorer, the tx may still land.");
  console.error(`  ${hash}`);
  process.exit(1);
}
console.log("\n  ✓ landed");

// The deployed contract address is recorded by the explorer (genlayer-js tx
// objects don't carry it), so pull it from there.
let address = "";
try {
  const r = await fetch(`https://explorer-bradbury.genlayer.com/api/v1/transactions/${hash}`);
  const j = await r.json();
  address = String(j?.deployed_contract_address ?? "").toLowerCase();
} catch (e) {
  console.log("  explorer fetch failed:", String(e).split("\n")[0].slice(0, 80));
}
if (!address.startsWith("0x") || address.length !== 42) {
  console.log(`  Could not resolve the address. Open the explorer for ${hash}`);
  console.log("  and paste it into src/lib/genlayer/badge.ts (GENLAYER_BADGE_CONTRACT).");
  process.exit(0);
}

console.log(`  Address: ${address}`);
const src = readFileSync(CONFIG_FILE, "utf8");
const next = src.replace(/0x[a-fA-F0-9]{40}/, address);
if (next !== src) {
  writeFileSync(CONFIG_FILE, next);
  console.log(`  ✓ patched ${CONFIG_FILE}`);
}
console.log("\nDONE. Refresh the gallery — the GEN card is mintable now.");
