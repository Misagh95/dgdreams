/**
 * Proves address reuse: run the sequence twice on the same anvil chain. The
 * second run must report the deploys as already (code present at the stored
 * address) and send no new deployment transaction.
 */
import { readFileSync } from "node:fs";
import { createWalletClient, createPublicClient, http, encodeDeployData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { runSequence } from "../src/lib/sequence.ts";

const RPC = "http://127.0.0.1:8545";
const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const wallet = createWalletClient({ account, transport: http(RPC) });
const pub = createPublicClient({ transport: http(RPC) });

const nik = JSON.parse(readFileSync("out/NikBase.sol/NikBase.json", "utf8"));
const nikBytecode = nik.bytecode.object.startsWith("0x")
  ? nik.bytecode.object
  : "0x" + nik.bytecode.object;
const nikRec = await pub.waitForTransactionReceipt({
  hash: await wallet.sendTransaction({
    data: encodeDeployData({ abi: nik.abi, bytecode: nikBytecode, args: [] }),
    chain: null,
  }),
});
const nikAddr = nikRec.contractAddress;

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

/** @type {any} */
const baseSteps = () => [
  { id: "gm", label: "GM", kind: "mission", method: "gm" },
  { id: "gn", label: "GN", kind: "mission", method: "gn" },
  { id: "LitePrediction", label: "Simple", kind: "deploy", artifact: art("LitePrediction") },
  { id: "SimpleToken", label: "Token", kind: "deploy", artifact: art("SimpleToken") },
  { id: "SimpleNft", label: "NFT", kind: "deploy", artifact: art("SimpleNft") },
];

let sends = 0;
const provider = {
  request: async ({ method, params }) => {
    if (method === "eth_sendTransaction") {
      sends++;
      return wallet.sendTransaction({ data: params[0].data, to: params[0].to, chain: null });
    }
    if (method === "eth_getTransactionReceipt") {
      const r = await pub.getTransactionReceipt({ hash: params[0] });
      return r ? { ...r } : null;
    }
    return null;
  },
};

let failures = 0;
const check = (label, cond, extra = "") => {
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` - ${extra}` : ""}`);
};

const base = {
  account: account.address,
  chainId: 31337,
  contractAddress: nikAddr,
  rpcUrls: [RPC],
  getProvider: async () => provider,
  onUpdate: () => {},
};

// ── first run: everything deploys ────────────────────────────────────────
const done = new Set();
const first = await runSequence({
  ...base,
  steps: baseSteps(),
  done: { isDone: (id) => done.has(id), mark: (id) => done.add(id) },
});
console.log("── first run ──");
for (const r of first) check(`${r.label} deployed`, r.status === "done", r.address || "");

const store = {};
for (const r of first) if (r.address) store[r.id] = r.address;
const sendsAfterFirst = sends;
check("5 transactions sent", sendsAfterFirst === 5, `${sendsAfterFirst}`);

// ── second run: missions already done, deploys reused ───────────────────
const second = await runSequence({
  ...base,
  steps: baseSteps().map((s) =>
    s.kind === "deploy" && store[s.id] ? { ...s, cachedAddress: store[s.id] } : s
  ),
  done: { isDone: (id) => done.has(id), mark: (id) => done.add(id) },
});
console.log("\n── second run ──");
for (const r of second) {
  check(`${r.label} reused`, r.status === "already", `${r.status}`);
}
const reusedSame = second
  .filter((r) => r.address)
  .every((r) => r.address === store[r.id]);
check("same addresses returned", reusedSame);
check("no new transactions", sends === sendsAfterFirst, `${sends - sendsAfterFirst} extra`);

// ── a stale cached address must be ignored ─────────────────────────────
const bogus = { ...baseSteps()[2], cachedAddress: "0x000000000000000000000000000000000000dEaD" };
const third = await runSequence({ ...base, steps: [bogus], done: { isDone: () => false, mark: () => {} } });
console.log("\n── stale cache ──");
check(
  "bogus cached address is redeployed, not trusted",
  third[0].status === "done" && third[0].address !== bogus.cachedAddress,
  third[0].address || third[0].error
);

console.log(`\n${failures === 0 ? "ADDRESS REUSE OK" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
