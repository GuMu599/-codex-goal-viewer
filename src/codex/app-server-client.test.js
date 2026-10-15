import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAppServerLine } from './protocol.js';

test('accepts JSON-RPC notifications and ignores malformed lines', () => {
  assert.deepEqual(parseAppServerLine('{"method":"turn/plan/updated","params":{"threadId":"t"}}'), { method: 'turn/plan/updated', params: { threadId: 't' } });
  assert.equal(parseAppServerLine('not-json'), null);
});
