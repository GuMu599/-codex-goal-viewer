import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
  '.agents/plugins/marketplace.json',
  '.codex-plugin/plugin.json',
  '.mcp.json',
  'hooks/hooks.json',
  'dist/hook.mjs',
  'dist/server.mjs',
  'dist/widget.js',
];

for (const file of requiredFiles) {
  await readFile(resolve(root, file));
}

const mcpConfig = JSON.parse(await readFile(resolve(root, '.mcp.json'), 'utf8'));
const serverConfig = mcpConfig.mcpServers?.goal_viewer;
if (!serverConfig || serverConfig.cwd !== '.' || serverConfig.args?.[0] !== 'dist/server.mjs') {
  throw new Error('goal_viewer must start from the plugin root with dist/server.mjs');
}
if (JSON.stringify(mcpConfig).includes('${PLUGIN_ROOT}')) {
  throw new Error('legacy .mcp.json cannot contain an unexpanded ${PLUGIN_ROOT} placeholder');
}

const child = spawn('node', ['dist/server.mjs'], {
  cwd: root,
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true,
  env: { ...process.env, GOAL_VIEWER_DATA_DIR: resolve(root, 'tmp', 'package-verification') },
});
const lines = createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 1;
let stderr = '';

child.stderr.on('data', (chunk) => { stderr += String(chunk); });
lines.on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function request(method, params = {}) {
  const id = nextId++;
  return new Promise((resolveRequest, rejectRequest) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectRequest(new Error(`MCP request timed out: ${method}\n${stderr}`));
    }, 10_000);
    timer.unref?.();
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolveRequest(value); },
      reject: (error) => { clearTimeout(timer); rejectRequest(error); },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

try {
  await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'codex-goal-viewer-verifier', version: '0.2.0' },
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

  const tools = await request('tools/list');
  const toolNames = new Set(tools.tools?.map((tool) => tool.name));
  for (const name of ['goal_progress.open', 'goal_progress.read', 'goal_progress.report']) {
    if (!toolNames.has(name)) throw new Error(`missing MCP tool: ${name}`);
  }
  const openTool = tools.tools.find((tool) => tool.name === 'goal_progress.open');
  const entrypoints = openTool?._meta?.['openai/ui']?.entrypoints ?? [];
  if (!entrypoints.some((entrypoint) => entrypoint.type === 'thread')) {
    throw new Error('goal_progress.open is missing the thread entrypoint');
  }

  const resources = await request('resources/list');
  const panel = resources.resources?.find((resource) => resource.uri === 'ui://codex-goal-viewer/progress.html');
  if (panel?.mimeType !== 'text/html;profile=mcp-app') {
    throw new Error('Goal progress MCP App resource is missing or has the wrong MIME type');
  }

  process.stdout.write('Plugin package verification passed.\n');
} finally {
  lines.close();
  child.kill();
}
