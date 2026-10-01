/**
 * Models the shipped receipt-poll loop against the old flat-sleep one, so the
 * per-transaction gap and RPC call count are known before shipping.
 *   OLD: sleep 2000ms first, then poll every 2000ms (x60).
 *   NEW: check immediately, then wait 250,500,1000,1500,2000,2000,3000,3000,3000ms.
 */
const RTT = 200;
const SCHEDULE = [250, 500, 1000, 1500, 2000, 2000, 3000, 3000, 3000];

function newLoop(confirmMs) {
  let elapsed = 0;
  for (let p = 0; p < 90; p++) {
    if (p > 0) {
      elapsed += SCHEDULE[Math.min(p - 1, SCHEDULE.length - 1)];
    }
    if (elapsed >= confirmMs) return { ms: elapsed + RTT, calls: p + 1 };
  }
  return { ms: elapsed + RTT, calls: 90 };
}

function oldLoop(confirmMs) {
  for (let p = 0; p < 60; p++) {
    const at = 2000 + p * 2000;
    if (at >= confirmMs) return { ms: at + RTT, calls: p + 1 };
  }
  return { ms: 120000, calls: 60 };
}

const NETWORKS = [
  ["BNB Chain", 1000],
  ["opBNB", 1000],
  ["Arc", 1000],
  ["Base", 2000],
  ["Ink", 2000],
  ["Liteforge L2", 1000],
  ["Ethereum", 12000],
];

console.log("chain           confirm    old/tx    new/tx    saved     rpc calls   3-mission run");
console.log("-".repeat(96));
for (const [name, confirm] of NETWORKS) {
  const o = oldLoop(confirm);
  const n = newLoop(confirm);
  console.log(
    `${name.padEnd(16)}${String(confirm + "ms").padEnd(12)}` +
      `${(o.ms + "ms").padEnd(11)}${(n.ms + "ms").padEnd(11)}${((o.ms - n.ms) + "ms").padEnd(10)}` +
      `${String(o.calls).padStart(3)} -> ${String(n.calls).padEnd(6)}` +
      `${(o.ms * 3 / 1000).toFixed(1)}s -> ${(n.ms * 3 / 1000).toFixed(1)}s`
  );
}