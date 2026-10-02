/**
 * Measures route payload + phase timings.
 *
 * ⚠️ Node's fetch transparently decompresses, so body bytes here are the
 * UNCOMPRESSED size even when brotli was sent. For the true transfer size use
 * check-compression.mjs, or a browser network tab.
 *
 * Run: node scripts/measure-transfer.mjs [baseUrl] [route]
 */
const BASE = process.argv[2] || "https://dgdreams.space";
const ROUTE = process.argv[3] || "/dashboard";

const RAW = (buf) => buf.byteLength;

async function fetchTimed(url, extra = {}) {
  const t0 = performance.now();
  const res = await fetch(url, {
    headers: { "accept-encoding": "gzip, br", "user-agent": "Mozilla/5.0", ...extra },
    redirect: "follow",
  });
  const ttfb = performance.now() - t0;
  const buf = await res.arrayBuffer();
  const total = performance.now() - t0;
  return {
    ttfb,
    total,
    raw: RAW(buf),
    transfer: Number(res.headers.get("content-length") || 0) || null,
    encoding: res.headers.get("content-encoding"),
    cached: res.headers.get("x-vercel-cache") || res.headers.get("cf-cache-status") || "",
    buf,
  };
}

console.log(`target: ${BASE}${ROUTE}\n`);

const page = await fetchTimed(BASE + ROUTE);
const html = new TextDecoder().decode(page.buf);
console.log("── HTML ──");
console.log(`  TTFB            ${Math.round(page.ttfb)}ms`);
console.log(`  full response   ${Math.round(page.total)}ms`);
console.log(`  uncompressed    ${(page.raw / 1024).toFixed(0)}KB`);
console.log(`  encoding        ${page.encoding || "none (small/uncompressed)"}`);
console.log(`  cache           ${page.cached || "-"}`);

const scripts = [
  ...new Set([...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))),
];
const styles = [...new Set([...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&")))];

async function totalOf(urls) {
  let raw = 0,
    transfer = 0,
    time = 0,
    n = 0;
  await Promise.all(
    urls.map(async (u) => {
      const r = await fetchTimed(u.startsWith("http") ? u : BASE + u);
      raw += r.raw;
      transfer += r.transfer ?? r.raw;
      time += r.total;
      n++;
    })
  );
  return { raw, transfer, time, n };
}

const js = await totalOf(scripts);
const css = await totalOf(styles);

console.log(`\n── JS (${js.n} files, fetched in parallel) ──`);
console.log(`  uncompressed    ${(js.raw / 1024 / 1024).toFixed(2)}MB`);
console.log(`  over the wire   ${(js.transfer / 1024 / 1024).toFixed(2)}MB`);
console.log(`  parallel fetch   ${Math.round(js.time)}ms (slowest file)`);

console.log(`\n── CSS (${css.n} files) ──`);
console.log(`  uncompressed    ${(css.raw / 1024).toFixed(0)}KB`);
console.log(`  over the wire   ${((css.transfer || css.raw) / 1024).toFixed(0)}KB`);

const grandTransfer = page.raw + js.transfer + (css.transfer || css.raw);
console.log(`\n═══ verdict ═══`);
console.log(`  first visit downloads ~${(grandTransfer / 1024 / 1024).toFixed(2)}MB`);
console.log(`  (HTML ${(page.raw / 1024).toFixed(0)}KB + JS ${(js.transfer / 1024 / 1024).toFixed(2)}MB + CSS ${((css.transfer || css.raw) / 1024).toFixed(0)}KB)`);
console.log(`\n  reference points for a Next.js app of this kind:`);
console.log(`    simple content site      ~80-150KB JS`);
console.log(`    typical wagmi dapp       ~300-600KB JS`);
console.log(`    this app                 ${(js.transfer / 1024 / 1024).toFixed(2)}MB over the wire`);