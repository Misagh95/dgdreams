/**
 * Smoke test: read the address straight out of the app's contract maps and
 * exercise it on-chain, so we prove the wiring — not just the address — works.
 *
 * Run: node scripts/smoke-nikbase-wiring.mjs
 */
import { readFileSync } from "node:fs";
import { createPublicClient, fallback, http, isAddress } from "viem";
import { NIKBASE_CONTRACTS, getNetworkConfig } from "../src/config/chains.ts";

// DailyTaskPanel.tsx is TSX/JSX, so extract its CONTRACTS map textually,
// scoped to that block so no other address map in the file leaks in.
const panelSrc = readFileSync("src/components/DailyTaskPanel.tsx", "utf8");
const blockStart = panelSrc.indexOf("export const CONTRACTS");
const block = blockStart === -1 ? "" : panelSrc.slice(blockStart, panelSrc.indexOf("};", blockStart));
const panelMap = {};
for (const m of block.matchAll(/^\s*(\d+):\s*"(0x[0-9a-fA-F]{40})",?\s*$/gm)) {
  panelMap[Number(m[1])] = m[2];
}

const CHAINS = [56, 204];
const DUMMY = "0x000000000000000000000000000000000000dEaD";

const nikAbi = [
  { type: "function", name: "getActionCounts", stateMutability: "view",
    inputs: [{ type: "address", name: "user" }],
    outputs: [
      { type: "uint256", name: "actCount" }, { type: "uint256", name: "dose" },
      { type: "uint256", name: "mood" }, { type: "uint256", name: "sanitize" },
      { type: "uint256", name: "counter" }, { type: "uint256", name: "spin" },
    ] },
  { type: "function", name: "version", stateMutability: "pure",
    inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "getUserData", stateMutability: "view",
    inputs: [{ type: "address", name: "user" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }] },
];

let failures = 0;
function check(label, cond, extra = "") {
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
}

for (const chainId of CHAINS) {
  const net = getNetworkConfig(chainId);
  const fromChains = NIKBASE_CONTRACTS[chainId];
  const fromPanel = panelMap[chainId];

  console.log(`\n=== chain ${chainId} — ${net?.name} ===`);
  check("getNetworkConfig returns the network", !!net, net?.name);
  check("NIKBASE_CONTRACTS entry present", !!fromChains, fromChains);
  check("DailyTaskPanel CONTRACTS entry present", !!fromPanel, fromPanel);
  check("both maps agree", fromChains === fromPanel);
  check("address is valid", isAddress(fromChains ?? "0x"), fromChains);

  const client = createPublicClient({
    transport: fallback(net.rpcUrls.default.http.map((u) => http(u))),
  });
  check("live chain id matches", (await client.getChainId()) === chainId);

  const code = await client.getCode({ address: fromChains });
  check("code deployed at that address", !!code && code !== "0x");

  const version = await client.readContract({
    address: fromChains, abi: nikAbi, functionName: "version",
  });
  check("version() reads back", version === "NikBase v3.0.0", version);

  const counts = await client.readContract({
    address: fromChains, abi: nikAbi, functionName: "getActionCounts", args: [DUMMY],
  });
  check("getActionCounts returns 6 uints", Array.isArray(counts) && counts.length === 6,
    counts.map(String).join(","));

  const user = await client.readContract({
    address: fromChains, abi: nikAbi, functionName: "getUserData", args: [DUMMY],
  });
  check("getUserData returns 3 uints", Array.isArray(user) && user.length === 3,
    user.map(String).join(","));
}

console.log(`\n${failures === 0 ? "WIRING OK — all checks passed" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
