/**
 * Smoke test: read the Game2048 addresses straight out of the app's config
 * and exercise them on-chain — proves the wiring, not just the addresses.
 *
 * Run: node scripts/smoke-game2048-wiring.mjs
 */
import { readFileSync } from "node:fs";
import { createPublicClient, fallback, http, isAddress } from "viem";
import { GAME2048_CONTRACTS, getNetworkConfig } from "../src/config/chains.ts";

const CHAINS = [56, 204];
const DUMMY = "0x000000000000000000000000000000000000dEaD";

const gameAbi = [
  { type: "function", name: "recordPlay", stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "_score" }, { type: "uint256", name: "_moves" }],
    outputs: [] },
  { type: "function", name: "playCount", stateMutability: "view",
    inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "highScore", stateMutability: "view",
    inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];

let failures = 0;
function check(label, cond, extra = "") {
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` - ${extra}` : ""}`);
}

for (const chainId of CHAINS) {
  const net = getNetworkConfig(chainId);
  const address = GAME2048_CONTRACTS[chainId];

  console.log(`\n=== chain ${chainId} - ${net?.name} ===`);
  check("getNetworkConfig returns the network", !!net, net?.name);
  check("GAME2048_CONTRACTS entry present", !!address, address);
  check("address is valid", isAddress(address ?? "0x"), address);

  const client = createPublicClient({
    transport: fallback(net.rpcUrls.default.http.map((u) => http(u))),
  });
  check("live chain id matches", (await client.getChainId()) === chainId);

  const code = await client.getCode({ address });
  check("code deployed at that address", !!code && code !== "0x");

  // simulate a real milestone write the way the game sends it
  const data = await client
    .simulateContract({
      address,
      abi: gameAbi,
      functionName: "recordPlay",
      args: [2048n, 100n],
      account: DUMMY,
    })
    .then(() => true)
    .catch(() => false);
  check("recordPlay(2048,100) simulates cleanly", data === true);

  const [pc, hs] = await Promise.all([
    client.readContract({ address, abi: gameAbi, functionName: "playCount", args: [DUMMY] }),
    client.readContract({ address, abi: gameAbi, functionName: "highScore", args: [DUMMY] }),
  ]);
  check("playCount/highScore views resolve", typeof pc === "bigint" && typeof hs === "bigint",
    `playCount=${pc} highScore=${hs}`);
}

console.log(`\n${failures === 0 ? "WIRING OK - all checks passed" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
