// Prepare a clean, CDN-backed static site for deployment at the domain root.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'deploy/performance-lab/site');
const output = path.join(root, 'build/lab-cdn-v5');
const imageBase = 'https://cdn.aurora-racing.com/performance-lab/v5.0.0/assets/';

// This output is generated only; clear stale files from earlier package layouts.
function clear(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) clear(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}
clear(output);
fs.mkdirSync(path.join(output, 'css'), { recursive: true });
fs.mkdirSync(path.join(output, 'js'), { recursive: true });
for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (!entry.isFile()) continue; // Images are served from CDN, not included here.
  const ext = path.extname(entry.name);
  if (!['.html', '.css', '.js'].includes(ext)) throw new Error(`Unexpected file: ${entry.name}`);
  let text = fs.readFileSync(path.join(source, entry.name), 'utf8').replace(/assets\//g, imageBase);
  if (ext === '.html') {
    text = text.replace(/(href|src)="([^"/]+\.(?:css|js))"/g, (_, attr, name) =>
      `${attr}="${name.endsWith('.css') ? 'css' : 'js'}/${name}"`);
  }
  const folder = ext === '.html' ? '' : ext.slice(1);
  fs.writeFileSync(path.join(output, folder, entry.name), text);
}
console.log('Lab package ready: build/lab-cdn-v5/ (index.html, css/, js/; images on CDN)');
