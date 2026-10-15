import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { extractGoalResponse, parseAppServerLine } from './protocol.js';

const FORWARDED = new Set(['thread/goal/updated', 'turn/plan/updated', 'thread/tokenUsage/updated']);

export function startAppServerBridge({ store, threadId, codexBin = 'codex', onError = () => {} } = {}) {
  if (!store || !threadId) throw new Error('store and threadId are required');
  const child = spawn(codexBin, ['app-server', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const lines = createInterface({ input: child.stdout });
  let nextId = 1;
  let initializeId;
  const pending = new Map();
  const send = (method, params) => { const id = nextId++; pending.set(id, method); child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`); return id; };
  const sendNotification = (method, params) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  lines.on('line', async (line) => {
    const message = parseAppServerLine(line);
    if (!message) return;
    if (message.id === initializeId && message.result) { sendNotification('initialized'); send('thread/goal/get', { threadId }); return; }
    if (message.id && pending.get(message.id) === 'thread/goal/get') {
      const goal = extractGoalResponse(message, message.id);
      if (goal) try { await store.applyEvent({ method: 'thread/goal/updated', params: { threadId, goal } }); } catch (error) { onError(error); }
      pending.delete(message.id); return;
    }
    if (FORWARDED.has(message.method)) {
      try { await store.applyEvent({ method: message.method, params: message.params }); } catch (error) { onError(error); }
    }
  });
  child.stderr.on('data', (chunk) => { const text = String(chunk).trim(); if (text) onError(new Error(text)); });
  child.on('error', onError);
  initializeId = nextId;
  send('initialize', { clientInfo: { name: 'codex-goal-viewer', title: 'Codex Goal Viewer', version: '0.1.0' }, capabilities: { experimentalApi: true } });
  return { child, close: () => new Promise((resolve) => { lines.close(); child.once('close', resolve); child.kill(); }) };
}
