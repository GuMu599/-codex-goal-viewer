import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const METHODS = new Set(['thread/goal/updated', 'turn/plan/updated', 'thread/tokenUsage/updated']);

function eventThreadId(event) { return event?.params?.threadId ?? event?.threadId ?? null; }

export class StateStore {
  static async open(options) {
    const instance = new StateStore(options);
    await instance.restore();
    return instance;
  }

  constructor({ dataDir, threadId }) {
    if (!dataDir || !threadId) throw new Error('dataDir and threadId are required');
    this.threadId = threadId;
    this.dir = join(dataDir, threadId);
    this.statePath = join(this.dir, 'state.json');
    this.eventsPath = join(this.dir, 'events.jsonl');
    this.state = { threadId, goal: null, plan: [], tokenUsage: null, revisions: {} };
  }

  async restore() {
    try { this.state = JSON.parse(await readFile(this.statePath, 'utf8')); } catch { /* replay below */ }
    try {
      const lines = (await readFile(this.eventsPath, 'utf8')).split(/\r?\n/);
      for (const line of lines) if (line.trim()) {
        try { this.applyEventInMemory(JSON.parse(line)); } catch { /* tolerate a corrupt line */ }
      }
    } catch { /* first run */ }
    await this.persist();
  }

  readState() { return structuredClone(this.state); }

  async applyEvent(event) {
    this.validateEvent(event);
    if (eventThreadId(event) !== this.threadId) return false;
    const changed = this.applyEventInMemory(event);
    if (changed) {
      await mkdir(this.dir, { recursive: true });
      await appendFile(this.eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
      await this.persist();
    }
    return changed;
  }

  validateEvent(event) {
    if (!event || !METHODS.has(event.method) || !event.params || !eventThreadId(event)) throw new Error('invalid event');
  }

  applyEventInMemory(event) {
    const p = event.params;
    if (event.method === 'thread/goal/updated') {
      const incomingAt = Number(p.goal?.updatedAt ?? 0);
      const currentAt = Number(this.state.revisions.goal ?? -1);
      if (incomingAt < currentAt) return false;
      this.state.goal = { ...p.goal, threadId: this.threadId };
      this.state.revisions.goal = incomingAt;
      return true;
    }
    if (event.method === 'turn/plan/updated') {
      const incomingAt = Number(p.updatedAt ?? Date.now());
      if (incomingAt < Number(this.state.revisions.plan ?? -1)) return false;
      this.state.plan = Array.isArray(p.plan) ? p.plan : [];
      this.state.revisions.plan = incomingAt;
      return true;
    }
    const incomingAt = Number(p.updatedAt ?? Date.now());
    if (incomingAt < Number(this.state.revisions.tokenUsage ?? -1)) return false;
    this.state.tokenUsage = p.tokenUsage ?? null;
    this.state.revisions.tokenUsage = incomingAt;
    return true;
  }

  async persist() {
    await mkdir(this.dir, { recursive: true });
    const temp = `${this.statePath}.tmp`;
    await writeFile(temp, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
    await rename(temp, this.statePath);
  }
}
