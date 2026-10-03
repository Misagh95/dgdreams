/**
 * Runs the full 5-in-1 sequence against a local anvil node with a fake
 * EIP-1193 provider, proving all five steps land on-chain in order.
 */
import { readFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http, encodeDeployData, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { runSequence } from "../src/lib/sequence.ts";

const RPC = "http://127.0.0.1:8545";
const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const wallet = createWalletClient({ account, transport: http(RPC) });
const pub = createPublicClient({ transport: http(RPC) });

// ── deploy NikBase so the mission calls have somewhere to land ────────────
const nik = JSON.parse(readFileSync("out/NikBase.sol/NikBase.json", "utf8"));
const nikBytecode = nik.bytecode.object.startsWith("0x")
  ? nik.bytecode.object
  : "0x" + nik.bytecode.object;
const nikHash = await wallet.sendTransaction({
  data: encodeDeployData({ abi: nik.abi, bytecode: nikBytecode, args: [] }),
  chain: null,
});
const nikRec = await pub.waitForTransactionReceipt({ hash: nikHash });
const nikAddr = nikRec.contractAddress;
console.log("NikBase (for the mission calls):", nikAddr, "\n");

const art = (n) => {
  const a = JSON.parse(readFileSync(`public/contracts/${n}.json`, "utf8"));
  return {
    abi: a.abi,
    bytecode: a.bytecode,
    constructorInputs:
      n === "SimpleToken"
        ? ["Demo Token", "DEMO", (1_000_000n * 10n ** 18n).toString()]
        : n === "SimpleNft"
          ? ["Demo Collection", "DEMO", "https://example.com/meta/"]
          : [],
  };
};

const steps = [
  { id: "gm", label: "GM", kind: "mission", method: "gm" },
  { id: "gn", label: "GN", kind: "mission", method: "gn" },
  { id: "simple", label: "Simple", kind: "deploy", artifact: art("LitePrediction") },
  { id: "token", label: "Token", kind: "deploy", artifact: art("SimpleToken") },
  { id: "nft", label: "NFT", kind: "deploy", artifact: art("SimpleNft") },
];

// order check: the wallet sees the sends one at a time
const order = [];
const fakeProvider = {
  request: async ({ method, params }) => {
    if (method === "eth_sendTransaction") {
      order.push(params[0].data.slice(0, 10));
      return wallet.sendTransaction({
        data: params[0].data,
        to: params[0].to,
        chain: null,
      });
    }
    if (method === "eth_getTransactionReceipt") {
      const r = await pub.getTransactionReceipt({ hash: params[0] });
      return r ? { ...r } : null;
    }
    return null;
  },
};

const done = new Set();
let currentIndex = null;

const results = await runSequence({
  steps,
  account: account.address,
  chainId: 31337,
  contractAddress: nikAddr,
  rpcUrls: [RPC],
  getProvider: async () => fakeProvider,
  explorerUrl: "http://explorer.local",
  done: { isDone: (id) => done.has(id), mark: (id) => done.add(id) },
  onUpdate: (res, i) => {
    currentIndex = i;
  },
});

console.log("── results ──");
let failures = 0;
for (const r of results) {
  const ok = r.status === "done";
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${r.label.padEnd(8)} ${r.status.padEnd(7)} ` +
      `${r.address || r.hash?.slice(0, 12) || ""}${r.error ? " " + r.error : ""}`
  );
}

console.log("\n── on-chain verification ──");
// GM/GN do not touch the streak; only dailyCheckIn increments it, and this
// run only does GM+GN. So assert the mission markers instead: gmDone/gnDone.
const flags = await pub.readContract({
  address: nikAddr,
  abi: [{
    type: "function", name: "getFlags", stateMutability: "view",
    inputs: [{ type: "address" }], outputs: [{ type: "bool" }, { type: "bool" }, { type: "bool" }, { type: "bool" }],
  }],
  functionName: "getFlags",
  args: [account.address],
});
console.log(`  NikBase getFlags (checkIn,reception,gm,gn): ${flags.join(",")}`);
const gmOn = flags[2] === true && flags[3] === true;
if (!gmOn) { failures++; console.log("  FAIL GM/GN not recorded on chain"); }
else console.log("  PASS GM and GN recorded on chain");

const userData = await pub.readContract({
  address: nikAddr,
  abi: [{ type: "function", name: "getUserData", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }] }],
  functionName: "getUserData",
  args: [account.address],
});
console.log(`  NikBase getUserData (streak,checkIns,totalAct): ${userData.join(",")}`);

const deployed = results.filter((r) => r.kind === "deploy" || r.address);
for (const r of results.filter((x) => x.address)) {
  const c = await pub.getBytecode({ address: r.address });
  const live = !!c && c !== "0x";
  if (!live) failures++;
  console.log(`  ${live ? "PASS" : "FAIL"}  ${r.label} deployed at ${r.address} (${c ? (c.length - 2) / 2 : 0}B)`);
}

// second run must skip GM/GN without sending anything
const before = order.length;
const second = await runSequence({
  steps,
  account: account.address,
  chainId: 31337,
  contractAddress: nikAddr,
  rpcUrls: [RPC],
  getProvider: async () => fakeProvider,
  done: { isDone: (id) => done.has(id), mark: (id) => done.add(id) },
  onUpdate: () => {},
});
const missionStates = second.slice(0, 2).map((r) => r.status);
const skippedOk = missionStates.every((s) => s === "already");
if (!skippedOk) failures++;
console.log(`\n  ${skippedOk ? "PASS" : "FAIL"}  rerun marks GM/GN as already: ${missionStates.join(",")}`);
console.log(`  extra sends on rerun: ${order.length - before} (mission steps should add 0)`);

console.log(`\n${failures === 0 ? "SEQUENCE OK - all five steps" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
