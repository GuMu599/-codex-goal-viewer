import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildViewModel } from '../domain/progress.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

export function createGoalServer({ store, host = '127.0.0.1', port = 0 } = {}) {
  if (!store) throw new Error('store is required');
  const clients = new Set();
  const view = () => buildViewModel(store.readState());
  const broadcast = () => { const payload = `data: ${JSON.stringify(view())}\n\n`; for (const response of clients) response.write(payload); };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const origin = request.headers.origin;
    if (origin && !['http://127.0.0.1', 'http://localhost'].some((allowed) => origin === allowed || origin.startsWith(`${allowed}:`))) return json(response, 403, { error: 'local origin required' });
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/api/state') return json(response, 200, view());
    if (request.method === 'GET' && url.pathname === '/api/events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      response.write(`data: ${JSON.stringify(view())}\n\n`); clients.add(response); request.on('close', () => clients.delete(response)); return;
    }
    if (request.method === 'POST' && url.pathname === '/api/events') {
      try {
        const event = JSON.parse(await readBody(request));
        await store.applyEvent(event); broadcast(); return json(response, 202, { ok: true, state: view() });
      } catch (error) { return json(response, 400, { error: error.message }); }
    }
    if (request.method === 'GET') {
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const file = normalize(join(PUBLIC_DIR, relative));
      if (!file.startsWith(PUBLIC_DIR)) return json(response, 404, { error: 'not found' });
      try { response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }); createReadStream(file).pipe(response); return; } catch { return json(response, 404, { error: 'not found' }); }
    }
    return json(response, 405, { error: 'method not allowed' });
  });
  return { server, listen: () => new Promise((resolve) => server.listen(port, host, () => resolve(server.address()))), close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

function json(response, status, value) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); }
function readBody(request) { return new Promise((resolve, reject) => { let data = ''; request.on('data', (chunk) => { data += chunk; if (data.length > 1_000_000) request.destroy(new Error('request too large')); }); request.on('end', () => resolve(data)); request.on('error', reject); }); }
