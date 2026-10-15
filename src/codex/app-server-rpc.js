import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const NON_TERMINAL_GOAL_STATUSES = new Set([
  'active', 'paused', 'blocked', 'usageLimited', 'budgetLimited',
]);

export class CodexAppServerRpc {
  constructor({ codexBin = 'codex', spawnProcess = spawn, onError = () => {}, timeoutMs = 15000 } = {}) {
    this.codexBin = codexBin;
    this.spawnProcess = spawnProcess;
    this.onError = onError;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.child = null;
    this.ready = null;
  }

  async connect() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      this.child = this.spawnProcess(this.codexBin, ['app-server', '--stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      });
      const lines = createInterface({ input: this.child.stdout });
      lines.on('line', (line) => this.handleLine(line));
      this.child.stderr?.on('data', (chunk) => {
        const message = String(chunk).trim();
        if (message) this.onError(new Error(message));
      });
      this.child.once('error', reject);
      this.child.once('close', () => {
        const error = new Error('Codex App Server closed');
        for (const pending of this.pending.values()) pending.reject(error);
        this.pending.clear();
        this.child = null;
        this.ready = null;
      });

      this.send('initialize', {
        clientInfo: { name: 'codex-goal-viewer', title: 'Codex Goal Viewer', version: '0.2.0' },
        capabilities: { experimentalApi: true },
      }).then(() => {
        this.write({ method: 'initialized' });
        resolve();
      }, reject);
    });
    return this.ready;
  }

  write(message) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  send(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`App Server request timed out: ${method}`));
      }, this.timeoutMs);
      timer.unref?.();
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.write({ id, method, params });
    });
  }

  handleLine(line) {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id === undefined || !this.pending.has(message.id)) return;
    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message ?? 'App Server request failed'));
    else pending.resolve(message.result);
  }

  async request(method, params = {}) {
    await this.connect();
    return this.send(method, params);
  }

  async getGoal(threadId) {
    if (!threadId) return null;
    const result = await this.request('thread/goal/get', { threadId });
    return result?.goal ?? null;
  }

  async findActiveGoal({ limit = 50 } = {}) {
    const result = await this.request('thread/list', { limit, sortKey: 'created_at' });
    for (const thread of result?.data ?? []) {
      try {
        const goal = (await this.request('thread/goal/get', { threadId: thread.id }))?.goal;
        if (goal && NON_TERMINAL_GOAL_STATUSES.has(goal.status)) return goal;
      } catch {
        // Threads without Goal state are expected.
      }
    }
    return null;
  }

  close() {
    this.child?.kill();
  }
}
