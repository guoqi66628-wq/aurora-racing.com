#!/usr/bin/env node
/**
 * OSS 同步脚本：把 public/ 下的静态资源增量同步到七牛 Bucket。
 *
 * 设计要点：
 * - 增量：用七牛 etag 比对本地与线上，只上传新增/变更的文件，避免每次全量重传。
 * - 幂等：内容没变就跳过，可以反复执行。
 * - 安全：默认不删除线上多余文件（--prune 才删），避免误删其他来源的资源。
 * - 可预演：--dry-run 只打印计划，不做任何写操作。
 *
 * 凭证从环境变量读取，不落盘、不进版本库：
 *   QINIU_ACCESS_KEY / QINIU_SECRET_KEY / QINIU_BUCKET
 *   QINIU_CDN_DOMAIN（可选，用于 --refresh 刷新缓存）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const qiniu = require('qiniu');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'public');
const BLOCK = 4 * 1024 * 1024;

// ---------- CLI ----------

const argv = process.argv.slice(2);
const flags = {
  dryRun: argv.includes('--dry-run'),
  prune: argv.includes('--prune'),
  refresh: argv.includes('--refresh'),
  force: argv.includes('--force'),
};

// ---------- 工具 ----------

// 非 TTY（CI 日志、重定向到文件）下不输出颜色转义，避免乱码
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

/** 七牛 etag：<=4MB 为 0x16+sha1(data)，>4MB 为 0x96+sha1(拼接各块 sha1)，urlsafe-base64 编码 */
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

/** 递归收集 public/ 下的文件，返回相对 public 的 posix 风格 key */
function collectLocalFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectLocalFiles(full, base));
      continue;
    }
    // .gitkeep 只是占位，没必要上 CDN
    if (entry.name === '.gitkeep' || entry.name === '.DS_Store') continue;
    out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

// ---------- 七牛封装 ----------

/** 列出 bucket 中指定前缀的全部对象，返回 Map<key, etag>；自动翻页 */
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

function uploadOne(uploader, putExtra, token, key, localPath) {
  return new Promise((resolve, reject) => {
    // 覆盖式上传：token 中已带 scope=bucket:key，重复执行不会产生冲突
    uploader.putFile(token, key, localPath, putExtra, (err, body, info) => {
      if (err) return reject(err);
      if (info.statusCode !== 200) {
        return reject(new Error(`上传失败 (${info.statusCode}): ${JSON.stringify(body)}`));
      }
      resolve(body);
    });
  });
}

function deleteBatch(bucketManager, bucket, keys) {
  return new Promise((resolve, reject) => {
    const ops = keys.map((k) => qiniu.rs.deleteOp(bucket, k));
    bucketManager.batch(ops, (err, body, info) => {
      if (err) return reject(err);
      if (info.statusCode !== 200 && info.statusCode !== 298) {
        return reject(new Error(`批量删除失败 (${info.statusCode}): ${JSON.stringify(body)}`));
      }
      resolve(body);
    });
  });
}

function refreshCdn(cdnManager, urls) {
  return new Promise((resolve, reject) => {
    cdnManager.refreshUrls(urls, (err, body, info) => {
      if (err) return reject(err);
      if (info.statusCode !== 200) {
        return reject(new Error(`CDN 刷新失败 (${info.statusCode}): ${JSON.stringify(body)}`));
      }
      resolve(body);
    });
  });
}

// ---------- 主流程 ----------

async function main() {
  const AK = process.env.QINIU_ACCESS_KEY;
  const SK = process.env.QINIU_SECRET_KEY;
  const BUCKET = process.env.QINIU_BUCKET;
  const CDN_DOMAIN = process.env.QINIU_CDN_DOMAIN;

  if (!AK || !SK || !BUCKET) {
    fail(
      '缺少七牛凭证。请设置环境变量后重试：\n' +
        '  QINIU_ACCESS_KEY / QINIU_SECRET_KEY / QINIU_BUCKET\n' +
        '  （可选）QINIU_CDN_DOMAIN — 使用 --refresh 刷新缓存时需要\n\n' +
        '  本地可写入 .env.deploy（已被 .gitignore 忽略），用 npm run deploy:assets 自动加载。'
    );
  }

  if (!fs.existsSync(SRC_DIR)) fail(`找不到资源目录：${SRC_DIR}`);

  console.log(`\n${cyan('七牛 OSS 资源同步')}`);
  console.log(dim(`  bucket : ${BUCKET}`));
  console.log(dim(`  源目录 : public/`));
  if (flags.dryRun) console.log(yellow('  模式   : DRY RUN（只预演，不写入）'));
  if (flags.force) console.log(yellow('  模式   : FORCE（忽略 etag，全量重传）'));

  const mac = new qiniu.auth.digest.Mac(AK, SK);
  const config = new qiniu.conf.Config();
  // 让 SDK 按 bucket 自动解析区域，避免把 zone 写死在代码里
  config.useHttpsDomain = true;
  const bucketManager = new qiniu.rs.BucketManager(mac, config);

  // 1. 读取本地清单
  const localKeys = collectLocalFiles(SRC_DIR);
  if (localKeys.length === 0) fail('public/ 下没有可同步的文件');

  // 2. 读取线上清单
  process.stdout.write(dim('  正在读取线上清单... '));
  let remote;
  try {
    remote = await listAllRemote(bucketManager, BUCKET, '');
  } catch (e) {
    console.log('');
    fail(`读取 bucket 失败：${e.message}\n  请检查 AK/SK 是否正确、bucket 名称是否存在。`);
  }
  console.log(dim(`${remote.size} 个对象`));

  // 3. 比对：本地 etag vs 线上 etag
  const toUpload = [];
  let skipped = 0;
  for (const key of localKeys) {
    const localPath = path.join(SRC_DIR, key);
    const remoteHash = remote.get(key);
    const localHash = qiniuEtag(localPath);
    if (!flags.force && remoteHash === localHash) {
      skipped++;
      continue;
    }
    toUpload.push({
      key,
      localPath,
      size: fs.statSync(localPath).size,
      reason: remoteHash ? '变更' : '新增',
    });
  }

  // 线上有、本地没有的
  const orphans = [...remote.keys()].filter((k) => !localKeys.includes(k));

  // 4. 打印计划
  console.log('');
  if (toUpload.length === 0) {
    console.log(`  ${green('✓')} 所有资源已是最新（${skipped} 个文件一致）`);
  } else {
    const totalSize = toUpload.reduce((s, f) => s + f.size, 0);
    console.log(`  待上传 ${toUpload.length} 个文件（${humanSize(totalSize)}），跳过 ${skipped} 个未变更：`);
    for (const f of toUpload) {
      const tag = f.reason === '新增' ? green('新增') : yellow('变更');
      console.log(`    ${tag}  ${f.key} ${dim(`(${humanSize(f.size)})`)}`);
    }
  }

  if (orphans.length > 0) {
    console.log('');
    if (flags.prune) {
      console.log(`  ${red('待删除')} ${orphans.length} 个线上多余对象：`);
      for (const k of orphans) console.log(`    ${red('删除')}  ${k}`);
    } else {
      console.log(dim(`  线上有 ${orphans.length} 个本地不存在的对象（保留，加 --prune 可删除）：`));
      for (const k of orphans.slice(0, 10)) console.log(dim(`    · ${k}`));
      if (orphans.length > 10) console.log(dim(`    … 另有 ${orphans.length - 10} 个`));
    }
  }

  if (flags.dryRun) {
    console.log(`\n${yellow('DRY RUN 结束')}，未做任何修改。去掉 --dry-run 即可实际执行。\n`);
    return;
  }

  // 5. 执行上传
  const uploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();
  let done = 0;
  const failures = [];

  for (const f of toUpload) {
    // 每个 key 单独签发覆盖式上传凭证
    const token = new qiniu.rs.PutPolicy({
      scope: `${BUCKET}:${f.key}`,
      expires: 3600,
    }).uploadToken(mac);

    try {
      await uploadOne(uploader, putExtra, token, f.key, f.localPath);
      done++;
      // 非 TTY 下 \r 不生效，逐行输出反而更适合 CI 日志
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
  }

  // 6. 可选删除
  if (flags.prune && orphans.length > 0) {
    // 七牛 batch 单次上限 1000
    for (let i = 0; i < orphans.length; i += 1000) {
      await deleteBatch(bucketManager, BUCKET, orphans.slice(i, i + 1000));
    }
    console.log(`  ${green('✓')} 已删除 ${orphans.length} 个多余对象`);
  }

  // 7. 可选刷新 CDN 缓存（只刷新本次变更的文件）
  const changed = toUpload.filter((f) => f.reason === '变更').map((f) => f.key);
  if (flags.refresh && changed.length > 0) {
    if (!CDN_DOMAIN) {
      console.log(`  ${yellow('!')} 未设置 QINIU_CDN_DOMAIN，跳过 CDN 刷新`);
    } else {
      const base = CDN_DOMAIN.replace(/\/$/, '');
      const urls = changed.map((k) => `${base}/${k}`);
      // 七牛单次刷新上限 100 条 URL
      for (let i = 0; i < urls.length; i += 100) {
        await refreshCdn(new qiniu.cdn.CdnManager(mac), urls.slice(i, i + 100));
      }
      console.log(`  ${green('✓')} 已提交 ${urls.length} 条 CDN 刷新（生效需数分钟）`);
    }
  } else if (flags.refresh && changed.length === 0) {
    console.log(dim('  无变更文件，无需刷新 CDN（新增文件不存在旧缓存）'));
  }

  if (failures.length > 0) {
    console.log(`\n${red('同步未完全成功')}，请检查上述失败项。\n`);
    process.exit(1);
  }
  console.log(`\n${green('同步完成')}\n`);
}

main().catch((e) => fail(`未预期的错误：${e.stack || e.message}`));
