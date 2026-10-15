import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactState, renderState } from './app.js';

test('renders expanded and collapsed three-metric summaries', () => {
  const state = { progress: { available: true, percent: 40 }, tokens: { formatted: '126,400' }, eta: { label: '约 25–45 分钟' }, goalStatus: 'active' };
  assert.match(formatCompactState(state), /Goal 40%.*Token 126,400.*约 25–45 分钟/);
  assert.match(renderState(state, false), /aria-expanded="false"/);
  assert.match(renderState(state, true), /aria-expanded="true"/);
});

test('renders unavailable metric labels without exposing step data', () => {
  const html = renderState({ progress: { available: false, percent: null }, tokens: { formatted: '暂无数据' }, eta: { label: '暂无估算' }, goalStatus: 'active' }, true);
  assert.match(html, /暂无可计算进度/);
  assert.match(html, /暂无数据/);
  assert.match(html, /暂无估算/);
  assert.doesNotMatch(html, /step|reasoning|command/i);
});
