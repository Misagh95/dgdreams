/**
 * Deploy NikBase + Game2048 + SoulboundStreak to the L2s, then wire the addresses
 * into the app config automatically.
 *
 *   1) fund the deployer on each target (L2 gas is pennies — use --dry-run to see
 *      the exact cost before sending anything)
 *   2) set DEPLOYER_PRIVATE_KEY in .env.local (or export it)
 *   3) forge build
 *   4) node scripts/deploy-l2.mjs
 *
 * Flags:
 *   --dry-run      print the plan and estimated cost, deploy nothing
 *   --force        redeploy even when an address is already recorded
 *   --only <id>    restrict to one chain id, e.g. --only 42161
 *   --skip-nft     do not deploy the SoulboundStreak badge
 *
 * SoulboundStreak reads its streak from NikBase, so it is always deployed after
 * NikBase on the same chain.
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

// ── targets ───────────────────────────────────────────────────────────────
const TARGETS = [
  { id: 42161, name: "Arbitrum One" },
  { id: 10, name: "OP Mainnet" },
  { id: 421614, name: "Arbitrum Sepolia" },
]
  .filter((t) => only.length === 0 || only.includes(String(t.id)))
  .map((t) => ({
    ...t,
    net: [...mainnetNetworks, ...testnetNetworks].find((n) => n.id === t.id),
  }));

if (TARGETS.length === 0) {
  console.error("✗ no matching targets — check --only <chainId>");
  process.exit(1);
}

// ── contracts, in deploy order ─────────────────────────────────────────────
const CONTRACTS = [
  {
    name: "NikBase",
    artifact: "out/NikBase.sol/NikBase.json",
    args: () => [],
    maps: [
      { file: "src/config/chains.ts", anchor: "export const NIKBASE_CONTRACTS" },
      { file: "src/components/DailyTaskPanel.tsx", anchor: "export const CONTRACTS" },
    ],
  },
  {
    name: "Game2048",
    artifact: "out/Game2048.sol/Game2048.json",
    args: () => [],
    maps: [{ file: "src/config/chains.ts", anchor: "export const GAME2048_CONTRACTS" }],
  },
  {
    name: "SoulboundStreak",
    artifact: "out/SoulboundStreak.sol/SoulboundStreak.json",
    args: (onChain, deployer) => [onChain.NikBase, deployer],
    maps: [{ file: "src/app/tasks/page.tsx", anchor: "const SOULBOUND_ADDR" }],
  },
].filter((c) => !(has("--skip-nft") && c.name === "SoulboundStreak"));

// ── helpers ────────────────────────────────────────────────────────────────
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

/** An address already recorded in a config file, so a re-run can be a no-op. */
function existingAddress(file, anchor, chainId) {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf(anchor);
  if (start === -1) return undefined;
  const body = src.slice(start, src.indexOf("};", start));
  const m = body.match(new RegExp(`\\b${chainId}\\s*:\\s*"(0x[0-9a-fA-F]{40})"`));
  return m ? m[1] : undefined;
}

/**
 * Rewrite the `<chainId>: "0x…"` row instead of appending one. Appending on
 * every run is how these maps end up with duplicate keys that silently shadow
 * each other, so an existing row is replaced in place.
 */
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
    console.log(`  ✓ patched ${file}`);
  }
}

const account = privateKeyToAccount(`0x${loadPrivateKey()}`);

console.log(`Deployer: ${account.address}`);
console.log(`Mode:     ${dryRun ? "DRY RUN — nothing is signed or sent" : "LIVE"}`);
if (only.length) console.log(`Only:     ${only.join(", ")}`);
if (dryRun) console.log("");
// ── deploy ─────────────────────────────────────────────────────────────────
/** deployed[chainId][contractName] = address */
const deployed = {};

for (const target of TARGETS) {
  const { net, id, name } = target;
  if (!net) {
    console.error(`✗ ${name}: chain ${id} is not in the app's chain list`);
    process.exit(1);
  }

  const transport = fallback(net.rpcUrls.default.http.map((url) => http(url)));
  const publicClient = createPublicClient({ transport });
  const wallet = createWalletClient({ account, chain: null, transport });

  const liveId = await publicClient.getChainId();
  if (liveId !== id) {
    console.error(`✗ ${name}: RPC reports chain ${liveId}, expected ${id}`);
    process.exit(1);
  }

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`\n── ${name} (chain ${id}) ──`);
  console.log(`  balance  ${formatEther(balance)} ${net.nativeCurrency.symbol}`);
  if (balance === 0n && !dryRun) {
    console.error(`  ✗ deployer is unfunded on ${name} — fund it first`);
    process.exit(1);
  }

  deployed[id] = {};

  for (const contract of CONTRACTS) {
    const { abi, bytecode } = loadArtifact(contract.artifact);

    // Skip a chain whose address is already recorded, unless --force. Deploying
    // NikBase twice orphans the first instance along with its users' streaks.
    const already = contract.maps[0]
      ? existingAddress(contract.maps[0].file, contract.maps[0].anchor, id)
      : undefined;
    if (already && !force) {
      console.log(`  · ${contract.name} already deployed → ${already} (skipped; --force to redo)`);
      deployed[id][contract.name] = already;
      continue;
    }

    const args = contract.args(deployed[id], account.address);

    // A dependent contract cannot be priced yet when its dependency was not
    // actually deployed — which is exactly the dry-run case. Say that instead
    // of surfacing a raw "address is undefined" from the encoder.
    const missingArg = args.some((a) => !a);
    const shown = args.map((a) => a || "(from the step above)");

    if (missingArg && dryRun) {
      console.log(`  ~ ${contract.name}: cost needs the address from the step above`);
      console.log(`    would deploy with args: ${shown.join(", ")}`);
      continue;
    }

    // Cost preview. On an L2 the execution gas is pennies but the L1 data fee is
    // the part that surprises people, so show the whole cost, not a raw gas count.
    let estimate = null;
    if (!missingArg) {
      try {
        // viem has no deployment estimator, so build the creation tx exactly as
        // the wallet would and price it with estimateGas + the current fee.
        const data = encodeDeployData({ abi, bytecode, args });
        const gas = await publicClient.estimateGas({
          account: account.address,
          data,
        });
        const fee = await publicClient.estimateFeesPerGas();
        const price = fee.maxFeePerGas ?? fee.gasPrice ?? 0n;
        estimate = { gas, cost: gas * price, price };
      } catch (e) {
        console.log(`  ! could not estimate ${contract.name}: ${String(e).split("\n")[0]}`);
      }
    }

    if (estimate) {
      console.log(
        `  ~ ${contract.name}: ${estimate.gas.toLocaleString()} gas ` +
          `≈ ${formatEther(estimate.cost)} ${net.nativeCurrency.symbol} ` +
          `(at ${formatEther(estimate.price)} gwei)`
      );
    }

    if (dryRun) {
      console.log(`    would deploy${shown.length ? ` with args: ${shown.join(", ")}` : ""}`);
      continue;
    }

    const hash = await wallet.deployContract({ abi, bytecode, args, chain: null });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress;
    if (!address) {
      console.error(`  ✗ ${contract.name}: no address in the receipt`);
      process.exit(1);
    }

    deployed[id][contract.name] = address;
    console.log(`  ✓ ${contract.name} → ${address}`);
    if (args.length) console.log(`    args   ${args.join(", ")}`);
    console.log(`    tx     ${hash}`);
    console.log(`    ${net.blockExplorers.default.url}/address/${address}`);
    if (estimate) {
      console.log(
        `    gas used ${receipt.gasUsed.toLocaleString()} · fee ` +
          `${formatEther(receipt.gasUsed * receipt.effectiveGasPrice)} ${net.nativeCurrency.symbol}`
      );
// ── wire the addresses into the app config ─────────────────────────────────
if (!dryRun) {
  const touched = new Set();
  for (const contract of CONTRACTS) {
    for (const target of TARGETS) {
      const address = deployed[target.id]?.[contract.name];
      if (!address) continue;
      for (const map of contract.maps) {
        patch(map.file, map.anchor, target.id, address);
        touched.add(map.file);
      }
    }
  }
  console.log(
    `\nDone. Addresses wired into: ${[...touched].join(", ")} — commit when happy.`
  );
  console.log(
    "These contracts keep their metadata, so Arbiscan and Etherscan can verify\n" +
      "them against exactly the sources in contracts/."
  );
} else {
  console.log("\nDry run complete — re-run without --dry-run to deploy.");
}
    }
  }
}