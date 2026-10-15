import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGoalResponse } from './protocol.js';

test('extracts initial Goal from thread/goal/get response', () => {
  assert.deepEqual(extractGoalResponse({ id: 4, result: { goal: { status: 'active', tokensUsed: 3 } } }, 4), { status: 'active', tokensUsed: 3 });
  assert.equal(extractGoalResponse({ id: 4, result: { goal: null } }, 4), null);
});
