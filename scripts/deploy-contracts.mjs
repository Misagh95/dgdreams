/**
 * Deploy the app's Solidity contracts to BNB Chain (56) and opBNB (204), then
 * wire the resulting addresses into the app config automatically.
 *
 *   1) set DEPLOYER_PRIVATE_KEY in .env.local (or export it)
 *   2) forge build
 *   3) node scripts/deploy-contracts.mjs
 *
 * Requires a funded BNB account on both chains. Contracts must already be
 * compiled by `forge build` into out/<Name>.sol/<Name>.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createWalletClient, createPublicClient, fallback, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnetNetworks } from "../src/config/chains.ts";

/** contract -> the app maps that need its address */
const CONTRACTS = [
  {
    name: "NikBase",
    artifact: "out/NikBase.sol/NikBase.json",
    maps: [
      { file: "src/config/chains.ts", anchor: "export const NIKBASE_CONTRACTS" },
      { file: "src/components/DailyTaskPanel.tsx", anchor: "export const CONTRACTS" },
    ],
  },
  {
    name: "Game2048",
    artifact: "out/Game2048.sol/Game2048.json",
    maps: [
      { file: "src/config/chains.ts", anchor: "export const GAME2048_CONTRACTS" },
    ],
  },
];

const TARGETS = [
  { id: 56, name: "BNB Chain" },
  { id: 204, name: "opBNB" },
];

// ── private key ──────────────────────────────────────────────────────────
function loadPrivateKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    return process.env.DEPLOYER_PRIVATE_KEY.trim().replace(/^0x/, "");
  }
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(
      /^\s*DEPLOYER_PRIVATE_KEY\s*=\s*["']?([0-9a-fA-Fx]+)["']?\s*$/m
    );
    if (m) return m[1].replace(/^0x/, "");
  }
  throw new Error(
    "No DEPLOYER_PRIVATE_KEY found. Add it to .env.local as DEPLOYER_PRIVATE_KEY=0x..."
  );
}

function loadArtifact(path) {
  if (!existsSync(path)) {
    console.error(`Missing ${path} — run "forge build" first.`);
    process.exit(1);
  }
  const a = JSON.parse(readFileSync(path, "utf8"));
  const bytecode = a.bytecode.object.startsWith("0x")
    ? a.bytecode.object
    : `0x${a.bytecode.object}`;
  return { abi: a.abi, bytecode };
}

// ── deploy ──────────────────────────────────────────────────────────────
const account = privateKeyToAccount(`0x${loadPrivateKey()}`);
console.log(`Deployer: ${account.address}\n`);

/** deployed[chainId][contractName] = address */
const deployed = {};

for (const target of TARGETS) {
  const net = mainnetNetworks.find((n) => n.id === target.id);
  if (!net) {
    console.error(`✗ ${target.name}: not found in mainnetNetworks`);
    process.exit(1);
  }

  const transport = fallback(net.rpcUrls.default.http.map((url) => http(url)));
  const publicClient = createPublicClient({ transport });
  const wallet = createWalletClient({ account, chain: null, transport });

  const liveId = await publicClient.getChainId();
  if (liveId !== target.id) {
    console.error(
      `✗ ${target.name}: RPC returned chain ${liveId}, expected ${target.id}`
    );
    process.exit(1);
  }

  console.log(`── ${target.name} (chain ${target.id}) ──`);
  deployed[target.id] = {};

  for (const contract of CONTRACTS) {
    const { abi, bytecode } = loadArtifact(contract.artifact);

    const hash = await wallet.deployContract({ abi, bytecode, chain: null });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress;
    if (!address) {
      console.error(`✗ ${target.name}/${contract.name}: no address in receipt`);
      process.exit(1);
    }
    deployed[target.id][contract.name] = address;
    console.log(`  ✓ ${contract.name} → ${address}`);
    console.log(`    tx     ${hash}`);
    console.log(`    ${net.blockExplorers.default.url}/address/${address}`);
  }
  console.log("");
}

// ── write addresses into the app config ─────────────────────────────────
function patch(file, anchor, entries) {
  const src = readFileSync(file, "utf8");
  const idx = src.indexOf(anchor);
  if (idx === -1) {
    console.error(`✗ anchor not found in ${file}: ${anchor}`);
    process.exit(1);
  }
  const end = src.indexOf("};", idx);
  const next =
    src.slice(0, end).replace(/\s*$/, "\n") + entries + "\n" + src.slice(end);
  writeFileSync(file, next);
  console.log(`  ✓ patched ${file}`);
}

for (const contract of CONTRACTS) {
  const rows = TARGETS.map(
    ({ id }) => `  ${id}: "${deployed[id][contract.name]}",`
  ).join("\n");

  console.log(`\n${contract.name}:`);
  for (const map of contract.maps) patch(map.file, map.anchor, rows);
}

console.log("\nDone. Addresses wired into the app config — commit when happy.");
