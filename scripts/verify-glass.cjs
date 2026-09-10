// 用 CDP 实机读回液态玻璃折射状态（AGENT.md §10.1 验证项）。
// 用法: npm run dev, 然后 node scripts/verify-glass.cjs <port>
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.argv[2] || '3006';
const URL = `http://localhost:${PORT}/#/specs`;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DP = 9333;

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DP}`,
  '--headless=new',
  '--disable-gpu',
  '--window-size=1400,900',
  '--user-data-dir=' + require('os').tmpdir() + '/cdp-glass-profile',
  '--no-first-run',
  URL,
], { stdio: 'ignore', detached: false });

const get = (path) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout ' + path)), 10000);
  http.get({ host: '127.0.0.1', port: DP, path }, (r) => {
    let d = ''; r.on('data', (c) => d += c);
    r.on('end', () => { clearTimeout(t); try { res(JSON.parse(d)); } catch (e) { rej(e); } });
  }).on('error', (e) => { clearTimeout(t); rej(e); });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let target = null;
  for (let i = 0; i < 40; i++) {
 await sleep(500);
    try {
  const list = await get('/json/list');
  target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) { /* still booting */ }
  }
  if (!target) throw new Error('no CDP target');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));

  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true,
    });
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text };
    return r.result?.result?.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  // 给 idle 回调 + 折射建图充分时间
  await sleep(6000);

  const report = await evalJs(`(() => {
    const el = document.querySelector('.liquid-glass');
    const cs = el ? getComputedStyle(el) : null;
    const H = window.Hyalite;
    return {
      url: location.href,
      engineLoaded: !!H,
      version: H && H.version,
 supported: H ? H.supported() : null,
      dataGlass: document.documentElement.dataset.glass || null,
 dataHyalite: document.documentElement.dataset.hyalite || null,
      innerWidth: window.innerWidth,
      capsuleCount: document.querySelectorAll('.liquid-glass').length,
      inlineHyaliteVar: el ? (el.style.getPropertyValue('--hyalite') || '(empty)') : null,
      computedBackdrop: cs ? cs.backdropFilter : null,
      cssSupportsUrl: CSS.supports('backdrop-filter', 'url(#x)'),
      uaBrands: (navigator.userAgentData && navigator.userAgentData.brands || []).map(b => b.brand),
      info: H && H.info ? H.info() : null,
    };
  })()`);

  console.log(JSON.stringify(report, (k, v) =>
    (k === 'map' || k === 'mapInner') && typeof v === 'string' ? v.slice(0, 40) + `…(${v.length} chars)` : v, 2));

  ws.close();
  try { chrome.kill(); } catch (e) {}
  process.exit(0);
})().catch((e) => {
  console.error('FAIL:', e.message);
  try { chrome.kill(); } catch (_) {}
  process.exit(1);
});
