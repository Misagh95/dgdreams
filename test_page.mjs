import http from 'http';

function check(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

try {
  const { status, data } = await check('http://127.0.0.1:4173/');
  console.log('Status:', status);
  console.log('HTML length:', data.length);
  console.log('Contains #root:', data.includes('<div id="root">'));
  console.log('Contains JS bundle:', data.includes('index-Cpmdsyj2.js'));
} catch(e) {
  console.error('Error:', e.message);
}
