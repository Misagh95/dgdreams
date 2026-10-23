import { createPublicClient, fallback, http } from "viem";
import { mainnetNetworks, testnetNetworks } from "../src/config/chains.ts";
import { BADGE_ADDR } from "../src/lib/badge.ts";

const all = [...mainnetNetworks, ...testnetNetworks];
const NAME_ABI = [{ type: "function", name: "name", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" }];
const MINTED_ABI = [{ type: "function", name: "totalMinted", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }];

let ok = 0, bad = 0;
for (const n of all) {
  const addr = BADGE_ADDR[n.id];
  if (!addr) continue; // not deployed — skip silently, the report says why
  const pub = createPublicClient({ transport: fallback(n.rpcUrls.default.http.map((u) => http(u))) });
  try {
    const name = await pub.readContract({ address: addr, abi: NAME_ABI, functionName: "name" });
    const minted = await pub.readContract({ address: addr, abi: MINTED_ABI, functionName: "totalMinted" });
    console.log(`ok   ${n.shortName.padEnd(9)} (${n.id}) ${JSON.stringify(name)} totalMinted=${minted}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${n.shortName.padEnd(9)} (${n.id}) ${String(e).split("\n")[0].slice(0, 90)}`);
    bad++;
  }
}
console.log(`\nread-back: ${ok} ok, ${bad} failed`);
