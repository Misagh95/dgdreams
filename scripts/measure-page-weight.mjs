/**
 * Measures the real payload each route serves (HTML + every JS chunk the
 * browser must parse), so "which page is heavy" is answered by data instead of
 * by guessing from the source file size.
 *
 * Run: node scripts/measure-page-weight.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3000";
const PAGES = [
  "/", "/dashboard", "/tasks", "/2048", "/leaderboard", "/profile",
  "/litevm", "/litvm-market", "/genlayer", "/genlayer-escrow", "/genlayer-market",
  "/genlayer-oracle", "/truthcourt", "/swap", "/activity",
];

const rows = [];

for (const p of PAGES) {
  let html;
  const t0 = performance.now();
  try {
    html = await (await fetch(BASE + p)).text();
  } catch (e) {
    console.log(`${p.padEnd(20)} ERROR`);
    continue;
  }
  const ttfb = performance.now() - t0;

  const scripts = [
    ...new Set(
      [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
    ),
  ];

  let jsBytes = 0;
  await Promise.all(
    scripts.map(async (s) => {
      const full = s.startsWith("http") ? s : BASE + s;
      try {
        const b = await (await fetch(full)).arrayBuffer();
        jsBytes += b.byteLength;
      } catch {
        /* ignore */
      }
    })
  );

  const styles = [
    ...new Set([...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))),
  ];
  let cssBytes = 0;
  for (const s of styles) {
    const full = s.startsWith("http") ? s : BASE + s;
    try {
      cssBytes += (await (await fetch(full)).arrayBuffer()).byteLength;
    } catch {
      /* ignore */
    }
  }

  rows.push({
    p,
    html: (new TextEncoder().encode(html).length) / 1024,
    js: jsBytes / 1024,
    css: cssBytes / 1024,
    files: scripts.length,
    ttfb,
  });
}

const mb = (kb) => (kb / 1024).toFixed(2) + "MB";
rows.sort((a, b) => b.js - a.js);

console.log(`payload per route @ ${BASE}\n`);
console.log("route                 html      css      js        files  ttfb");
console.log("-".repeat(72));
for (const r of rows) {
  console.log(
    `${r.p.padEnd(20)}${mb(r.html).padStart(8)}${mb(r.css).padStart(9)}${mb(r.js).padStart(10)}` +
      `${String(r.files).padStart(9)}${Math.round(r.ttfb) + "ms"}`.padStart(7)
  );
}

const avg = rows.reduce((a, b) => a + b.js, 0) / (rows.length || 1);
const worst = rows[0];
console.log(`\navg JS ${mb(avg)}   heaviest: ${worst.p} at ${mb(worst.js)}`);