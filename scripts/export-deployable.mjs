/**
 * Exports the compiled contracts so the browser can deploy them.
 *
 * Reads forge's output (out/<Name>.sol/<Name>.json) and writes a trimmed
 * artifact per deployable contract into public/contracts/, containing only
 * what a client needs: the ABI and the creation bytecode, plus the
 * constructor inputs so the UI can build a form.
 *
 * Run: forge build && node scripts/export-deployable.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "out";
const DEST = "public/contracts";

/** contract name -> how to present it and what the constructor wants */
const DEPLOYABLE = [
  {
    name: "NikBase",
    artifact: "NikBase.sol/NikBase.json",
    title: "NikBase — daily missions",
    blurb:
      "Records GM, check-in and GN once per UTC day per wallet, and tracks the streak. One deployment per network.",
    tag: "missions",
  },
  {
    name: "SoulboundStreak",
    artifact: "SoulboundStreak.sol/SoulboundStreak.json",
    title: "SoulboundStreak — non-transferable badge",
    blurb:
      "ERC-721 badge that can only be minted once per wallet and can never be sold or transferred. Needs the NikBase address of the same network.",
    tag: "NFT",
  },
  {
    name: "Game2048",
    artifact: "Game2048.sol/Game2048.json",
    title: "Game2048 — score recorder",
    blurb:
      "Stores play count and high score for the on-chain 2048 game. Very small and very cheap to deploy.",
    tag: "game",
  },
  {
    name: "LitePrediction",
    artifact: "LitePrediction.sol/LitePrediction.json",
    title: "LitePrediction — prediction market",
    blurb:
      "Create markets, take a side, resolve and claim. Intended for a LiteVM-style chain.",
    tag: "market",
  },
];

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true });

let total = 0;
for (const c of DEPLOYABLE) {
  const src = join(OUT_DIR, c.artifact);
  if (!existsSync(src)) {
    console.error(`✗ missing ${src} — run "forge build" first`);
    process.exit(1);
  }
  const art = JSON.parse(readFileSync(src, "utf8"));
  const abi = art.abi;
  const ctor = abi.find((x) => x.type === "constructor");
  const bytecode = art.bytecode.object.startsWith("0x")
    ? art.bytecode.object
    : "0x" + art.bytecode.object;

  // runtime size check: a contract above 24576 bytes cannot be deployed
  const runtime = art.deployedBytecode.object;
  const runtimeBytes = (runtime.length - 2) / 2;
  const sizeNote = runtimeBytes > 24576 ? "OVER EIP-170 LIMIT" : "ok";

  const payload = {
    name: c.name,
    title: c.title,
    blurb: c.blurb,
    tag: c.tag,
    abi,
    bytecode,
    constructorInputs: ctor ? ctor.inputs : [],
    runtimeBytes,
  };

  const dest = join(DEST, `${c.name}.json`);
  writeFileSync(dest, JSON.stringify(payload));
  const kb = (JSON.stringify(payload).length / 1024).toFixed(0);
  total += Number(kb);

  console.log(
    `✓ ${c.name.padEnd(16)} init ${((bytecode.length - 2) / 2).toString().padStart(6)}B  ` +
      `runtime ${runtimeBytes.toString().padStart(5)}B (${sizeNote})  ` +
      `ctor args ${payload.constructorInputs.length}  -> ${dest} (${kb}KB)`
  );
}

console.log(`\n${DEPLOYABLE.length} contracts exported, ${(total / 1024).toFixed(0)}KB total`);