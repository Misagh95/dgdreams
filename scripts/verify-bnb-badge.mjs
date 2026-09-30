/**
 * Verify a freshly deployed BNB soulbound badge before wiring it into the app.
 * The critical check: nikBase() must equal the NikBase the app writes daily
 * missions to on chain 56, otherwise the badge can never unlock.
 *
 * Run: node scripts/verify-bnb-badge.mjs 0xADDRESS
 */
import { readFileSync } from "node:fs";
import { createPublicClient, fallback, http, isAddress } from "viem";
import { getNetworkConfig, NIKBASE_CONTRACTS } from "../src/config/chains.ts";

const address = process.argv[2];
if (!address || !isAddress(address)) {
  console.error("usage: node scripts/verify-bnb-badge.mjs 0x<address>");
  process.exit(1);
}

const abi = JSON.parse(readFileSync("out/SoulboundStreak.sol/SoulboundStreak.json", "utf8")).abi;
const DUMMY = "0x000000000000000000000000000000000000dEaD";

let failures = 0;
function check(label, cond, extra = "") {
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` - ${extra}` : ""}`);
}

for (const chainId of [56, 204]) {
  const net = getNetworkConfig(chainId);
  const client = createPublicClient({
    transport: fallback(net.rpcUrls.default.http.map((u) => http(u))),
  });
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    console.log(`\n${net.name}: no code`);
    continue;
  }

  console.log(`\n=== ${net.name} (chain ${chainId}) ===`);
  check("contract deployed", true, `${(code.length - 2) / 2} bytes`);

  const nik = await client.readContract({ address, abi, functionName: "nikBase" });
  const owner = await client.readContract({ address, abi, functionName: "owner" });
  const minActions = await client.readContract({ address, abi, functionName: "MIN_TODAY_ACTIONS" });
  const minted = await client.readContract({ address, abi, functionName: "totalMinted" });
  const version = await client.readContract({ address, abi, functionName: "version" });
  const can = await client.readContract({ address, abi, functionName: "canMint", args: [DUMMY] });
  const erc721 = await client.readContract({
    address,
    abi: [{ type: "function", name: "supportsInterface", stateMutability: "view", inputs: [{ type: "bytes4" }], outputs: [{ type: "bool" }] }],
    functionName: "supportsInterface", args: ["0x80ac58cd"],
  }).catch(() => false);

  const expected = NIKBASE_CONTRACTS[chainId];
  console.log(`      nikBase()   = ${nik}`);
  console.log(`      owner()     = ${owner}`);
  console.log(`      version()   = ${version}`);
  console.log(`      totalMinted = ${minted}`);

  check("reads THIS chain's NikBase", nik.toLowerCase() === expected.toLowerCase(),
    `badge->${nik} app->${expected}`);
  check("MIN_TODAY_ACTIONS == 3", minActions === 3n, `got ${minActions}`);
  check("canMint(fresh wallet) == false", can === false);
  check("reports ERC721", erc721 === true);
}

console.log(`\n${failures === 0 ? "BADGE READY TO WIRE" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);