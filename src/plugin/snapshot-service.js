import { buildViewModel } from '../domain/progress.js';

function planFromProgress(progress) {
  if (!progress || !Number.isInteger(progress.total) || progress.total <= 0) return [];
  return Array.from({ length: progress.total }, (_, index) => ({
    status: index < progress.completed ? 'completed' : 'pending',
  }));
}

export class GoalSnapshotService {
  constructor({ sessionStore, appServer }) {
    this.sessionStore = sessionStore;
    this.appServer = appServer;
  }

  async read(sessionId = null) {
    const active = sessionId ? { sessionId } : await this.sessionStore.readActive();
    let goal = null;
    if (active?.sessionId) {
      try { goal = await this.appServer.getGoal(active.sessionId); } catch { /* fallback below */ }
    }
    if (!goal) {
      try { goal = await this.appServer.findActiveGoal(); } catch { /* unavailable */ }
    }
    const selectedId = goal?.threadId ?? active?.sessionId ?? null;
    const session = selectedId ? await this.sessionStore.readSession(selectedId) : null;
    return buildViewModel({ goal, plan: planFromProgress(session?.progress) });
  }
}
