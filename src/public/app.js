export function formatCompactState(state) {
  const percent = state.progress?.available ? `${state.progress.percent}%` : '—';
  return `Goal ${percent} · Token ${state.tokens?.formatted ?? '暂无数据'} · 剩余 ${state.eta?.label ?? '暂无估算'}`;
}

export function renderState(state, expanded = true) {
  const percent = state.progress?.available ? `${state.progress.percent}%` : '暂无可计算进度';
  const status = state.statusLabel ?? '';
  return `<main class="panel ${expanded ? 'is-expanded' : 'is-collapsed'}" data-status="${state.goalStatus ?? 'unknown'}">
  <div class="summary" aria-live="polite"><span class="status">${status}</span><span class="compact">${formatCompactState(state)}</span></div>
  <section class="metrics" aria-label="Goal 状态">
    <div class="progress-block"><div class="metric-label">Goal 进度</div><div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.progress?.available ? state.progress.percent : 0}"><span style="width:${state.progress?.available ? state.progress.percent : 0}%"></span></div><strong>${percent}</strong></div>
    <div><span class="metric-label">Token</span><strong>${state.tokens?.formatted ?? '暂无数据'}</strong></div>
    <div><span class="metric-label">预计剩余</span><strong>${state.eta?.label ?? '暂无估算'}</strong></div>
  </section>
  <button class="toggle" type="button" aria-expanded="${expanded}">${expanded ? '收起 ▲' : '展开 ▼'}</button>
</main>`;
}

export function mountPanel(root = document) {
  const mount = root.querySelector('#app');
  let expanded = localStorage.getItem('goal-viewer-expanded') !== 'false';
  let state = { goalStatus: 'unknown', progress: { available: false }, tokens: { formatted: '暂无数据' }, eta: { label: '暂无估算' } };
  const render = () => { mount.innerHTML = renderState(state, expanded); mount.querySelector('.toggle').addEventListener('click', () => { expanded = !expanded; localStorage.setItem('goal-viewer-expanded', String(expanded)); render(); }); };
  const update = (next) => { state = next; render(); };
  render();
  const source = new EventSource('/api/events');
  source.onmessage = (event) => { try { update(JSON.parse(event.data)); } catch { /* retry via polling */ } };
  fetch('/api/state').then((response) => response.json()).then(update).catch(() => {});
  return { update, close: () => source.close() };
}

if (typeof document !== 'undefined') mountPanel();
