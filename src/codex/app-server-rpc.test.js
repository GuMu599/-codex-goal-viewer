import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { CodexAppServerRpc } from './app-server-rpc.js';

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { write() {} };
  child.kill = () => {};
  return child;
}

test('findActiveGoal returns the newest active Goal', async () => {
  const rpc = new CodexAppServerRpc({ spawnProcess: fakeChild });
  rpc.request = async (method, params) => {
    if (method === 'thread/list') return { data: [{ id: 'new' }, { id: 'old' }] };
    if (params.threadId === 'new') return { goal: { threadId: 'new', status: 'active' } };
    return { goal: { threadId: 'old', status: 'complete' } };
  };

  assert.deepEqual(await rpc.findActiveGoal(), { threadId: 'new', status: 'active' });
});
