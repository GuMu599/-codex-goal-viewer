import assert from 'node:assert/strict';
import test from 'node:test';
import { GoalSnapshotService } from './snapshot-service.js';

test('builds Goal progress, token usage, and ETA from structured sources', async () => {
  const sessionStore = {
    readActive: async () => ({ sessionId: 'thread-1' }),
    readSession: async () => ({ progress: { completed: 2, total: 4 } }),
  };
  const appServer = {
    getGoal: async () => ({
      threadId: 'thread-1', status: 'active', tokensUsed: 120000,
      timeUsedSeconds: 1200, updatedAt: 42,
    }),
  };

  const service = new GoalSnapshotService({ sessionStore, appServer });
  const state = await service.read();

  assert.equal(state.threadId, 'thread-1');
  assert.equal(state.progress.percent, 50);
  assert.equal(state.tokens.formatted, '120,000');
  assert.equal(state.eta.label, '约 15–25 分钟');
});

test('falls back to the newest active Goal when no hook session exists', async () => {
  const sessionStore = {
    readActive: async () => null,
    readSession: async () => null,
  };
  const appServer = {
    findActiveGoal: async () => ({ threadId: 'thread-2', status: 'active', tokensUsed: 10 }),
  };

  const service = new GoalSnapshotService({ sessionStore, appServer });
  const state = await service.read();

  assert.equal(state.threadId, 'thread-2');
  assert.equal(state.progress.available, false);
  assert.equal(state.tokens.total, 10);
});
