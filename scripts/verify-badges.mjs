/**
 * Verify every deployed ChainBadge on its block explorer.
 *
 * The badge is one identical contract on ~20 chains, so the only per-chain
 * input is the constructor argument — and that is read back off the chain
 * itself (`name()`, `symbol()`, `baseURI()`, `owner()`) rather than rebuilt
 * from a config file. Whatever is live is what gets submitted, so the source
 * can never be matched against the wrong args.
 *
 * Two explorer families are used:
 *   - Blockscout (no key needed): Base, HyperEVM, Unichain, Tempo, Robinhood,
 *     Ink, Arc, Soneium, LITVM, ARC Testnet, SimpleChain, GIWA, Maroo,
 *     DogeOS Testnet.
 *   - Etherscan V2 (one unified key across chains): BNB, opBNB, Arbitrum, OP,
 *     Sepolia, Base Sepolia, Arbitrum Sepolia — plus any Blockscout instance
 *     that is unreachable, as a fallback.
 *
 * Usage:
 *   forge build                                   # artifact must match deploy
 *   node scripts/verify-badges.mjs [--only <id>] [--dry-run] [--no-watch]
 *
 * Etherscan-family chains need a real key. Put one line in .env.local:
 *   ETHERSCAN_API_KEY=<your free key from https://etherscan.io/myapikey>
 * (that single key covers every Etherscan V2 chain listed above).
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  createPublicClient,
  fallback,
  http,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { mainnetNetworks, testnetNetworks } from "../src/config/chains.ts";
import { BADGE_ADDR } from "../src/lib/badge.ts";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f) => {
  const i = argv.indexOf(f);
  return i === -1 ? undefined : argv[i + 1];
};
const only = valueOf("--only");
const dryRun = has("--dry-run");
const watch = !has("--no-watch");

const SOURCE = "contracts/ChainBadge.sol:ChainBadge";

const bs = (host) => ({ kind: "blockscout", url: `${host}/api` });
const eth = () => ({ kind: "etherscan" });

/** chainId -> ordered verifier attempts, first one that works wins. */
const CHAINS = {
  56: { label: "BscScan", attempts: [eth()] },
  204: { label: "opBNB (BscScan)", attempts: [eth()] },
  42161: { label: "Arbiscan", attempts: [eth()] },
  421614: { label: "Arbiscan Sepolia", attempts: [eth()] },

  // Etherscan-family chains that also run a public Blockscout, which needs no
  // key. Try it first, then fall back to Etherscan V2.
  10: { label: "OP Etherscan / Blockscout", attempts: [bs("https://optimism.blockscout.com"), eth()] },
  11155111: { label: "Etherscan Sepolia / Blockscout", attempts: [bs("https://eth-sepolia.blockscout.com"), eth()] },
  84532: { label: "Basescan Sepolia / Blockscout", attempts: [bs("https://base-sepolia.blockscout.com"), eth()] },

  8453: { label: "Base", attempts: [bs("https://base.blockscout.com"), eth()] },
  999: { label: "HyperEVM", attempts: [bs("https://hyperevmscan.io"), bs("https://hyperscan.xyz"), eth()] },
  130: { label: "Unichain", attempts: [bs("https://unichain.blockscout.com"), eth()] },
  4217: { label: "Tempo", attempts: [bs("https://tempo.blockscout.com")] },
  4663: { label: "Robinhood Chain", attempts: [bs("https://robinhoodchain.blockscout.com"), eth()] },
  57073: { label: "Ink", attempts: [bs("https://explorer.inkonchain.com")] },
  5042: { label: "Arc", attempts: [bs("https://arc-scan.org"), eth()] },
  1868: { label: "Soneium", attempts: [bs("https://soneium.blockscout.com")] },
  4441: { label: "LITVM Liteforge", attempts: [bs("https://liteforge.explorer.caldera.xyz")] },
  5042002: { label: "ARC Testnet", attempts: [bs("https://testnet.arcscan.app")] },
  1913: { label: "SimpleChain", attempts: [bs("https://testnet-explorer.simplechain.com")] },
  91342: { label: "GIWA Sepolia", attempts: [bs("https://sepolia-explorer.giwa.io"), bs("https://sepolia.giwa.io")] },
  450815: { label: "Maroo", attempts: [bs("https://explorer-testnet.maroo.io/blockscout")] },
  6281971: { label: "DogeOS Testnet", attempts: [{ kind: "blockscout", url: "https://dogeos-testnet.l2scan.co/api", skipIsVerifiedCheck: true }] },
};

// ---- env ----
function loadEnv(name) {
  if (process.env[name]) return process.env[name].trim();
  if (existsSync(".env.local")) {
    const m = readFileSync(".env.local", "utf8").match(
      new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\\s]+)["']?\\s*$`, "m")
    );
    if (m) return m[1];
  }
  return undefined;
}

/** A key that is obviously a placeholder is as good as absent. */
function realKey(k) {
  return k && k.length >= 20 && !/^any-?value$/i.test(k) && !/placeholder/i.test(k) ? k : undefined;
}

const etherscanKey = realKey(loadEnv("ETHERSCAN_API_KEY"));

/** forge resolves every ${VAR} in foundry.toml, so fill the gaps. */
function foundryEnv() {
  const env = { ...process.env };
  try {
    const src = readFileSync("foundry.toml", "utf8");
    for (const m of src.matchAll(/\$\{([A-Za-z0-9_]+)\}/g)) {
      if (env[m[1]] === undefined) env[m[1]] = /_URL$/.test(m[1]) ? "http://127.0.0.1:8545" : "placeholder";
    }
  } catch {
    /* no foundry.toml */
  }
  return env;
}

const artifact = JSON.parse(readFileSync("out/ChainBadge.sol/ChainBadge.json", "utf8"));
const localRuntime = ("0x" + artifact.deployedBytecode.object.replace(/^0x/, "")).toLowerCase();

const ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "baseURI", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

const netOf = (id) => [...mainnetNetworks, ...testnetNetworks].find((n) => n.id === id);

function runForge(args, env) {
  try {
    execFileSync("forge", args, { stdio: dryRun ? "pipe" : "inherit", env, timeout: 300_000 });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: typeof e.status === "number" ? e.status : 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

/** Keep only short, meaningful lines from forge's output (Cloudflare HTML is huge). */
function summarize(out) {
  return (out || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim())
    .filter((l) => l && l.length < 240)
    .filter((l) => /error|Error|already|verified|Verified|failed|rejected|invalid|Invalid|not found|Unauthorized|chain/i.test(l))
    .slice(-4)
    .join("\n     ");
}

const ids = Object.keys(BADGE_ADDR)
  .map(Number)
  .filter((id) => id !== 4221 && BADGE_ADDR[id])
  .filter((id) => !only || String(id) === String(only))
  .sort((a, b) => a - b);

const env = foundryEnv();
let ok = 0;
const problems = [];
const skipped = [];

for (const id of ids) {
  const net = netOf(id);
  const address = BADGE_ADDR[id];
  const cfg = CHAINS[id];
  const tag = `${String(id).padEnd(8)} ${(net?.shortName || "?").padEnd(9)}`;

  console.log(`\n-- ${tag} ${cfg?.label || "(no verifier mapped)"}  ${address}`);
  if (!cfg) {
    skipped.push(`${tag} no verifier mapped`);
    continue;
  }

  // read live constructor args
  let argsHex;
  try {
    const pub = createPublicClient({ transport: fallback(net.rpcUrls.default.http.map((u) => http(u))) });
    const [name, symbol, baseURI, owner, code] = await Promise.all([
      pub.readContract({ address, abi: ABI, functionName: "name" }),
      pub.readContract({ address, abi: ABI, functionName: "symbol" }),
      pub.readContract({ address, abi: ABI, functionName: "baseURI" }),
      pub.readContract({ address, abi: ABI, functionName: "owner" }),
      pub.getCode({ address }),
    ]);
    if (!code || code === "0x") throw new Error("no bytecode at address");
    if (code.toLowerCase() !== localRuntime) console.log("   ! on-chain bytecode differs from local build");
    argsHex = encodeAbiParameters(parseAbiParameters("string,string,string,address"), [name, symbol, baseURI, owner]);
    console.log(`   ${name} · ${symbol} · ${baseURI} · ${owner}`);
  } catch (e) {
    console.log(`   x could not read constructor args: ${String(e).split("\n")[0].slice(0, 100)}`);
    problems.push(`${tag} read-failed`);
    continue;
  }

  let done = false;
  for (const attempt of cfg.attempts) {
    if (attempt.kind === "etherscan" && !etherscanKey) {
      console.log(`   - etherscan: no real ETHERSCAN_API_KEY, skipping this attempt`);
      continue;
    }
    const args = [
      "verify-contract", address, SOURCE,
      "--chain", String(id),
      "--compiler-version", "0.8.24",
      "--num-of-optimizations", "200",
      "--constructor-args", argsHex,
    ];
    if (attempt.kind === "blockscout") {
      args.push("--verifier", "blockscout", "--verifier-url", attempt.url);
      // l2scan's pre-verification getabi probe answers "OK" with a null result,
      // which forge treats as a hard error until the first submission lands.
      if (attempt.skipIsVerifiedCheck) args.push("--skip-is-verified-check");
    } else {
      args.push("--verifier", "etherscan", "--etherscan-api-key", etherscanKey);
    }
    if (watch) args.push("--watch");

    const where = attempt.kind === "blockscout" ? attempt.url : "etherscan v2";
    if (dryRun) {
      console.log(`   would run: forge ${args.join(" ")}`);
      continue;
    }
    const res = runForge(args, env);
    if (res.code === 0) {
      console.log(`   v verified via ${where}`);
      ok++;
      done = true;
      break;
    }
    const s = summarize(res.out);
    if (/already verified|Already Verified/i.test(res.out || "")) {
      console.log(`   v already verified via ${where}`);
      ok++;
      done = true;
      break;
    }
    console.log(`   x ${where}: exit ${res.code}${s ? `\n     ${s}` : ""}`);
  }
  if (!done && !dryRun) problems.push(`${tag} ${cfg.label}`);
}

console.log(`\n=========================`);
if (dryRun) console.log("dry run complete");
else console.log(`verified ${ok}/${ids.length}`);
if (skipped.length) console.log(`skipped:\n  ${skipped.join("\n  ")}`);
if (problems.length) console.log(`could not verify:\n  ${problems.join("\n  ")}`);
