import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildViewModel,
  calculateEta,
  calculateProgress,
  formatTokenTotal,
  selectTokenTotal,
} from './progress.js';

test('calculates progress from completed structured plan steps only', () => {
  assert.deepEqual(calculateProgress([
    { status: 'completed', step: 'one' },
    { status: 'inProgress', step: 'two' },
    { status: 'pending', step: 'three' },
  ]), { available: true, completed: 1, total: 3, percent: 33 });
});

test('does not invent progress without a plan and reports completed Goal as 100%', () => {
  assert.deepEqual(calculateProgress([]), { available: false, completed: 0, total: 0, percent: null });
  assert.deepEqual(calculateProgress([], 'complete'), { available: true, completed: 1, total: 1, percent: 100 });
});

test('prefers Goal tokens over thread tokens', () => {
  assert.equal(selectTokenTotal({ tokensUsed: 120 }, { total: { totalTokens: 900 } }), 120);
  assert.equal(selectTokenTotal({}, { total: { totalTokens: 900 } }), 900);
  assert.equal(selectTokenTotal({}, null), null);
});

test('calculates a rounded rough ETA range and suppresses zero-progress estimates', () => {
  assert.deepEqual(calculateEta(600, { available: true, percent: 40 }), { available: true, label: '约 11–19 分钟' });
  assert.deepEqual(calculateEta(7200, { available: true, percent: 10 }), { available: true, label: '约 13.5–22.5 小时' });
  assert.deepEqual(calculateEta(600, { available: true, percent: 0 }), { available: false, label: '暂无估算' });
  assert.deepEqual(calculateEta(600, { available: false, percent: null }), { available: false, label: '暂无估算' });
  assert.deepEqual(calculateEta(600, { available: true, percent: 100 }, 'complete'), { available: true, label: '已完成' });
});

test('formats token totals for compact display', () => {
  assert.equal(formatTokenTotal(126400), '126,400');
  assert.equal(formatTokenTotal(1200000), '1.2M');
  assert.equal(formatTokenTotal(null), '暂无数据');
});

test('builds the three-metric view model', () => {
  const view = buildViewModel({
    goal: { status: 'active', tokensUsed: 126400, timeUsedSeconds: 600 },
    plan: [{ status: 'completed' }, { status: 'pending' }],
    tokenUsage: null,
  });
  assert.equal(view.progress.percent, 50);
  assert.equal(view.tokens.formatted, '126,400');
  assert.equal(view.eta.label, '约 8–13 分钟');
});
