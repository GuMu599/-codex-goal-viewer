import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { StateStore } from './domain/state-store.js';
import { createGoalServer } from './server/app.js';

const args = parseArgs(process.argv.slice(2));
const threadId = args.thread ?? 'default';
const dataDir = args['data-dir'] ?? join(homedir(), '.codex-goal-viewer');
await mkdir(dataDir, { recursive: true });
const store = await StateStore.open({ dataDir, threadId });
const app = createGoalServer({ store, port: Number(args.port ?? 0) });
const address = await app.listen();
const url = `http://127.0.0.1:${address.port}/?thread=${encodeURIComponent(threadId)}`;
console.log(`Codex Goal Viewer listening at ${url}`);
console.log(`Thread: ${threadId}`);
console.log('POST App Server-style events to /api/events; press Ctrl+C to stop.');
process.on('SIGINT', async () => { await app.close(); process.exit(0); });

function parseArgs(values) {
  const result = {};
  for (let i = 0; i < values.length; i += 1) { const value = values[i]; if (value.startsWith('--')) result[value.slice(2)] = values[i + 1]?.startsWith('--') ? true : (values[i + 1] ?? true); }
  return result;
}
