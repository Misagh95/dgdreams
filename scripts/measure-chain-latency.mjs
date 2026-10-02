/**
 * Times the RPC round-trip the app pays on each chain's first page load, to
 * separate "the page is heavy" from "the chain's RPC is slow".
 *
 * Run: node scripts/measure-chain-latency.mjs
 */
import { createPublicClient, fallback, http } from "viem";
import { allChains } from "../src/config/chains.ts";

const CHAINS = [
  [1, "Ethereum"], [8453, "Base"], [56, "BNB Chain"], [204, "opBNB"],
  [5042, "Arc"], [999, "HyperEVM"], [130, "Unichain"], [4217, "Tempo"],
  [4663, "Robinhood"], [57073, "Ink"],
  [4441, "LITVM Liteforge"], [4221, "GenLayer Bradbury"],
  [1913, "SimpleChain"], [5042002, "ARC Testnet"], [1913, "SimpleChain"],
];

const DUMMY = "0x000000000000000000000000000000000000dEaD";

async function t(label, fn, runs = 3) {
  const times = [];
  let err = "";
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    try {
      await fn();
    } catch (e) {
      err = (e.shortMessage || e.message || "").slice(0, 30);
    }
    times.push(performance.now() - t0);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const flag = avg > 800 ? "  <-- SLOW" : avg > 400 ? "  <- slowish" : "";
  console.log(
    `  ${label.padEnd(24)} avg ${Math.round(avg).toString().padStart(5)}ms  ` +
      `(${times.map((x) => Math.round(x)).join(",")})${err ? " err:" + err : ""}${flag}`
  );
  return avg;
}

const results = [];
const seen = new Set();
for (const [id, name] of CHAINS) {
  if (seen.has(id)) continue;
  seen.add(id);
  const chain = allChains.find((c) => c.id === id);
  if (!chain) {
    console.log(`  ${name.padEnd(24)} not in allChains`);
    continue;
  }
  const client = createPublicClient({
    transport: fallback(chain.rpcUrls.default.http.map((u) => http(u, { timeout: 12_000 }))),
  });
  console.log(`\n=== ${name} (${id}) — ${chain.rpcUrls.default.http[0]}`);
  const chainIdMs = await t("eth_chainId", () => client.getChainId());
  const blockMs = await t("eth_getBlockNumber", () => client.getBlockNumber());
  let codeMs = 0;
  try {
    codeMs = await t("eth_getCode", () => client.getCode({ address: DUMMY }));
  } catch {
    /* ignore */
  }
  results.push({ name, id, chainIdMs, blockMs, codeMs });
}

console.log("\n═══ ranking by first-load cost ═══");
results
  .sort((a, b) => b.blockMs - a.blockMs)
  .forEach((r) =>
    console.log(
      `  ${r.name.padEnd(24)} block ${Math.round(r.blockMs).toString().padStart(5)}ms  ` +
        `chainId ${Math.round(r.chainIdMs)}ms  getCode ${Math.round(r.codeMs)}ms`
    )
  );