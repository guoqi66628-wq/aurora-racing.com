#!/usr/bin/env node
/**
 * 部署前校验：确认构建产物引用的每个 CDN 资源都真实可达。
 *
 * 解决的问题：本地开发不走 CDN，新增图片忘记同步到 OSS 时，
 * 本地一切正常但线上 404，且只有用户能发现。这个脚本把问题拦在部署前。
 *
 * 用法：npm run build 之后执行 node scripts/verify-assets.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CONCURRENCY = 8;

// 非 TTY（CI 日志、重定向到文件）下不输出颜色转义，避免乱码
const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (c, s) => (USE_COLOR ? `\x1b[${c}m${s}\x1b[0m` : s);
const dim = (s) => color('2', s);
const green = (s) => color('32', s);
const red = (s) => color('31', s);
const cyan = (s) => color('36', s);
const yellow = (s) => color('33', s);

function readDistFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) readDistFiles(full, out);
    else if (/\.(js|css|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * 带重试的探测。网络抖动会让并发请求偶发失败，
 * 若不重试就会把实际存在的资源误报为缺失，让部署卡在假问题上。
 * 只对连接失败（0）和 5xx 重试；404 是确定性结果，直接返回。
 */
async function headWithRetry(url, attempts = 3) {
  let status = 0;
  for (let i = 0; i < attempts; i++) {
    status = await head(url);
    if (status === 200 || (status >= 400 && status < 500)) return status;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  return status;
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error(`\n${red('✗')} 找不到 dist/，请先运行 npm run build\n`);
    process.exit(1);
  }

  const files = readDistFiles(DIST);
  const blob = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  // CDN 域名从产物里反推，保证校验的就是实际构建出来的地址
  const domains = [...new Set(blob.match(/https:\/\/cdn\.[A-Za-z0-9.-]+/g) || [])];
  if (domains.length === 0) {
    console.log(`\n${yellow('!')} 产物中未发现 CDN 域名，可能是以本地模式构建的，跳过校验。\n`);
    return;
  }
  if (domains.length > 1) {
    console.log(`\n${yellow('!')} 产物中出现多个 CDN 域名，请确认是否配置有误：`);
    for (const d of domains) console.log(`    ${d}`);
  }
  const base = domains[0];

  // 收集两类引用：产物中的绝对 URL，以及运行时由 getAssetUrl 拼接的相对路径
  const abs = (blob.match(/https:\/\/cdn\.[A-Za-z0-9.-]+\/[A-Za-z0-9/_.-]+\.[a-z0-9]{2,5}/g) || [])
    .map((u) => u.replace(base, ''));
  const rel = (blob.match(/["'`](\/images\/[A-Za-z0-9/_.-]+\.[a-z0-9]{2,5})["'`]/g) || [])
    .map((m) => m.slice(1, -1));

  const paths = [...new Set([...abs, ...rel])].sort();
  if (paths.length === 0) {
    console.log(`\n${yellow('!')} 未从产物中解析出任何资源路径。\n`);
    return;
  }

  console.log(`\n${cyan('部署前资源校验')}`);
  console.log(dim(`  CDN    : ${base}`));
  console.log(dim(`  待校验 : ${paths.length} 个资源\n`));

  const missing = [];
  let checked = 0;
  const queue = [...paths];

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const p = queue.shift();
        const status = await headWithRetry(base + p);
        checked++;
        // 非 TTY（CI 日志、管道）下 \r 不生效，会刷出满屏进度，故只在终端里做原地刷新
        if (process.stdout.isTTY) {
          process.stdout.write(`\r  已检查 ${checked}/${paths.length}`);
        }
        if (status !== 200) missing.push({ path: p, status });
      }
    })
  );
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');

  if (missing.length === 0) {
    console.log(`  ${green('✓')} 全部 ${paths.length} 个资源在 CDN 上可达，可以部署\n`);
    return;
  }

  console.log(`  ${red(`✗ ${missing.length} 个资源在 CDN 上不可达：`)}\n`);
  for (const m of missing.sort((a, b) => a.path.localeCompare(b.path))) {
    const label = m.status === 0 ? '连接失败' : m.status;
    console.log(`    ${red(String(label).padEnd(9))} ${m.path}`);
  }
  console.log(
    `\n  ${yellow('多半是新增图片没有同步到 OSS。执行以下命令后重试：')}\n` +
      `    npm run deploy:assets\n`
  );
  process.exit(1);
}

main();
