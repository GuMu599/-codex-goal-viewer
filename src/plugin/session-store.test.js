import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SessionStore } from './session-store.js';

test('tracks the active Codex session and structured progress', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'goal-viewer-session-'));
  const store = new SessionStore({ dataDir });

  await store.markActive({ sessionId: 'thread-1', cwd: 'C:\\repo', updatedAt: 10 });
  await store.reportProgress({ sessionId: 'thread-1', completed: 2, total: 5, updatedAt: 20 });

  assert.deepEqual(await store.readActive(), {
    sessionId: 'thread-1',
    cwd: 'C:\\repo',
    transcriptPath: null,
    updatedAt: 20,
  });
  assert.deepEqual(await store.readSession('thread-1'), {
    sessionId: 'thread-1',
    cwd: 'C:\\repo',
    transcriptPath: null,
    progress: { completed: 2, total: 5 },
    updatedAt: 20,
  });
});

test('rejects impossible progress and stale updates', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'goal-viewer-session-'));
  const store = new SessionStore({ dataDir });

  await assert.rejects(
    store.reportProgress({ sessionId: 'thread-1', completed: 3, total: 2 }),
    /completed must be between 0 and total/,
  );

  await store.reportProgress({ sessionId: 'thread-1', completed: 2, total: 4, updatedAt: 20 });
  await store.reportProgress({ sessionId: 'thread-1', completed: 1, total: 4, updatedAt: 10 });
  assert.deepEqual((await store.readSession('thread-1')).progress, { completed: 2, total: 4 });
});
