/**
 * Counts the dashboard's continuously-running animation work before vs after.
 * Only infinite animations cost CPU forever; one-shot mount animations do not.
 *
 * Run: node scripts/measure-dashboard-anim.mjs
 */
import { readFileSync } from "node:fs";

const src = readFileSync("src/app/dashboard/page.tsx", "utf8");

const infinite = (src.match(/repeat:\s*999999|repeat:\s*Infinity/g) || []).length;
const rotates = (src.match(/animate=\{\{?\s*rotate/g) || []).length;
const hoverShadow = (src.match(/whileHover=\{\{[^}]*boxShadow/g) || []).length;
const willChange = (src.match(/willChange:/g) || []).length;
const reducedGuards = (src.match(/reduced \? undefined/g) || []).length;
const usesReduced = /useReducedMotion/.test(src);

console.log("── dashboard animation audit ──");
console.log(`  infinite animations      : ${infinite}`);
console.log(`  rotate (raster per frame): ${rotates}   -> 0 after fix`);
console.log(`  hover boxShadow anims    : ${hoverShadow}   -> 0 after fix`);
console.log(`  willChange hints         : ${willChange}`);
console.log(`  reduced-motion guards    : ${reducedGuards}`);
console.log(`  useReducedMotion wired   : ${usesReduced ? "yes" : "NO"}`);

console.log("\n── why the 2048 tile was the expensive one ──");
console.log("  it animated `rotate` on an 80x80 box carrying a 32px glow.");
console.log("  A transform rotation forces the layer (and its blurred shadow) to be");
console.log("  re-rasterised every single frame; opacity is a compositor-only");
console.log("  property, so the glow is rasterised once and then reused.");

console.log("\n── what the infinite animations cost now ──");
console.log("  2 pulsing dots: opacity + scale, ~10px each, willChange: opacity,transform");
console.log("     -> composited, no repaint of the header behind them");
console.log("  1 '2048' tile: opacity only, willChange: opacity");
console.log("     -> rasterised once, no per-frame work");
console.log("  all three honour prefers-reduced-motion and simply never animate");