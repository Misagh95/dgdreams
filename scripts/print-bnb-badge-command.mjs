/**
 * Print the exact forge create command for redeploying the BNB soulbound
 * badge, reading the addresses straight out of the app config so they can
 * never drift or get mangled by copy/paste.
 *
 * Run: node scripts/print-bnb-badge-command.mjs
 */
import { readFileSync } from "node:fs";
import { NIKBASE_CONTRACTS, getNetworkConfig } from "../src/config/chains.ts";

const net = getNetworkConfig(56);
const nikBase = NIKBASE_CONTRACTS[56];

// owner = the address that owns the deployed NikBase (their deployer EOA)
const nikAbi = [{ type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }];
const { createPublicClient, fallback, http } = await import("viem");
const client = createPublicClient({
  transport: fallback(net.rpcUrls.default.http.map((u) => http(u))),
});
const owner = await client.readContract({ address: nikBase, abi: nikAbi, functionName: "owner" });

// sanity: both args must be real addresses before we print them
for (const [label, a] of [["nikBaseAddress", nikBase], ["initialOwner", owner]]) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error(`${label} is not a valid address: ${a}`);
  console.log(`${label.padEnd(16)} ${a}`);
}

console.log(`\n# single command, no line breaks - copy exactly:`);
console.log(
  `forge create contracts/SoulboundStreak.sol:SoulboundStreak --rpc-url ${net.rpcUrls.default.http[0]} --private-key 0x<YOUR_KEY> --broadcast --constructor-args ${nikBase} ${owner}`
);

console.log(`\n# or two lines (same result):`);
console.log(`# nikBaseAddress = ${nikBase}`);
console.log(`# initialOwner   = ${owner}`);