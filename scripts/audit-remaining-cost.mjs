/**
 * Audits what is STILL running continuously across the app after the previous
 * fixes: infinite animations, full-screen fixed overlays, blend modes and
 * filter/backdrop-filter usage. These are what keep a core busy.
 *
 * Run: node scripts/audit-remaining-cost.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(f)) out.push(p);
  }
  return out;
}

const css = readFileSync("src/app/globals.css", "utf8");

console.log("═══ global CSS: continuous cost ═══");
const infiniteRules = [...css.matchAll(/([.@#][^{]*)\{([^}]*infinite[^}]*)\}/g)];
console.log(`  rules with infinite animation: ${infiniteRules.length}`);
for (const m of infiniteRules) {
  const sel = m[1].trim().replace(/\s+/g, " ");
  const body = m[2].replace(/\s+/g, " ").trim();
  const prop = (body.match(/(animation-name|animation):\s*([^;]+)/) || [])[2] || "?";
  const kind = /translate|scale|rotate|opacity/.test(prop) && !/background-position/.test(prop)
    ? "compositor (cheap)"
    : /background-position|filter|box-shadow|width|height/.test(prop)
    ? "PAINT (expensive)"
    : "?";
  console.log(`    ${sel.padEnd(28)} ${kind.padEnd(20)} ${prop.slice(0, 40)}`);
}

console.log("\n═══ full-screen fixed overlays ═══");
for (const m of css.matchAll(/\.(cosmic-[\w-]+|space-[\w-]+)[\s\S]{0,400}?\}/g)) {
  const sel = m[0].slice(0, 200);
  const fixed = /position:\s*fixed/.test(sel);
  const blend = /mix-blend-mode/.test(sel);
  const inset = /inset:\s*0|top:\s*0.*left:\s*0/.test(sel);
  const gradient = /gradient/.test(sel);
  if (fixed && (blend || (inset && gradient))) {
    console.log(`    ${m[1].padEnd(24)} ${blend ? "MIX-BLEND-MODE (forces re-composite of the canvas every frame!)" : "fixed + gradient"}`);
  }
}

console.log("\n═══ per-page: infinite animations ═══");
const rows = [];
for (const entry of readdirSync("src/app", { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const f = join("src/app", entry.name, "page.tsx");
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  const inf = (src.match(/repeat:\s*999999|repeat:\s*Infinity/g) || []).length;
  const rot = (src.match(/animate=\{\{?\s*rotate/g) || []).length;
  const glass = (src.match(/glass-panel|glass-card|backdrop-blur/g) || []).length;
  const shadowAnim = (src.match(/whileHover=\{\{[^}]*boxShadow/g) || []).length;
  if (inf || glass || rot) rows.push({ p: `/${entry.name}`, inf, rot, glass, shadowAnim });
}
rows.sort((a, b) => b.inf - a.inf || b.glass - a.glass);
console.log("page              infinite  rotate  glass  hoverShadow");
console.log("-".repeat(58));
for (const r of rows) {
  console.log(
    `${r.p.padEnd(18)}${String(r.inf).padStart(8)}${String(r.rot).padStart(8)}` +
      `${String(r.glass).padStart(7)}${String(r.shadowAnim).padStart(13)}`
  );
}

console.log("\n═══ verdict ═══");
const totalInf = rows.reduce((a, b) => a + b.inf, 0);
const totalRot = rows.reduce((a, b) => a + b.rot, 0);
const totalShadow = rows.reduce((a, b) => a + b.shadowAnim, 0);
console.log(`  infinite animations left : ${totalInf}`);
console.log(`  paint-heavy rotations    : ${totalRot}`);
console.log(`  hover boxShadow anims    : ${totalShadow}`);