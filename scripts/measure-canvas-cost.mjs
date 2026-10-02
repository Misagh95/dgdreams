/**
 * Counts the per-frame paint work of the ambient starfield, old vs new, at a
 * 1920x1080 viewport. This is the work that keeps a CPU core busy and spins
 * the fan, independent of any network.
 *
 * Run: node scripts/measure-canvas-cost.mjs
 */
const W = 1920, H = 1080, DPR = 1.25;
const MP = (W * DPR * H * DPR) / 1e6;

function oldFrame() {
  let ops = [];
  ops.push(["clearRect full screen", MP]);
  // nebula source was max(w,h)*1.4 square, blitted rotated with 'screen'
  const neb = Math.pow(Math.max(W, H) * 1.4, 2) / 1e6;
  ops.push(["nebula blit (rotated, 'screen' blend)", neb]);
  // three star layers, each blitted twice at full screen
  for (let i = 0; i < 3; i++) ops.push([`star layer ${i + 1} x2 blits`, MP * 2]);
  // horizon radial gradient rebuilt + filled every frame
  ops.push(["horizon radial gradient fillRect", MP]);
  // one gradient object allocated per meteor per frame
  ops.push(["meteor gradient alloc (x3 meteors)", 3]);
  return ops;
}

function newFrame() {
  let ops = [];
  ops.push(["clearRect full screen", MP]);
  ops.push(["far sky x2 blits", MP * 2]);
  ops.push(["near sky x2 blits", MP * 2]);
  ops.push(["meteor strokes (x3, solid colour)", 3]);
  return ops;
}

function report(title, ops) {
  const pixels = ops.reduce((a, [, mp]) => a + (typeof mp === "number" ? mp : 0), 0);
  console.log(`\n${title}`);
  for (const [name, mp] of ops) {
    console.log(`  ${String(typeof mp === "number" ? mp.toFixed(1) + " MP" : mp).padStart(8)}  ${name}`);
  }
  return pixels;
}

const before = report("BEFORE (per frame @1920x1080, 60fps)", oldFrame());
const after = report("AFTER (per frame @1920x1080, 30fps)", newFrame());

// Weighted per second: the old loop also painted at 60fps, the new one at 30.
const beforePerSec = before * 60;
const afterPerSec = after * 30;

console.log("\n── throughput ──");
console.log(`  before: ${before.toFixed(1)} MP/frame x 60 = ${(beforePerSec / 1000).toFixed(2)} GP/s`);
console.log(`  after : ${after.toFixed(1)} MP/frame x 30 = ${(afterPerSec / 1000).toFixed(2)} GP/s`);
console.log(`  reduction: ${(100 - (afterPerSec / beforePerSec) * 100).toFixed(0)}% less pixel work per second`);
console.log(`  and the old loop additionally allocated 1 radial gradient per meteor per frame`);