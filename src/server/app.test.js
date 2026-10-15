import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StateStore } from '../domain/state-store.js';
import { createGoalServer } from './app.js';

test('serves view JSON, accepts valid events, rejects invalid events, and serves panel', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'codex-goal-server-'));
  const store = await StateStore.open({ dataDir: dir, threadId: 'thread-1' });
  const app = createGoalServer({ store });
  const address = await app.listen();
  t.after(() => app.close());
  const base = `http://127.0.0.1:${address.port}`;
  const initial = await fetch(`${base}/api/state`);
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).progress.available, false);
  const invalid = await fetch(`${base}/api/events`, { method: 'POST', body: '{bad' });
  assert.equal(invalid.status, 400);
  const foreign = await fetch(`${base}/api/state`, { headers: { origin: 'https://example.com' } });
  assert.equal(foreign.status, 403);
  const valid = await fetch(`${base}/api/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'thread/goal/updated', params: { threadId: 'thread-1', goal: { status: 'active', tokensUsed: 10, timeUsedSeconds: 60, updatedAt: 1 } } }) });
  assert.equal(valid.status, 202);
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Codex Goal Viewer/);
});
