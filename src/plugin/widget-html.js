import { readFileSync } from 'node:fs';

const widgetScript = readFileSync(new URL('./widget.js', import.meta.url), 'utf8');

export const WIDGET_URI = 'ui://codex-goal-viewer/progress.html';

export const WIDGET_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--color-text-primary, #1d1d1f); background: var(--color-background-primary, transparent); }
    .panel { width: 100%; min-width: 240px; border-top: 3px solid #30b46c; background: var(--color-background-primary, rgba(255,255,255,.96)); }
    .compact { display: none; min-height: 42px; padding: 11px 14px 8px; overflow: hidden; font-size: 12px; font-weight: 650; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
    .metrics { display: grid; gap: 0; }
    .metrics > div { display: grid; grid-template-columns: minmax(84px, 1fr) auto; align-items: center; min-height: 60px; padding: 12px 16px; border-bottom: 1px solid var(--color-border-secondary, rgba(127,127,127,.18)); }
    .metrics strong { font-size: 18px; font-variant-numeric: tabular-nums; letter-spacing: 0; }
    .metric-label { color: var(--color-text-secondary, #68686d); font-size: 12px; }
    .progress-block { grid-template-columns: minmax(84px, 1fr) minmax(72px, 1.4fr) auto !important; gap: 12px; }
    .progress-track { height: 7px; overflow: hidden; border-radius: 4px; background: var(--color-background-secondary, rgba(127,127,127,.16)); }
    .progress-track span { display: block; height: 100%; border-radius: inherit; background: #30b46c; transition: width 300ms ease; }
    .toggle { display: grid; width: 100%; height: 30px; place-items: center; border: 0; color: var(--color-text-secondary, #68686d); background: transparent; font-size: 17px; cursor: pointer; }
    .toggle:hover { color: var(--color-text-primary, #1d1d1f); background: var(--color-background-secondary, rgba(127,127,127,.08)); }
    .toggle:focus-visible { outline: 2px solid #0a84ff; outline-offset: -2px; }
    .is-collapsed .compact { display: block; }
    .is-collapsed .metrics { display: none; }
    @media (prefers-reduced-motion: reduce) { .progress-track span { transition: none; } }
    @media (prefers-color-scheme: dark) {
      body { color: var(--color-text-primary, #f5f5f7); }
      .panel { background: var(--color-background-primary, rgba(28,28,30,.96)); }
    }
  </style>
</head>
<body><div id="app"></div><script type="module">${widgetScript}</script></body>
</html>`;
