import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workspaceReturnTarget } from '../src/lib/telemetryReturn.ts';

const searchFor = (next) => `?${new URLSearchParams({ next })}`;

test('shared scene, channels, plus signs, layout and fragments survive login', () => {
  const target = '/session/80%E5%AE%9A%E9%80%9F%E6%BB%91%E8%A1%8C?channels=G+Force+Lat%2CG+Force+Long&layout=W1siZ3JhcGgiLDAsMF1d%3D%3D#view';
  assert.equal(workspaceReturnTarget(searchFor(target)), target);
  assert.equal(workspaceReturnTarget(searchFor('/?sort=date')), '/?sort=date');
});

test('external, malformed, login-loop and API targets fall back to the workspace', () => {
  for (const target of [
    'https://example.com/session/test', '//example.com/session/test',
    '/\\example.com/session/test', '/session/../../login', '/login?next=/login',
    '/auth/logout', '/api/sessions', '/session/', '/session/a/b',
    '/session/%2F%2Fexample.com', '/session/%5Cexample.com',
    '/session/%0d%0aLocation:evil', '/session/%', '/session/a\n',
    '/session/%2e%2e', '/session/' + 'x'.repeat(8192),
  ]) assert.equal(workspaceReturnTarget(searchFor(target)), '/', target);
  assert.equal(workspaceReturnTarget(''), '/');
});
