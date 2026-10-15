import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('CLI replay moves state from unavailable to 50 percent to complete', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'codex-goal-cli-'));
  const child = spawn(process.execPath, ['src/cli.js', '--thread', 'smoke', '--port', '0', '--data-dir', dir], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (!child.killed) child.kill(); });
  const firstLine = await readLine(child.stdout);
  const base = firstLine.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  assert.ok(base, firstLine);
  const initial = await (await fetch(`${base}/api/state`)).json();
  assert.equal(initial.progress.available, false);
  await post(base, { method: 'thread/goal/updated', params: { threadId: 'smoke', goal: { status: 'active', tokensUsed: 126400, timeUsedSeconds: 600, updatedAt: 1 } } });
  await post(base, { method: 'turn/plan/updated', params: { threadId: 'smoke', updatedAt: 2, plan: [{ status: 'completed', step: 'one' }, { status: 'pending', step: 'two' }] } });
  const middle = await (await fetch(`${base}/api/state`)).json();
  assert.equal(middle.progress.percent, 50);
  assert.equal(middle.tokens.formatted, '126,400');
  await post(base, { method: 'thread/goal/updated', params: { threadId: 'smoke', goal: { status: 'complete', tokensUsed: 130000, timeUsedSeconds: 700, updatedAt: 3 } } });
  const complete = await (await fetch(`${base}/api/state`)).json();
  assert.equal(complete.progress.percent, 100);
  assert.equal(complete.eta.label, '已完成');
});

function post(base, event) { return fetch(`${base}/api/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) }); }
function readLine(stream) { return new Promise((resolve, reject) => { let data = ''; const onData = (chunk) => { data += chunk; const index = data.indexOf('\n'); if (index >= 0) { stream.off('data', onData); resolve(data.slice(0, index)); } }; stream.on('data', onData); stream.on('error', reject); }); }
