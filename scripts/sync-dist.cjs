#!/usr/bin/env node
/**
 * 同步 dist/ 目录到七牛 CDN
 * 用于上传构建后的 JS/CSS/HTML 等文件
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const qiniu = require('qiniu');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const BLOCK = 4 * 1024 * 1024;

// ---------- 工具函数 ----------

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (c, s) => (USE_COLOR ? `\x1b[${c}m${s}\x1b[0m` : s);
const dim = (s) => color('2', s);
const green = (s) => color('32', s);
const yellow = (s) => color('33', s);
const red = (s) => color('31', s);
const cyan = (s) => color('36', s);

function fail(msg) {
  console.error(`\n${red('✗')} ${msg}\n`);
  process.exit(1);
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/** 七牛 etag 计算（与 sync-assets.cjs 相同） */
function qiniuEtag(filePath) {
  const sha1 = (b) => crypto.createHash('sha1').update(b).digest();
  const data = fs.readFileSync(filePath);
  let buf;
  if (data.length <= BLOCK) {
    buf = Buffer.concat([Buffer.from([0x16]), sha1(data)]);
  } else {
    const parts = [];
    for (let i = 0; i < data.length; i += BLOCK) {
      parts.push(sha1(data.subarray(i, i + BLOCK)));
    }
    buf = Buffer.concat([Buffer.from([0x96]), sha1(Buffer.concat(parts))]);
  }
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

/** 递归收集文件 */
function collectFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, base));
      continue;
    }
    if (entry.name === '.DS_Store') continue;
    out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/** 上传单个文件 */
function uploadOne(uploader, putExtra, token, key, localPath) {
  return new Promise((resolve, reject) => {
    uploader.putFile(token, key, localPath, putExtra, (err, body, info) => {
      if (err) return reject(err);
      if (info.statusCode !== 200) {
        return reject(new Error(`上传失败 (${info.statusCode}): ${JSON.stringify(body)}`));
      }
      resolve(body);
    });
  });
}

/** 列出远程文件 */
function listAllRemote(bucketManager, bucket, prefix) {
  return new Promise((resolve, reject) => {
    const remote = new Map();
    const step = (marker) => {
      bucketManager.listPrefix(
        bucket,
        { prefix, limit: 1000, marker: marker || '' },
        (err, body, info) => {
          if (err) return reject(err);
          if (info.statusCode !== 200) {
            return reject(new Error(`listPrefix 失败 (${info.statusCode}): ${JSON.stringify(body)}`));
          }
          for (const item of body.items || []) remote.set(item.key, item.hash);
          if (body.marker) step(body.marker);
          else resolve(remote);
        }
      );
    };
    step('');
  });
}

// ---------- 主流程 ----------

async function main() {
  const AK = process.env.QINIU_ACCESS_KEY;
  const SK = process.env.QINIU_SECRET_KEY;
  const BUCKET = process.env.QINIU_BUCKET;
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');

  if (!AK || !SK || !BUCKET) {
    fail(
      '缺少七牛凭证。请设置环境变量后重试：\n' +
        '  QINIU_ACCESS_KEY / QINIU_SECRET_KEY / QINIU_BUCKET\n\n' +
        '  可写入 .env.deploy 文件（已被 .gitignore 忽略）'
    );
  }

  if (!fs.existsSync(DIST_DIR)) {
    fail(`找不到 dist 目录：${DIST_DIR}\n  请先运行 npm run build`);
  }

  console.log(`\n${cyan('七牛 CDN - 同步构建产物')}`);
  console.log(dim(`  bucket : ${BUCKET}`));
  console.log(dim(`  源目录 : dist/`));
  if (dryRun) console.log(yellow('  模式   : DRY RUN（只预演，不写入）'));

  const mac = new qiniu.auth.digest.Mac(AK, SK);
  const config = new qiniu.conf.Config();
  config.useHttpsDomain = true;
  const bucketManager = new qiniu.rs.BucketManager(mac, config);

  // 1. 收集本地文件
  const localFiles = collectFiles(DIST_DIR);
  if (localFiles.length === 0) fail('dist/ 目录为空');

  console.log(dim(`\n  找到 ${localFiles.length} 个文件`));

  // 2. 读取远程清单（只读取 assets/ 和 index.html）
  process.stdout.write(dim('  正在读取远程清单... '));
  let remote;
  try {
    remote = await listAllRemote(bucketManager, BUCKET, '');
  } catch (e) {
    console.log('');
    fail(`读取 bucket 失败：${e.message}`);
  }
  console.log(dim('完成'));

  // 3. 比对并准备上传
  const toUpload = [];
  let skipped = 0;

  for (const file of localFiles) {
    const localPath = path.join(DIST_DIR, file);
    const localHash = qiniuEtag(localPath);
    const remoteHash = remote.get(file);
    const fileSize = fs.statSync(localPath).size;

    // 对于 index.html，总是上传（因为它引用的 hash 文件名会变）
    if (file === 'index.html' || remoteHash !== localHash) {
      toUpload.push({
        key: file,
        localPath,
        size: fileSize,
        reason: remoteHash ? '变更' : '新增',
      });
    } else {
      skipped++;
    }
  }

  // 4. 打印计划
  console.log('');
  if (toUpload.length === 0) {
    console.log(`  ${green('✓')} 所有文件已是最新（${skipped} 个文件一致）`);
  } else {
    const totalSize = toUpload.reduce((s, f) => s + f.size, 0);
    console.log(`  待上传 ${toUpload.length} 个文件（${humanSize(totalSize)}）：`);
    for (const f of toUpload) {
      const tag = f.reason === '新增' ? green('新增') : yellow('变更');
      console.log(`    ${tag}  ${f.key} ${dim(`(${humanSize(f.size)})`)}`);
    }
  }

  if (dryRun) {
    console.log(`\n${yellow('DRY RUN 结束')}，未做任何修改。去掉 --dry-run 即可实际执行。\n`);
    return;
  }

  if (toUpload.length === 0) {
    console.log('');
    return;
  }

  // 5. 执行上传
  console.log('');
  const uploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();
  let done = 0;
  const failures = [];

  for (const f of toUpload) {
    // 设置正确的 MIME 类型
    if (f.key.endsWith('.js')) {
      putExtra.mimeType = 'application/javascript; charset=utf-8';
    } else if (f.key.endsWith('.css')) {
      putExtra.mimeType = 'text/css; charset=utf-8';
    } else if (f.key.endsWith('.html')) {
      putExtra.mimeType = 'text/html; charset=utf-8';
    } else if (f.key.endsWith('.svg')) {
      putExtra.mimeType = 'image/svg+xml';
    }

    const token = new qiniu.rs.PutPolicy({
      scope: `${BUCKET}:${f.key}`,
      expires: 3600,
    }).uploadToken(mac);

    try {
      await uploadOne(uploader, putExtra, token, f.key, f.localPath);
      done++;
      if (process.stdout.isTTY) {
        process.stdout.write(`\r  上传中 ${done}/${toUpload.length} ${dim(f.key.slice(0, 50))}${' '.repeat(20)}`);
      } else {
        console.log(`  [${done}/${toUpload.length}] ${f.key}`);
      }
    } catch (e) {
      failures.push({ key: f.key, error: e.message });
    }
  }

  if (toUpload.length > 0 && process.stdout.isTTY) {
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
  }

  if (done > 0) console.log(`  ${green('✓')} 已上传 ${done} 个文件`);

  if (failures.length > 0) {
    console.log(`\n  ${red(`✗ ${failures.length} 个文件上传失败：`)}`);
    for (const f of failures) console.log(`    ${f.key}\n      ${dim(f.error)}`);
    process.exit(1);
  }

  console.log(`\n${green('同步完成')}\n`);
}

main().catch((e) => fail(`未预期的错误：${e.stack || e.message}`));
