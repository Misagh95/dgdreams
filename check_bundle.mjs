import fs from 'fs';
const file = fs.readFileSync('dist/assets/index-Cpmdsyj2.js', 'utf8');

// Check for main.tsx code markers
const markers = [
  'document.getElementById("root")',
  "document.getElementById('root')",
  'VITE_WALLETCONNECT_PROJECT_ID',
  'Missing VITE_WALLETCONNECT',
  'getDefaultConfig',
  'RainbowKitProvider',
  'WagmiProvider',
  'QueryClientProvider',
  'StrictMode',
  'createRoot'
];

for (const m of markers) {
  const idx = file.indexOf(m);
  if (idx >= 0) {
    const start = Math.max(0, idx - 50);
    const end = Math.min(file.length, idx + 100);
    console.log(`\n=== "${m}" at ${idx} ===`);
    console.log(file.substring(start, end));
  } else {
    console.log(`\n=== "${m}" NOT FOUND ===`);
  }
}
