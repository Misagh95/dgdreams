import fs from 'fs';

// Check all chunk files for the error message
const dist = 'dist/assets';
const files = fs.readdirSync(dist).filter(f => f.endsWith('.js'));

for (const file of files) {
  const content = fs.readFileSync(`${dist}/${file}`, 'utf8');
  if (content.includes('Missing VITE_WALLETCONNECT')) {
    console.log(`Found in ${file}`);
    const idx = content.indexOf('Missing VITE_WALLETCONNECT');
    console.log(content.substring(Math.max(0,idx-200), idx+200));
  }
  if (content.includes('projectId') && file.includes('index')) {
    console.log(`\n=== projectId mentions in ${file} ===`);
    let idx = content.indexOf('projectId');
    while (idx >= 0) {
      const start = Math.max(0, idx - 100);
      const end = Math.min(content.length, idx + 100);
      console.log(`\nAt ${idx}:`);
      console.log(content.substring(start, end));
      idx = content.indexOf('projectId', idx + 1);
    }
  }
}
