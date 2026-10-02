/**
 * Side-by-side speed comparison of two sites, measured the way a browser
 * experiences them:
 *   - HTML: TTFB + full response time + transferred bytes
 *   - JS/CSS: transferred bytes (compressed) and the wall-clock time to fetch
 *     them ALL AT ONCE (curl --parallel), which is what the page actually waits for
 *
 * Uses curl rather than fetch on purpose: Node's fetch transparently
 * decompresses, which hides the real transfer size.
 *
 * Run: node scripts/compare-sites.mjs <urlA> <pathA> <urlB> <pathB>
 */
import { execFileSync } from "node:child_process";

function curl(urls, extra = []) {
  // one -o per URL, otherwise the later bodies land in stdout and corrupt -w
  const args = [
    "-s",
    "--compressed",
    "-w",
    "%{size_download} %{time_starttransfer} %{time_total}\n",
  ];
  for (const u of urls) args.push("-o", "NUL", u);
  const out = execFileSync("curl.exe", [...extra, ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [size, ttfb, total] = l.trim().split(/\s+/).map(Number);
      return { size, ttfb, total };
    });
}

function getHtml(base, path) {
  return execFileSync(
    "curl.exe",
    ["-s", "--compressed", "--max-time", "30", `${base}${path}`],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
}

function kb(b) {
  return (b / 1024).toFixed(0) + "KB";
}
function mb(b) {
  return (b / 1024 / 1024).toFixed(2) + "MB";
}

function measure(label, base, path) {
  const htmlRes = curl([`${base}${path}`])[0];
  const html = getHtml(base, path);

  const scripts = [
    ...new Set(
      [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
    ),
  ];
  const styles = [
    ...new Set(
      [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
    ),
  ];

  // resolve relative script/style paths against the page URL (chain greets
  // uses "js/x.js", Next uses "/_next/...")
  const pageUrl = `${base}${path}`;
  const abs = (u) => new URL(u, pageUrl).toString();
  const jsUrls = scripts.map(abs);
  const cssUrls = styles.map(abs);

  const js = jsUrls.length ? curl(jsUrls, ["--parallel"]) : [];
  const css = cssUrls.length ? curl(cssUrls, ["--parallel"]) : [];

  const jsBytes = js.reduce((a, r) => a + r.size, 0);
  const cssBytes = css.reduce((a, r) => a + r.size, 0);
  const jsWall = js.length ? Math.max(...js.map((r) => r.total)) : 0;
  const cssWall = css.length ? Math.max(...css.map((r) => r.total)) : 0;

  return {
    label,
    path,
    htmlBytes: htmlRes.size,
    ttfb: htmlRes.ttfb * 1000,
    htmlTotal: htmlRes.total * 1000,
    scripts: jsUrls.length,
    jsBytes,
    jsWall,
    styles: cssUrls.length,
    cssBytes,
    cssWall,
    totalBytes: htmlRes.size + jsBytes + cssBytes,
  };
}

const [aUrl, aPath, bUrl, bPath] = process.argv.slice(2);
if (!aUrl || !bUrl) {
  console.log("usage: node scripts/compare-sites.mjs <urlA> <pathA> <urlB> <pathB>");
  process.exit(1);
}

const A = measure("A", aUrl, aPath || "/");
const B = measure("B", bUrl, bPath || "/");

console.log(`\n  A: ${A.label} ${aUrl}${A.path}`);
console.log(`  B: ${B.label} ${bUrl}${B.path}\n`);
console.log("metric".padEnd(30) + A.label.padEnd(14) + B.label);
console.log("-".repeat(72));

const line = (name, a, b) =>
  console.log(name.padEnd(30) + String(a).padEnd(14) + String(b));

line("HTML transferred", kb(A.htmlBytes), kb(B.htmlBytes));
line("HTML TTFB", Math.round(A.ttfb) + "ms", Math.round(B.ttfb) + "ms");
line("HTML full response", Math.round(A.htmlTotal) + "ms", Math.round(B.htmlTotal) + "ms");
line("", "", "");
line("JS files", A.scripts, B.scripts);
line("JS transferred", mb(A.jsBytes), mb(B.jsBytes));
line("JS fetch wall time", Math.round(A.jsWall) + "ms", Math.round(B.jsWall) + "ms");
line("", "", "");
line("CSS files", A.styles, B.styles);
line("CSS transferred", kb(A.cssBytes), kb(B.cssBytes));
line("CSS fetch wall time", Math.round(A.cssWall) + "ms", Math.round(B.cssWall) + "ms");
line("", "", "");
line("TOTAL transferred", mb(A.totalBytes), mb(B.totalBytes));

const faster = B.totalBytes < A.totalBytes ? B.label : A.label;
console.log(`\n  lighter payload: ${faster}`);
console.log(
  `  ratio: ${(Math.max(A.totalBytes, B.totalBytes) / Math.min(A.totalBytes, B.totalBytes)).toFixed(2)}x`
);