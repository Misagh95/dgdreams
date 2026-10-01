/**
 * Count GPU-heavy visual effects per page: backdrop-filter (blur is the most
 * expensive paint operation on mobile), infinite animations, large blurs and
 * box-shadows. These are what make a site "feel" slow even when the network
 * is fast.
 *
 * Run: node scripts/measure-visual-cost.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|css)$/.test(f)) out.push(p);
  }
  return out;
}

const css = readFileSync("src/app/globals.css", "utf8");

console.log("=== global CSS: heavy paint properties ===");
console.log(`  backdrop-filter blur(24px)   : ${(css.match(/backdrop-filter:\s*blur\(24px\)/g) || []).length} rule(s)`);
console.log(`  backdrop-filter blur(14px)   : ${(css.match(/backdrop-filter:\s*blur\(14px\)/g) || []).length} rule(s)`);
console.log(`  infinite animations          : ${(css.match(/infinite/g) || []).length}`);
console.log(`  filter: blur()               : ${(css.match(/filter:\s*blur\(/g) || []).length}`);
console.log(`  prefers-reduced-motion guard : ${/prefers-reduced-motion/.test(css) ? "present" : "MISSING"}`);

const pagesDir = "src/app";
const rows = [];
for (const entry of readdirSync(pagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pageFile = join(pagesDir, entry.name, "page.tsx");
  let src;
  try {
    src = readFileSync(pageFile, "utf8");
  } catch {
    continue;
  }
  const count = (re) => (src.match(re) || []).length;
  rows.push({
    page: `/${entry.name}`,
    glass: count(/glass-panel|glass-card|backdrop-blur/g),
    infinite: count(/repeat:\s*Infinity|infinite/g),
    motion: count(/AnimatePresence|motion\./g),
    cube: count(/NetworkCube|NetworkCrystalCube|dg-cube/g),
    blurInline: count(/blur\(/g),
    shadow: count(/boxShadow/g),
  });
}

rows.sort((a, b) => b.glass - a.glass);
console.log("\n=== per page ===");
console.log("page              glass  blur()  infinite  motion  cube  shadow");
console.log("-".repeat(66));
for (const r of rows.slice(0, 12)) {
  console.log(
    `${r.page.padEnd(17)}${String(r.glass).padStart(5)}${String(r.blurInline).padStart(7)}` +
      `${String(r.infinite).padStart(9)}${String(r.motion).padStart(8)}${String(r.cube).padStart(6)}${String(r.shadow).padStart(7)}`
  );
}