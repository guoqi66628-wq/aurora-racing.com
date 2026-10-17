// Package the independent login page without interfering with i3pro assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const output = path.join(root, 'build', 'telemetry-login');
const htmlPath = path.join(dist, 'telemetry-login.html');
if (!fs.existsSync(htmlPath)) throw new Error('Run npm run build first.');
fs.mkdirSync(output, { recursive: true });
// Explicit copies avoid Node's native recursive cp issue on some Windows paths.
function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, item.name);
    const to = path.join(destination, item.name);
    if (item.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}
copyDirectory(path.join(dist, 'assets'), path.join(output, 'assets'));
// Vite emits absolute font URLs inside CSS too; standalone login assets use
// their own Nginx route. Preserve the original dist/ for the main website.
let packagedFonts = 0;
for (const name of fs.readdirSync(path.join(dist, 'assets'))) {
  if (!name.endsWith('.css')) continue;
  const cssPath = path.join(output, 'assets', name);
  const css = fs.readFileSync(cssPath, 'utf8').replace(
    /(?:https:\/\/[^"'()\s<>]+)?\/assets\//g, '/login-assets/',
  );
  fs.writeFileSync(cssPath, css);
  for (const match of css.matchAll(/url\(["']?(\/login-assets\/[^"'()\s]+)["']?\)/g)) {
    const asset = path.join(output, match[1].replace('/login-assets/', 'assets/'));
    if (!fs.existsSync(asset)) throw new Error(`Missing CSS asset: ${match[1]}`);
    if (asset.endsWith('.woff2')) packagedFonts++;
  }
}
if (packagedFonts < 3) throw new Error('Expected all three Alibaba PuHuiTi weights in the login package.');
fs.copyFileSync(
  path.join(root, 'src/assets/fonts/alibaba-puhuiti/LICENSE.md'),
  path.join(output, 'assets/AlibabaPuHuiTi-LICENSE.md'),
);
const html = fs.readFileSync(htmlPath, 'utf8').replace(
  /(?:https:\/\/[^"'\s<>]+)?\/assets\//g, '/login-assets/',
);
fs.writeFileSync(path.join(output, 'telemetry-login.html'), html);
const assets = [...html.matchAll(/(?:src|href)="(\/login-assets\/[^\"]+)"/g)].map((match) => match[1]);
if (!assets.length) throw new Error('No login bundle references found.');
for (const asset of assets) {
  const local = path.join(output, asset.replace('/login-assets/', 'assets/'));
  if (!fs.existsSync(local)) throw new Error(`Missing packaged asset: ${asset}`);
}
// Brand images and existing Latin fonts use the CDN; PuHuiTi ships in assets/.
console.log('Login package ready: build/telemetry-login/ (HTML + assets)');
