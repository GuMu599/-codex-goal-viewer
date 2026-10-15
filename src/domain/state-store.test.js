import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StateStore } from './state-store.js';

async function tempStore(threadId = 'thread-1') {
  const dir = await mkdtemp(join(tmpdir(), 'codex-goal-viewer-'));
  return { dir, store: await StateStore.open({ dataDir: dir, threadId }) };
}

test('applies Goal, Plan, and token events for the selected thread', async () => {
  const { store } = await tempStore();
  await store.applyEvent({ method: 'thread/goal/updated', params: { threadId: 'thread-1', goal: { status: 'active', tokensUsed: 50, timeUsedSeconds: 10, updatedAt: 2 } } });
  await store.applyEvent({ method: 'turn/plan/updated', params: { threadId: 'thread-1', turnId: 'turn-1', plan: [{ status: 'completed', step: 'one' }] } });
  await store.applyEvent({ method: 'thread/tokenUsage/updated', params: { threadId: 'thread-1', turnId: 'turn-1', tokenUsage: { total: { totalTokens: 80 } } } });
  const state = store.readState();
  assert.equal(state.goal.tokensUsed, 50);
  assert.equal(state.plan.length, 1);
  assert.equal(state.tokenUsage.total.totalTokens, 80);
});

test('ignores events from other threads and stale Goal updates', async () => {
  const { store } = await tempStore();
  await store.applyEvent({ method: 'thread/goal/updated', params: { threadId: 'other', goal: { status: 'active', updatedAt: 9 } } });
  await store.applyEvent({ method: 'thread/goal/updated', params: { threadId: 'thread-1', goal: { status: 'active', tokensUsed: 100, updatedAt: 10 } } });
  await store.applyEvent({ method: 'thread/goal/updated', params: { threadId: 'thread-1', goal: { status: 'paused', tokensUsed: 1, updatedAt: 9 } } });
  assert.equal(store.readState().goal.tokensUsed, 100);
});

test('recovers state from append-only event log and tolerates malformed lines', async () => {
  const { dir, store } = await tempStore();
  await store.applyEvent({ method: 'thread/goal/updated', params: { threadId: 'thread-1', goal: { status: 'active', tokensUsed: 7, updatedAt: 1 } } });
  const logPath = join(dir, 'thread-1', 'events.jsonl');
  await (await import('node:fs/promises')).appendFile(logPath, '\nnot-json\n');
  const restored = await StateStore.open({ dataDir: dir, threadId: 'thread-1' });
  assert.equal(restored.readState().goal.tokensUsed, 7);
  const raw = await readFile(logPath, 'utf8');
  assert.match(raw, /thread\/goal\/updated/);
});
