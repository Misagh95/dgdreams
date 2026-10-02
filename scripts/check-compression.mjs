/** Compare a single chunk's real byte size: uncompressed vs brotli. */
/* ⚠️ Node's fetch transparently decompresses responses, so counting body bytes
   below gives the UNCOMPRESSED size even when the server sent brotli. This
   script is still useful for the phase timings; for the true transfer size use
   measure-compression.mjs (curl) or a browser network tab. */
const BASE = "https://dgdreams.space";

const html = await (await fetch(BASE + "/dashboard")).text();
const one = [...new Set([...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]))]
  .map((s) => s.replace(/&amp;/g, "&"))
  .sort((a, b) => b.length - a.length)[0];
const url = one.startsWith("http") ? one : BASE + one;

async function bytes(headers) {
  const res = await fetch(url, { headers });
  // count the bytes actually received on the wire
  let n = 0;
  if (res.body) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.byteLength;
    }
  } else {
    n = (await res.arrayBuffer()).byteLength;
  }
  return {
    wire: n,
    enc: res.headers.get("content-encoding"),
    len: res.headers.get("content-length"),
  };
}

const identity = await bytes({ "accept-encoding": "identity" });
const br = await bytes({ "accept-encoding": "br, gzip" });

console.log(`file: ${url.split("/").pop()}\n`);
console.log("  identity (no compression)");
console.log(`    wire bytes    ${(identity.wire / 1024).toFixed(1)}KB   encoding=${identity.enc} content-length=${identity.len}`);
console.log("  br / gzip");
console.log(`    wire bytes    ${(br.wire / 1024).toFixed(1)}KB   encoding=${br.enc} content-length=${br.len}`);
if (identity.wire > 0) {
  console.log(`\n  compression ratio: ${(br.wire / identity.wire * 100).toFixed(0)}% of raw`);
}