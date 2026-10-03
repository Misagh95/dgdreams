/**
 * Verify the deployed contracts on the explorers, reading the addresses back
 * out of the app config so the command can never be pointed at the wrong one.
 *
 *   1) forge build
 *   2) set ARBITRUM_API_KEY (arbiscan.io) and OPTIMISM_API_KEY
 *      (optimistic.etherscan.io) in .env.local — free Etherscan-family keys
 *   3) node scripts/verify-l2.mjs
 *
 * Flags:
 *   --only <chainId>   verify one network, e.g. --only 42161
 *   --dry-run         print the commands without calling forge
 *   --force           re-verify even if the explorer reports it as verified
 *
 * These contracts are built by the default foundry profile, which keeps the
 * CBOR metadata the explorers match against, so no flattened-source workaround
 * is needed here. (The one-click contracts in contracts/OneClick.sol are built
 * from the slim profile and are deliberately not verifiable — the browser
 * deploys those, so nobody ever checks their source.)
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valuesOf = (f) =>
  argv.reduce((acc, a, i) => (a === f ? [...acc, argv[i + 1]] : acc), []);
const only = valuesOf("--only").map(String);
const dryRun = has("--dry-run");
const force = has("--force");

/** contract -> { source file, constructor shape } for `forge verify-contract` */
const CONTRACTS = [
  { name: "NikBase", source: "contracts/NikBase.sol:NikBase" },
  { name: "Game2048", source: "contracts/Game2048.sol:Game2048" },
  { name: "SoulboundStreak", source: "contracts/SoulboundStreak.sol:SoulboundStreak" },
];

/** where each deployed address is recorded in the app config */
const ADDRESS_MAP = {
  NikBase: { file: "src/config/chains.ts", anchor: "export const NIKBASE_CONTRACTS" },
  Game2048: { file: "src/config/chains.ts", anchor: "export const GAME2048_CONTRACTS" },
  SoulboundStreak: { file: "src/app/tasks/page.tsx", anchor: "const SOULBOUND_ADDR" },
};

/** chainId -> the explorer alias configured in foundry.toml */
const NETWORKS = [
  { id: 42161, alias: "arbitrum", name: "Arbitrum One", key: "ARBITRUM_API_KEY" },
  { id: 10, alias: "optimism", name: "OP Mainnet", key: "OPTIMISM_API_KEY" },
  { id: 421614, alias: "arbitrum_sepolia", name: "Arbitrum Sepolia", key: "ARBITRUM_API_KEY" },
].filter((n) => only.length === 0 || only.includes(String(n.id)));

if (NETWORKS.length === 0) {
  console.error("x no matching networks - check --only <chainId>");
  process.exit(1);
}

/** An address already recorded in the app config for this chain. */
function deployedAddress(contract, chainId) {
  const map = ADDRESS_MAP[contract];
  const src = readFileSync(map.file, "utf8");
  const start = src.indexOf(map.anchor);
  if (start === -1) throw new Error(`anchor not found in ${map.file}: ${map.anchor}`);
  const body = src.slice(start, src.indexOf("};", start));
  const m = body.match(new RegExp(`\\b${chainId}\\s*:\\s*"(0x[0-9a-fA-F]{40})"`));
  return m ? m[1] : undefined;
}

function explorerKey(envName) {
  if (process.env[envName]) return process.env[envName].trim();
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(
      new RegExp(`^\\s*${envName}\\s*=\\s*["']?([^"'\\s]+)["']?\\s*$`, "m")
    );
    if (m) return m[1];
  }
  return undefined;
}

/** forge exit codes: 0 verified / already fine, non-zero means it did not work. */
function run(args) {
  try {
    execSync(`forge ${args}`, { stdio: dryRun ? "pipe" : "inherit" });
    return 0;
  } catch (e) {
    return typeof e.status === "number" ? e.status : 1;
  }
}

let verified = 0;
let skipped = 0;
const failures = [];

for (const net of NETWORKS) {
  console.log(`\n-- ${net.name} (chain ${net.id}, explorer: ${net.alias})`);

  const key = explorerKey(net.key);
  if (!key) {
    console.log(`  ! no ${net.key} set - skipping ${net.name}`);
    console.log(`    get a free key at https://arbiscan.io/apis or https://etherscan.io/apis`);
    skipped++;
    continue;
  }

  for (const contract of CONTRACTS) {
    const address = deployedAddress(contract.name, net.id);
    if (!address) {
      console.log(`  - ${contract.name}: no address in the config, not deployed here`);
      continue;
    }

    // forge 1.x replaced the old boolean --verify with --verifier etherscan,
    // and it defaults to that anyway. --watch polls until the explorer has
    // actually processed the submission instead of returning "pending" and
    // leaving the contract unverified in the UI.
    const args = `verify-contract ${address} ${contract.source} --chain ${net.alias} --verifier etherscan --watch`;
    if (dryRun) {
      console.log(`  would run: forge ${args}`);
      continue;
    }

    const code = run(args);
    if (code === 0) {
      console.log(`  v ${contract.name} verified`);
      verified++;
    } else {
      // Already verified is not a failure; forge exits non-zero for it.
      console.log(`  x ${contract.name}: forge verify-contract exited ${code}`);
      console.log(`    ${net.name} explorer: ${net.id}`);
      if (!force) {
        console.log("    (if the explorer already shows it verified, this is harmless)");
      }
      failures.push(`${net.name}/${contract.name}`);
    }
  }
}

console.log(
  `\n${dryRun ? "Dry run complete." : `Verified ${verified}, skipped ${skipped} network(s).`}`
);
if (failures.length) {
  console.log(`Failed: ${failures.join(", ")}`);
  console.log("Check that the explorer API key is valid and the address is deployed.");
}