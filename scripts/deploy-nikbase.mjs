/**
 * Deploy NikBase to BNB Chain (56) and opBNB (204), then wire the resulting
 * addresses into the app config automatically.
 *
 *   1) set DEPLOYER_PRIVATE_KEY in .env.local (or export it)
 *   2) node scripts/deploy-nikbase.mjs
 *
 * Requires a funded BNB account on both chains. The contract is already
 * compiled by `forge build` into out/NikBase.sol/NikBase.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createWalletClient, createPublicClient, fallback, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnetNetworks } from "../src/config/chains.ts";

const ARTIFACT = "out/NikBase.sol/NikBase.json";
const TARGETS = [
  { id: 56, name: "BNB Chain" },
  { id: 204, name: "opBNB" },
];

// ── private key ──────────────────────────────────────────────────────────
function loadPrivateKey() {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    return process.env.DEPLOYER_PRIVATE_KEY.trim().replace(/^0x/, "");
  }
  const envPath = ".env.local";
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(
      /^\s*DEPLOYER_PRIVATE_KEY\s*=\s*["']?([0-9a-fA-Fx]+)["']?\s*$/m
    );
    if (m) return m[1].replace(/^0x/, "");
  }
  throw new Error(
    "No DEPLOYER_PRIVATE_KEY found. Add it to .env.local as DEPLOYER_PRIVATE_KEY=0x..."
  );
}

// ── artifact ────────────────────────────────────────────────────────────
if (!existsSync(ARTIFACT)) {
  console.error(`Missing ${ARTIFACT} — run "forge build" first.`);
  process.exit(1);
}
const artifact = JSON.parse(readFileSync(ARTIFACT, "utf8"));

// ── deploy ──────────────────────────────────────────────────────────────
const account = privateKeyToAccount(`0x${loadPrivateKey()}`);
console.log(`Deployer: ${account.address}\n`);

const deployed = {};

for (const target of TARGETS) {
  const net = mainnetNetworks.find((n) => n.id === target.id);
  if (!net) {
    console.error(`✗ ${target.name}: not found in mainnetNetworks`);
    process.exit(1);
  }

  const urls = net.rpcUrls.default.http;
  const transport = fallback(urls.map((url) => http(url)));
  const publicClient = createPublicClient({ transport });
  const wallet = createWalletClient({ account, chain: null, transport });

  const liveId = await publicClient.getChainId();
  if (liveId !== target.id) {
    console.error(`✗ ${target.name}: RPC returned chain ${liveId}, expected ${target.id}`);
    process.exit(1);
  }

  const bytecode = artifact.bytecode.object.startsWith("0x")
    ? artifact.bytecode.object
    : `0x${artifact.bytecode.object}`;
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode,
    chain: null,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;
  if (!address) {
    console.error(`✗ ${target.name}: deployment receipt has no address`);
    process.exit(1);
  }
  deployed[target.id] = address;
  console.log(`✓ ${target.name} (${target.id}) → ${address}`);
  console.log(`  tx ${hash}`);
  console.log(`  explorer ${net.blockExplorers.default.url}/address/${address}\n`);
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
    src.slice(0, end).replace(/\s*$/, "\n") +
    entries +
    "\n" +
    src.slice(end);
  writeFileSync(file, next);
  console.log(`✓ patched ${file}`);
}

const rows = Object.entries(deployed)
  .map(([id, address]) => `  ${id}: "${address}",`)
  .join("\n");

patch("src/config/chains.ts", "export const NIKBASE_CONTRACTS", rows);
patch("src/components/DailyTaskPanel.tsx", "export const CONTRACTS", rows);

console.log("\nDone. Addresses wired into the app config — commit when happy.");
