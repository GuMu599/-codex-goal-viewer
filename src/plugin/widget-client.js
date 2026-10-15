import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

const root = document.querySelector('#app');
const app = new App(
  { name: 'Codex Goal Viewer', version: '0.2.0' },
  { serverTools: {} },
  { autoResize: true },
);

let expanded = true;
let state = {
  progress: { available: false, percent: null },
  tokens: { formatted: '暂无数据' },
  eta: { label: '暂无估算' },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function compactLine() {
  const percent = state.progress?.available ? `${state.progress.percent}%` : '暂无数据';
  return `Goal ${percent} · Token ${state.tokens?.formatted ?? '暂无数据'} · 剩余 ${state.eta?.label ?? '暂无估算'}`;
}

function render() {
  const percent = state.progress?.available ? `${state.progress.percent}%` : '暂无数据';
  const width = state.progress?.available ? state.progress.percent : 0;
  root.innerHTML = `<main class="panel ${expanded ? 'is-expanded' : 'is-collapsed'}">
    <div class="compact" aria-live="polite">${escapeHtml(compactLine())}</div>
    <section class="metrics" aria-label="Goal 状态">
      <div class="progress-block">
        <span class="metric-label">Goal 进度</span>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${width}"><span style="width:${width}%"></span></div>
        <strong>${escapeHtml(percent)}</strong>
      </div>
      <div><span class="metric-label">Token 消耗</span><strong>${escapeHtml(state.tokens?.formatted ?? '暂无数据')}</strong></div>
      <div><span class="metric-label">预计剩余</span><strong>${escapeHtml(state.eta?.label ?? '暂无估算')}</strong></div>
    </section>
    <button class="toggle" type="button" aria-expanded="${expanded}" aria-label="${expanded ? '收起' : '展开'}" title="${expanded ? '收起' : '展开'}">${expanded ? '⌃' : '⌄'}</button>
  </main>`;
  root.querySelector('.toggle').addEventListener('click', () => {
    expanded = !expanded;
    render();
  });
}

function update(next) {
  if (next && typeof next === 'object') {
    state = next;
    render();
  }
}

function applyHostContext(context) {
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
}

async function refresh() {
  try {
    const result = await app.callServerTool({ name: 'goal_progress.read', arguments: {} });
    if (!result.isError) update(result.structuredContent);
  } catch {
    // The next interval retries after host or MCP restarts.
  }
}

async function main() {
  app.ontoolresult = (result) => update(result.structuredContent);
  app.addEventListener('hostcontextchanged', applyHostContext);
  render();
  await app.connect();
  applyHostContext(app.getHostContext());
  await refresh();
  setInterval(refresh, 2500);
}

main();
