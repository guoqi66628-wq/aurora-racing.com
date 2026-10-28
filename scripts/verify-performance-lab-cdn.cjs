const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../deploy/performance-lab/site/assets');
const base = 'https://cdn.aurora-racing.com/performance-lab/v5.0.0/assets/';
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : [p];
  });
}
async function main() {
  const paths = files(root).map(f => path.relative(root, f).split(path.sep).map(encodeURIComponent).join('/'));
  const failures = [];
  for (let i = 0; i < paths.length; i += 10) {
    await Promise.all(paths.slice(i, i + 10).map(async p => {
      try {
        const res = await fetch(base + p, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
        if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) failures.push(`${p}: ${res.status} ${res.headers.get('content-type')}`);
      } catch (e) { failures.push(`${p}: ${e.message}`); }
    }));
  }
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  console.log(`${paths.length - failures.length}/${paths.length} CDN images accessible with image content types`);
}
main();
