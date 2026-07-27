import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stubs = {
  "@x402/core/client": {
    files: {
      "index.js": "export {};",
      "package.json": JSON.stringify({ name: "@x402/core/client", version: "0.0.0", main: "index.js" }),
      "index.d.ts": "export {};",
    },
  },
  "@x402/evm": {
    files: {
      "index.js": "const a = {}; export default a; export const toClientEvmSigner = () => ({});",
      "package.json": JSON.stringify({ name: "@x402/evm", version: "0.0.0", main: "index.js" }),
      "index.d.ts": "export const toClientEvmSigner: () => Record<string, unknown>; export default Record<string, unknown>;",
    },
  },
  "@x402/evm/exact/client": {
    files: {
      "index.js": "export {};",
      "package.json": JSON.stringify({ name: "@x402/evm/exact/client", version: "0.0.0", main: "index.js" }),
      "index.d.ts": "export {};",
    },
  },
  "@x402/evm/upto/client": {
    files: {
      "index.js": "export {};",
      "package.json": JSON.stringify({ name: "@x402/evm/upto/client", version: "0.0.0", main: "index.js" }),
      "index.d.ts": "export {};",
    },
  },
  "@x402/svm/exact/client": {
    files: {
      "index.js": "export {};",
      "package.json": JSON.stringify({ name: "@x402/svm/exact/client", version: "0.0.0", main: "index.js" }),
      "index.d.ts": "export {};",
    },
  },
};

for (const [pkg, config] of Object.entries(stubs)) {
  const dir = path.join(__dirname, "..", "node_modules", pkg);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(config.files)) {
    fs.writeFileSync(path.join(dir, name), content, "utf-8");
  }
  console.log(`  ✓ ${pkg}`);
}

console.log("All @x402 stubs created");
