/**
 * Measures what each deployable actually costs to put on-chain.
 *
 * Deployment gas is almost entirely two numbers, and neither of them is the
 * business logic:
 *
 *   - 200 gas per byte of runtime code (the code-deposit charge), and
 *   - 16 gas per non-zero calldata byte (4 for a zero byte) on the creation
 *     transaction's init code,
 *
 * on top of the flat 21,000 intrinsic cost. So a contract that carries
 * functions nobody calls still charges for those functions, on every single
 * deployment. This script prints that bill per contract and totals it up, so
 * a change that bloats a contract is visible immediately.
 *
 * The constructor's own execution is not modelled — it is a rounding error
 * next to the code deposit — so these are lower bounds, close enough to
 * compare options.
 *
 * Run: forge build && node scripts/measure-deploy-cost.mjs
 */
import { execSync } from "node:child_process";

/** Zero bytes are cheap, which is why padded addresses and literals help. */
const ZERO_BYTE_GAS = 4;
const NON_ZERO_BYTE_GAS = 16;
const CODE_DEPOSIT_GAS_PER_BYTE = 200;
const TX_BASE_GAS = 21_000;

/** what the 5-in-1 runner deploys, and what it deployed before the trim */
const GROUPS = [
  {
    title: "5-in-1 runner (current, OneClick.sol)",
    contracts: ["DGDemo", "DGLiteToken", "DGLiteNft"],
  },
  {
    title: "5-in-1 runner (before the trim)",
    contracts: ["LitePrediction", "SimpleToken", "SimpleNft"],
  },
];

function measure(name) {
  const deployed = execSync(`forge inspect ${name} deployedBytecode`, {
    encoding: "utf8",
  }).trim();
  const init = execSync(`forge inspect ${name} bytecode`, { encoding: "utf8" }).trim();

  const codeBytes = Math.max(0, (deployed.length - 2) / 2);
  const initBytes = Math.max(0, (init.length - 2) / 2);

  // Count zero bytes in the creation calldata, not the runtime code.
  const zeros = (init.match(/00/g) || []).length;
  const calldataGas = (initBytes - zeros) * NON_ZERO_BYTE_GAS + zeros * ZERO_BYTE_GAS;
  const depositGas = codeBytes * CODE_DEPOSIT_GAS_PER_BYTE;

  return {
    name,
    codeBytes,
    initBytes,
    depositGas,
    calldataGas,
    total: TX_BASE_GAS + depositGas + calldataGas,
  };
}

const n = (v) => v.toLocaleString("en-US");

for (const group of GROUPS) {
  console.log(`\n${group.title}`);
  console.log("-".repeat(72));

  let sum = 0;
  for (const name of group.contracts) {
    const m = measure(name);
    sum += m.total;
    console.log(
      `${m.name.padEnd(16)} runtime ${String(m.codeBytes).padStart(5)}B` +
        `  deposit ${n(m.depositGas).padStart(11)}` +
        `  calldata ${n(m.calldataGas).padStart(8)}` +
        `  total ${n(m.total).padStart(11)}`
    );
  }
  console.log(`${"TOTAL".padEnd(16)} ${" ".repeat(14)}${" ".repeat(20)}${n(sum).padStart(11)}`);
  group.total = sum;
}

const [now, before] = GROUPS;
const saved = before.total - now.total;
console.log(
  `\nsaved ${n(saved)} gas (${((saved / before.total) * 100).toFixed(0)}% cheaper)` +
    `\n  ${n(now.total)} instead of ${n(before.total)}`
);