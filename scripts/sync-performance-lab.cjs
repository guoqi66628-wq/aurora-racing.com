// Upload only versioned Lab assets; never delete or overwrite existing objects.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const qiniu = require('qiniu');
const root = path.resolve(__dirname, '../deploy/performance-lab/site/assets');
const prefix = 'performance-lab/v5.0.0/assets/';
const { QINIU_ACCESS_KEY: ak, QINIU_SECRET_KEY: sk, QINIU_BUCKET: bucket } = process.env;
if (!ak || !sk || !bucket) throw new Error('Missing Qiniu credentials or bucket');
const config = new qiniu.conf.Config();
config.useHttpsDomain = true;
const mac = new qiniu.auth.digest.Mac(ak, sk);
const manager = new qiniu.rs.BucketManager(mac, config);
const uploader = new qiniu.form_up.FormUploader(config);
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : [p];
  });
}
function etag(file) {
  const data = fs.readFileSync(file);
  const sha = b => crypto.createHash('sha1').update(b).digest();
  const block = 4 * 1024 * 1024;
  const chunks = [];
  for (let i = 0; i < data.length; i += block) chunks.push(sha(data.subarray(i, i + block)));
  const hash = data.length <= block ? sha(data) : sha(Buffer.concat(chunks));
  return Buffer.concat([Buffer.from([data.length <= block ? 0x16 : 0x96]), hash]).toString('base64url');
}
function list(marker = '') {
  return new Promise((resolve, reject) => manager.listPrefix(bucket, { prefix, limit: 1000, marker }, (err, body, info) => {
    if (err) return reject(err);
    if (info.statusCode !== 200) return reject(new Error(`List failed: ${info.statusCode}`));
    resolve(body);
  }));
}
function upload(file, key) {
  const token = new qiniu.rs.PutPolicy({ scope: bucket, insertOnly: 1, expires: 3600 }).uploadToken(mac);
  return new Promise((resolve, reject) => uploader.putFile(token, key, file, new qiniu.form_up.PutExtra(), (err, body, info) => {
    if (err) return reject(err);
    if (info.statusCode !== 200) return reject(new Error(`Upload ${key}: ${info.statusCode}`));
    resolve(body);
  }));
}
async function main() {
  let marker = '', remote = new Map();
  do {
    const page = await list(marker);
    for (const item of page.items || []) remote.set(item.key, item.hash);
    marker = page.marker || '';
  } while (marker);
  const local = files(root).map(file => ({ file, key: prefix + path.relative(root, file).split(path.sep).join('/') }));
  const conflicts = local.filter(f => remote.has(f.key) && remote.get(f.key) !== etag(f.file));
  if (conflicts.length) throw new Error(`${conflicts.length} target keys differ; use a new version prefix rather than overwrite.`);
  const pending = local.filter(f => !remote.has(f.key));
  console.log(`${pending.length} files to upload, ${local.length - pending.length} already match, ${pending.reduce((n, f) => n + fs.statSync(f.file).size, 0)} bytes; prefix: ${prefix}`);
  if (!process.argv.includes('--upload')) return console.log('Dry run: no objects uploaded.');
  for (const [i, f] of pending.entries()) {
    await upload(f.file, f.key);
    console.log(`[${i + 1}/${pending.length}] ${f.key}`);
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
