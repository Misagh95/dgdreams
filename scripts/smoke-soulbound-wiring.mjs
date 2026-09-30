/**
 * Smoke test the soulbound badge wiring for a chain: read the address out of
 * the app's SOULBOUND_ADDR map and confirm it is a real SoulboundStreak whose
 * paired NikBase is the same one the app writes daily missions to.
 *
 * Run: node scripts/smoke-soulbound-wiring.mjs [chainId]
 */
import { readFileSync } from "node:fs";
import { createPublicClient, fallback, http, isAddress } from "viem";
import { getNetworkConfig, NIKBASE_CONTRACTS } from "../src/config/chains.ts";

const chainId = Number(process.argv[2] || 204);

// tasks/page.tsx is TSX, so read the map textually
const src = readFileSync("src/app/tasks/page.tsx", "utf8");
const start = src.indexOf("const SOULBOUND_ADDR");
const block = start === -1 ? "" : src.slice(start, src.indexOf("};", start));
const map = {};
for (const m of block.matchAll(/^\s*(\d+):\s*"([^"]*)",?\s*$/gm)) map[Number(m[1])] = m[2];

const abi = JSON.parse(readFileSync("out/SoulboundStreak.sol/SoulboundStreak.json", "utf8")).abi;
const DUMMY = "0x000000000000000000000000000000000000dEaD";

let failures = 0;
function check(label, cond, extra = "") {
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` - ${extra}` : ""}`);
}

const net = getNetworkConfig(chainId);
const address = map[chainId];
console.log(`=== chain ${chainId} - ${net?.name} ===`);

check("network in config", !!net);
check("SOULBOUND_ADDR entry present", !!address, address || "(empty)");

if (address) {
  check("address is valid", isAddress(address));
  const client = createPublicClient({
    transport: fallback(net.rpcUrls.default.http.map((u) => http(u))),
  });
  check("live chain id matches", (await client.getChainId()) === chainId);
  const code = await client.getCode({ address });
  check("code deployed", !!code && code !== "0x", code && code !== "0x" ? `${(code.length - 2) / 2} bytes` : "");

  const nik = await client.readContract({ address, abi, functionName: "nikBase" });
  const expected = NIKBASE_CONTRACTS[chainId];
  check(
    "badge reads the SAME NikBase the app writes missions to",
    nik.toLowerCase() === expected.toLowerCase(),
    `badge->${nik} app->${expected}`
  );

  const minA = await client.readContract({ address, abi, functionName: "MIN_TODAY_ACTIONS" });
  check("MIN_TODAY_ACTIONS == 3", minA === 3n, `got ${minA}`);

  const can = await client.readContract({ address, abi, functionName: "canMint", args: [DUMMY] });
  check("canMint(fresh wallet) == false", can === false);

  const erc721 = await client.readContract({
    address,
    abi: [{ type: "function", name: "supportsInterface", stateMutability: "view", inputs: [{ type: "bytes4" }], outputs: [{ type: "bool" }] }],
    functionName: "supportsInterface", args: ["0x80ac58cd"],
  }).catch(() => false);
  check("reports ERC721", erc721 === true);
}

console.log(`\n${failures === 0 ? "BADGE WIRING OK" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);