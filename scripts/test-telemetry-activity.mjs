import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../deploy/i3pro-lowmem/activity.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function start(fetcher = async () => ({ status: 204 }), origin = 'https://telemetry.aurora-racing.com') {
  const events = {}, timers = new Map(), calls = [];
  let serial = 0;
  runInNewContext(source, {
    window: { location: { origin }, addEventListener: (name, fn) => { events[name] = fn; } },
    AbortController,
    fetch: (...args) => { calls.push(args); return fetcher(...args); },
    setTimeout: (fn, delay) => { const id = ++serial; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return { events, timers, calls };
}

test('active workspace sends authenticated heartbeat and schedules one next pulse', async () => {
  const state = start();
  await tick();
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0][0], '/api/aurora/activity');
  assert.equal(state.calls[0][1].credentials, 'same-origin');
  assert.equal(state.calls[0][1].cache, 'no-store');
  assert.equal(state.timers.size, 1);
  assert.equal([...state.timers.values()][0].delay, 60000);
});

test('expired authentication stops polling', async () => {
  for (const status of [401, 403]) {
    const state = start(async () => ({ status }));
    await tick();
    assert.equal(state.timers.size, 0);
  }
});

test('network errors and busy responses retry without overlapping requests', async () => {
  for (const fetcher of [async () => { throw Error('offline'); }, async () => ({ status: 503 })]) {
    const state = start(fetcher);
    await tick();
    assert.equal(state.timers.size, 1);
  }
  let finish;
  const state = start(() => new Promise(resolve => { finish = resolve; }));
  state.events.pageshow({ persisted: true });
  assert.equal(state.calls.length, 1);
  finish({ status: 204 });
  await tick();
  assert.equal(state.timers.size, 1);
});

test('leaving stops activity and back-forward restoration resumes it', async () => {
  const state = start();
  await tick();
  state.events.pagehide();
  assert.equal(state.timers.size, 0);
  state.events.pageshow({ persisted: true });
  await tick();
  assert.equal(state.calls.length, 2);
  assert.equal(state.timers.size, 1);
});

test('local and unrelated origins do not send heartbeats', async () => {
  for (const origin of ['http://127.0.0.1:8731', 'https://example.com']) {
    const state = start(undefined, origin);
    await tick();
    assert.equal(state.calls.length, 0);
    assert.equal(state.timers.size, 0);
  }
});
