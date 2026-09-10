#!/usr/bin/env node
/**
 * 清空 dist/。
 *
 * 背景：在部分 Windows 环境下（本项目路径含中文），fs.rmSync 会「静默失败」——
 * 既不抛错也不删除任何文件，导致历史产物不断堆积，部署时带上陈旧的 JS/CSS。
 * 因此这里优先调用系统命令删除，并在结束后显式校验，失败即中止构建。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const target = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(target)) process.exit(0);

function removeViaShell() {
  if (process.platform === 'win32') {
    // cmd 的 rd 对中文路径处理正常，/s 递归 /q 静默
    execFileSync('cmd', ['/c', 'rd', '/s', '/q', target], { stdio: 'ignore' });
  } else {
    execFileSync('rm', ['-rf', target], { stdio: 'ignore' });
  }
}

try {
  removeViaShell();
} catch {
  // 系统命令失败时退回 Node 实现，尽力而为，最终以下面的校验为准
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* 交由校验统一报错 */
  }
}

if (fs.existsSync(target)) {
  const left = fs.readdirSync(target);
  if (left.length > 0) {
    console.error(`\n✗ 清理 dist/ 失败，仍残留 ${left.length} 项：${left.slice(0, 5).join(', ')}`);
    console.error('  可能有程序正在占用该目录（预览服务、编辑器、资源管理器）。');
    console.error('  请关闭后重试；若持续失败，手动删除 dist/ 再执行构建。\n');
    process.exit(1);
  }
}
