#!/usr/bin/env node
/**
 * 刷新七牛 CDN 缓存
 * 用于更新文件后让 CDN 节点重新拉取最新版本
 */

const qiniu = require('qiniu');

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (c, s) => (USE_COLOR ? `\x1b[${c}m${s}\x1b[0m` : s);
const green = (s) => color('32', s);
const red = (s) => color('31', s);
const cyan = (s) => color('36', s);
const dim = (s) => color('2', s);

function fail(msg) {
  console.error(`\n${red('✗')} ${msg}\n`);
  process.exit(1);
}

async function refreshCdn(cdnManager, urls) {
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

async function main() {
  const AK = process.env.QINIU_ACCESS_KEY;
  const SK = process.env.QINIU_SECRET_KEY;
  const CDN_DOMAIN = process.env.QINIU_CDN_DOMAIN || process.env.VITE_CDN_URL;

  if (!AK || !SK) {
    fail('缺少七牛凭证：QINIU_ACCESS_KEY / QINIU_SECRET_KEY');
  }

  if (!CDN_DOMAIN) {
    fail('缺少 CDN 域名：QINIU_CDN_DOMAIN 或 VITE_CDN_URL');
  }

  const argv = process.argv.slice(2);
  let urlsToRefresh = [];

  // 如果命令行传入了具体 URL，就刷新这些
  if (argv.length > 0 && !argv[0].startsWith('-')) {
    urlsToRefresh = argv;
  } else {
    // 默认刷新首页和常用资源
    const base = CDN_DOMAIN.replace(/\/$/, '');
    urlsToRefresh = [
      `${base}/index.html`,
      `${base}/`,
    ];
  }

  console.log(`\n${cyan('刷新 CDN 缓存')}`);
  console.log(dim(`  域名 : ${CDN_DOMAIN}`));
  console.log(dim(`  URL 数量 : ${urlsToRefresh.length}`));
  console.log('');

  for (const url of urlsToRefresh) {
    console.log(`  ${dim(url)}`);
  }

  const mac = new qiniu.auth.digest.Mac(AK, SK);
  const cdnManager = new qiniu.cdn.CdnManager(mac);

  try {
    // 七牛单次刷新上限 100 条 URL
    for (let i = 0; i < urlsToRefresh.length; i += 100) {
      const batch = urlsToRefresh.slice(i, i + 100);
      await refreshCdn(cdnManager, batch);
    }
    console.log(`\n${green('✓')} 已提交 ${urlsToRefresh.length} 条刷新请求`);
    console.log(dim('  刷新生效需要 5-10 分钟\n'));
  } catch (e) {
    fail(`刷新失败：${e.message}`);
  }
}

main().catch((e) => fail(`未预期的错误：${e.stack || e.message}`));
