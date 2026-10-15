import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('capture-session reads Codex hook JSON from stdin and injects structured context', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'codex-goal-viewer-hook-'));
  const child = spawn(process.execPath, ['hooks/capture-session.mjs', '--inject'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: { ...process.env, GOAL_VIEWER_DATA_DIR: dataDir },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const output = [];
  const errors = [];
  child.stdout.on('data', (chunk) => output.push(chunk));
  child.stderr.on('data', (chunk) => errors.push(chunk));
  child.stdin.end(JSON.stringify({
    session_id: 'hook-test-session',
    cwd: 'C:\\temp',
    transcript_path: 'C:\\temp\\transcript.jsonl',
    hook_event_name: 'session_start',
  }));
  const exitCode = await new Promise((resolve) => child.once('close', resolve));
  try {
    assert.equal(exitCode, 0, Buffer.concat(errors).toString('utf8'));
    const result = JSON.parse(Buffer.concat(output).toString('utf8'));
    assert.equal(result.hookSpecificOutput.hookEventName, 'session_start');
    assert.match(result.hookSpecificOutput.additionalContext, /goal_progress\.report/);
    const session = JSON.parse(await readFile(join(dataDir, 'sessions', 'hook-test-session.json'), 'utf8'));
    assert.equal(session.sessionId, 'hook-test-session');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
