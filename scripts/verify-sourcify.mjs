/**
 * Publish every deployed ChainBadge to Sourcify, the keyless public
 * verification repository (https://sourcify.dev).
 *
 * Sourcify is a second, independent verifier next to the block explorers:
 *   - it needs no API key and no account,
 *   - it matches BOTH the creation and the runtime bytecode,
 *   - Blockscout instances read its repository, so a Sourcify match also shows
 *     up as "verified" on explorers whose own verifier rejects the submission.
 *
 * The desposit is the exact solc standard-JSON input reconstructed from the
 * build artifact's metadata, so it is byte-identical to what was deployed.
 *
 * Usage:
 *   forge build
 *   node scripts/verify-sourcify.mjs [--only <id>]
 */
import { readFileSync } from "node:fs";
import { mainnetNetworks, testnetNetworks } from "../src/config/chains.ts";
import { BADGE_ADDR } from "../src/lib/badge.ts";

const argv = process.argv.slice(2);
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx === -1 ? undefined : argv[onlyIdx + 1];

const COMPILER = "0.8.24+commit.e11b9ed9";
const IDENTIFIER = "contracts/ChainBadge.sol:ChainBadge";
const API = "https://sourcify.dev/server/v2";

const artifact = JSON.parse(readFileSync("out/ChainBadge.sol/ChainBadge.json", "utf8"));
const meta = typeof artifact.metadata === "string" ? JSON.parse(artifact.metadata) : artifact.metadata;

const sources = {};
for (const p of Object.keys(meta.sources)) sources[p] = { content: readFileSync(p, "utf8") };

const stdJsonInput = {
  language: "Solidity",
  sources,
  settings: {
    remappings: meta.settings.remappings,
    optimizer: meta.settings.optimizer,
    metadata: meta.settings.metadata,
    evmVersion: meta.settings.evmVersion,
    libraries: {},
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
};

// Which chains Sourcify knows about (it needs an RPC to fetch the creation tx).
async function supportedChains() {
  try {
    const r = await fetch(`${API}/chains`, { signal: AbortSignal.timeout(30000) });
    const j = await r.json();
    const list = Array.isArray(j) ? j : j.results || [];
    return new Set(list.map((c) => c.chainId));
  } catch {
    return null;
  }
}

const support = await supportedChains();
const netOf = (id) => [...mainnetNetworks, ...testnetNetworks].find((n) => n.id === id);

const ids = Object.keys(BADGE_ADDR)
  .map(Number)
  .filter((id) => id !== 4221 && BADGE_ADDR[id])
  .filter((id) => !only || String(id) === String(only))
  .sort((a, b) => a - b);

let ok = 0;
const problems = [];
const skipped = [];

for (const id of ids) {
  const net = netOf(id);
  const address = BADGE_ADDR[id];
  const tag = `${String(id).padEnd(8)} ${(net?.shortName || "?").padEnd(9)}`;
  process.stdout.write(`-- ${tag} ${address}\n`);

  if (support && !support.has(id)) {
    console.log("   ! not listed on Sourcify - skipped");
    skipped.push(`${tag} unsupported`);
    continue;
  }

  try {
    const res = await fetch(`${API}/verify/${id}/${address}`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "dgdreams-badge-verify" },
      body: JSON.stringify({ stdJsonInput, compilerVersion: COMPILER, contractIdentifier: IDENTIFIER }),
      signal: AbortSignal.timeout(180000),
    });
    const body = await res.json();

    if (res.status === 409 || body.customCode === "already_verified") {
      ok++;
      console.log("   v already verified on Sourcify (exact match)");
      continue;
    }

    if (body.match || body.creationMatch) {
      ok++;
      console.log(`   v already verified (${body.creationMatch}/${body.runtimeMatch})`);
      continue;
    }

    const vid = body.verificationId;
    if (!vid) {
      console.log(`   x ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
      problems.push(`${tag} submit-failed`);
      continue;
    }

    let outcome;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const s = await fetch(`${API}/verify/${vid}`, { signal: AbortSignal.timeout(30000) });
      const sj = await s.json();
      if (sj.isJobCompleted) {
        outcome = sj;
        break;
      }
    }
    if (!outcome) {
      console.log("   ! still compiling after 30s");
      problems.push(`${tag} timeout`);
      continue;
    }
    if (outcome.error) {
      console.log(`   x ${JSON.stringify(outcome.error).slice(0, 200)}`);
      problems.push(`${tag} error`);
      continue;
    }
    const c = await fetch(`${API}/contract/${id}/${address}`, { signal: AbortSignal.timeout(30000) });
    const cj = await c.json();
    if (cj.creationMatch === "exact_match" || cj.runtimeMatch === "exact_match") {
      ok++;
      console.log(`   v verified on Sourcify (${cj.creationMatch}/${cj.runtimeMatch})`);
    } else if (cj.creationMatch || cj.runtimeMatch) {
      ok++;
      console.log(`   v partial match (${cj.creationMatch}/${cj.runtimeMatch})`);
    } else {
      console.log(`   x no match: ${JSON.stringify(cj).slice(0, 160)}`);
      problems.push(`${tag} no-match`);
    }
  } catch (e) {
    console.log(`   x ${String(e).split("\n")[0].slice(0, 120)}`);
    problems.push(`${tag} network`);
  }
}

console.log("\n=========================");
console.log(`Sourcify verified ${ok}/${ids.length}`);
if (skipped.length) console.log(`skipped:\n  ${skipped.join("\n  ")}`);
if (problems.length) console.log(`failed:\n  ${problems.join("\n  ")}`);
