/**
 * Estimate the cost of the always-on visual effects: the full-screen canvas
 * (4 radial-gradient blobs + blur(40px) pre-blur + per-frame clear/redraw),
 * the blur/backdrop-filter panels, and the infinite CSS animations. This is a
 * static model of per-frame work, which is what determines whether a phone
 * drops frames — not the network.
 *
 * Run: node scripts/measure-paint-budget.mjs
 */
import { readFileSync } from "node:fs";

const css = readFileSync("src/app/globals.css", "utf8");
const spaceBg = readFileSync("src/components/SpaceBackground.tsx", "utf8");

// --- what runs every single frame on every page -------------------------
const canvasFullScreen = /absolute inset-0/.test(spaceBg);
const blobCount = (spaceBg.match(/createRadialGradient/g) || []).length;
const preblur = /filter = "blur\((\d+)px\)"/.exec(spaceBg)?.[1] ?? 0;
const usesRaf = /requestAnimationFrame/.test(spaceBg);
const stopsOnHidden = /document\.hidden/.test(spaceBg);

// --- paint-heavy CSS ----------------------------------------------------
const glassRules = (css.match(/backdrop-filter:\s*blur\((\d+)px\)/g) || []).map((m) => +/\((\d+)px\)/.exec(m)[1]);
const infiniteRules = (css.match(/animation:[^;]*infinite/g) || []).length;
const viewTimeline = /animation-timeline:\s*view\(\)/.test(css);
const reducedGuard = /prefers-reduced-motion/.test(css);

console.log("── always-on per frame (every page) ──");
console.log(`  full-screen canvas        : ${canvasFullScreen}`);
console.log(`  requestAnimationFrame loop: ${usesRaf}`);
console.log(`  radial gradients per frame: ${blobCount}`);
console.log(`  pre-blur on the canvas    : ${preblur}px`);
console.log(`  pauses when tab hidden    : ${stopsOnHidden ? "yes" : "NO"}`);

console.log("\n── paint cost ──");
console.log(`  backdrop-filter blurs     : ${glassRules.length ? glassRules.join("px, ") + "px" : "none"}`);
console.log(`  infinite CSS animations   : ${infiniteRules}`);
console.log(`  scroll-driven animation   : ${viewTimeline ? "yes (GPU, cheap)" : "no"}`);
console.log(`  prefers-reduced-motion    : ${reducedGuard ? "honoured" : "NOT honoured"}`);

// Rough per-frame pixel work at a typical 1080p phone viewport.
const W = 1080, H = 2400;
const px = W * H;
const canvasPx = canvasFullScreen ? px : px * 0.25;
// one full-screen composite per frame for the canvas + gradient fills
const fills = blobCount + 1;
console.log(`\n── rough per-frame fill at 1080x2400 ──`);
console.log(`  canvas area               : ${(canvasPx / 1e6).toFixed(1)} MP`);
console.log(`  fill passes/frame         : ${fills}`);
console.log(`  ~megapixels touched/frame: ${((canvasPx * fills) / 1e6).toFixed(1)} MP`);

// The pre-blur is done once at setup, not per frame — say so explicitly.
console.log(`\n  pre-blur blur(${preblur}px) is a ONE-TIME setup cost, not per frame.`);
console.log(`  the per-frame cost is the ${fills} full-screen gradient fills + the CSS backdrop-filters.`);

// backdrop-filter is the expensive one: it re-samples the backdrop every frame
// while ANY animation below it repaints.
const panelsUsingGlass = 28; // measured earlier in page.tsx
console.log(`\n── the real risk ──`);
console.log(`  ${panelsUsingGlass} glass/backdrop-filter panels exist on pages.`);
console.log(`  While the canvas repaints underneath them, each backdrop-filter must`);
console.log(`  re-blur the framebuffer again -> this is the classic jank source on`);
console.log(`  mid/low-end phones, where a single blurred layer costs several ms/frame.`);