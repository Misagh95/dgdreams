/**
 * Deploy the Grand Tour badge (ChainBadge) on every DGDreams network, then
 * wire the addresses into src/lib/badge.ts automatically.
 *
 *   1) fund the deployer on the chains you want (use --dry-run for exact costs)
 *   2) set DEPLOYER_PRIVATE_KEY in .env.local
 *   3) forge build
 *   4) node scripts/deploy-badges.mjs
 *
 * Flags:
 *   --dry-run      print the plan and estimated cost, deploy nothing
 *   --force        redeploy even when an address is already recorded
 *   --only <id>    restrict to one chain id, e.g. --only 8453
 *   --exclude <id> skip a chain, e.g. --exclude 1868
 *
 * Unlike deploy-l2.mjs, a failing chain does NOT abort the run — the badge is
 * independent per chain, and losing a testnet must not cost the mainnets. The
 * run continues and a summary prints at the end.
 *
 * GenLayer (4221) is excluded by default: it is a non-EVM chain running
 * Python Intelligent Contracts, so the Solidity ChainBadge needs a separate
 * genlayer-js deployment there before its gallery card can go live.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createWalletClient, createPublicClient, encodeDeployData, fallback, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnetNetworks, testnetNetworks } from "../src/config/chains.ts";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valuesOf = (f) =>
  argv.reduce((acc, a, i) => (a === f ? [...acc, argv[i + 1]] : acc), []);

const dryRun = has("--dry-run");
const force = has("--force");
const only = valuesOf("--only").map(String);
const excluded = valuesOf("--exclude").map(String);

// GenLayer is a Python-Intelligent-Contract chain — the EVM bytecode path
// does not apply there, so it is off the Solidity deploy path until a
// genlayer-js edition lands. Robinhood is marked coming-soon in the app config.
const DEFAULT_EXCLUDE = new Set(["4221", "4663"]);

const NETWORKS = [...mainnetNetworks, ...testnetNetworks];

// When --only is given the user targets a chain explicitly, so the default
// exclusions yield to it — except GenLayer (4221), which is a Python-
// Intelligent-Contract chain no Solidity bytecode can land on.
const TARGETS = NETWORKS.filter(
  (n) =>
    (only.length === 0 || only.includes(String(n.id))) &&
    !excluded.includes(String(n.id)) &&
    (only.length > 0 || !DEFAULT_EXCLUDE.has(String(n.id))) &&
    String(n.id) !== "4221"
).map((n) => ({ id: n.id, name: n.name, net: n }));

if (TARGETS.length === 0) {
  console.error("✗ no matching targets — check --only/--exclude");
  process.exit(1);
}

const CONFIG_FILE = "src/lib/badge.ts";
const ANCHOR = "export const BADGE_ADDR";

// ── the badge ─────────────────────────────────────────────────────────────
// One contract, per-chain name/symbol, so each network's badge identifies
// itself. Metadata base is this app's own /api/badge route, which completes
// the URL with ?chain=<chainid>&id=<tokenId> and serves the network logo.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://dgdreams.space").replace(/\/+$/, "");

const CONTRACT = {
  name: "ChainBadge",
  artifact: "out/ChainBadge.sol/ChainBadge.json",
  args: (net) => [
    `DGDreams ${net.shortName} Badge`,
    symbolFor(net.shortName),
    `${SITE}/api/badge`,
  ],
};

function symbolFor(shortName) {
  const clean = shortName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `DGB-${clean}`;
}

// ── helpers (same recipe as deploy-l2.mjs) ────────────────────────────────
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
  throw new Error(
    "No DEPLOYER_PRIVATE_KEY found. Add it to .env.local as DEPLOYER_PRIVATE_KEY=0x..."
  );
}

function loadArtifact(path) {
  if (!existsSync(path)) {
    console.error(`✗ missing ${path} — run "forge build" first`);
    process.exit(1);
  }
  const a = JSON.parse(readFileSync(path, "utf8"));
  const bytecode = a.bytecode.object.startsWith("0x")
    ? a.bytecode.object
    : `0x${a.bytecode.object}`;
  return { abi: a.abi, bytecode };
}

function existingAddress(file, anchor, chainId) {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf(anchor);
  if (start === -1) return undefined;
  const body = src.slice(start, src.indexOf("};", start));
  const m = body.match(new RegExp(`\\b${chainId}\\s*:\\s*"(0x[0-9a-fA-F]{40})"`));
  return m ? m[1] : undefined;
}

/** Rewrite the `<chainId>: "0x…"` row in place — never append a duplicate. */
function patch(file, anchor, chainId, address) {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf(anchor);
  if (start === -1) {
    console.error(`✗ anchor not found in ${file}: ${anchor}`);
    process.exit(1);
  }
  const end = src.indexOf("};", start);
  const body = src.slice(start, end);
  const row = new RegExp(`([ \\t])${chainId}\\s*:\\s*"[^"]*"`);
  const next = row.test(body)
    ? src.slice(0, start) + body.replace(row, `$1${chainId}: "${address}"`) + src.slice(end)
    : src.slice(0, end).replace(/\s*$/, "\n") + `  ${chainId}: "${address}",\n` + src.slice(end);

  if (next !== src) {
    writeFileSync(file, next);
    console.log(`  ✓ patched ${CONFIG_FILE}`);
  }
}

const account = privateKeyToAccount(`0x${loadPrivateKey()}`);

console.log(`Deployer: ${account.address}`);
console.log(`Metadata: ${SITE}/api/badge`);
console.log(`Mode:     ${dryRun ? "DRY RUN — nothing is signed or sent" : "LIVE"}`);
if (only.length) console.log(`Only:     ${only.join(", ")}`);
if ([...excluded, ...DEFAULT_EXCLUDE].length) {
  console.log(`Excluded: ${[...excluded, ...DEFAULT_EXCLUDE].join(", ")}`);
}
console.log("");

// ── deploy ────────────────────────────────────────────────────────────────
const results = []; // { id, name, address?, error? }

for (const target of TARGETS) {
  const { net, id, name } = target;
  const transport = fallback(net.rpcUrls.default.http.map((url) => http(url)));
  const publicClient = createPublicClient({ transport });
  const wallet = createWalletClient({ account, chain: null, transport });

  console.log(`\n── ${name} (chain ${id}) ──`);

  try {
    const liveId = await publicClient.getChainId();
    if (liveId !== id) throw new Error(`RPC reports chain ${liveId}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`  balance  ${formatEther(balance)} ${net.nativeCurrency.symbol}`);
    if (balance === 0n) {
      console.log(`  x unfunded - skipping (re-run: node scripts/deploy-badges.mjs --only ${id})`);
      results.push({ id, name, error: "unfunded" });
      continue;
    }

    const already = existingAddress(CONFIG_FILE, ANCHOR, id);
    if (already && !force) {
      console.log(`  · already deployed → ${already} (skipped; --force to redo)`);
      results.push({ id, name, address: already });
      continue;
    }

    const args = [...CONTRACT.args(net), account.address];
    const { abi, bytecode } = loadArtifact(CONTRACT.artifact);
    const data = encodeDeployData({ abi, bytecode, args });

    // L1 data fee surprises on Orbit chains — price the creation tx like the
    // wallet does before sending anything.
    const gas = await publicClient.estimateGas({ account: account.address, data });
    const fee = await publicClient.estimateFeesPerGas();
    const price = fee.maxFeePerGas ?? fee.gasPrice ?? 0n;
    console.log(
      `  ~ ${CONTRACT.name}: ${gas.toLocaleString()} gas ≈ ` +
        `${formatEther(gas * price)} ${net.nativeCurrency.symbol} (at ${formatEther(price)} gwei)`
    );

    if (dryRun) {
      console.log(`    args: ${args.join(", ")}`);
      results.push({ id, name, error: "dry-run" });
      continue;
    }

    if (balance < gas * price) {
      console.log(`  x needs ${formatEther(gas * price)}, have ${formatEther(balance)} - skipping`);
      results.push({ id, name, error: "insufficient balance" });
      continue;
    }

    const hash = await wallet.deployContract({
      abi,
      bytecode,
      args,
      chain: null,
      gas: (gas * 105n) / 100n,
      // Orbit-style sequencers track a message index the wallet's cached nonce
      // can drift from ("nonce too low"). Fetch it fresh from the RPC instead.
      nonce: await publicClient.getTransactionCount({ address: account.address }),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress;
    if (!address) throw new Error("no address in the receipt");

    console.log(`  v ${CONTRACT.name} -> ${address}`);
    console.log(`    tx ${hash}`);
    console.log(`    ${net.blockExplorers.default.url}/address/${address}`);
    patch(CONFIG_FILE, ANCHOR, id, address);
    results.push({ id, name, address });
  } catch (e) {
    const detail = String(e?.details || e?.shortMessage || e).split("\n")[0];
    console.error(`  x ${CONTRACT.name}: ${detail}`);
    results.push({ id, name, error: detail });
  }
}

// ── summary ───────────────────────────────────────────────────────────────
const deployed = results.filter((r) => r.address);
const failed = results.filter((r) => !r.address);
console.log(`\nDeployed on ${deployed.length}/${TARGETS.length} chains.`);
if (failed.length) {
  console.log("Not deployed yet:");
  for (const r of failed) console.log(`  · ${r.name} (${r.id}): ${r.error}`);
}
console.log(
  dryRun ? "Dry run complete - re-run without --dry-run to deploy." :
  `Addresses wired into ${CONFIG_FILE} — commit when happy.`
);
