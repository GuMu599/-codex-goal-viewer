import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function defaultPluginDataDir() {
  return process.env.GOAL_VIEWER_DATA_DIR || join(homedir(), '.codex-goal-viewer', 'plugin');
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

function normalizeSession(input) {
  if (!input?.sessionId || typeof input.sessionId !== 'string') throw new Error('sessionId is required');
  return {
    sessionId: input.sessionId,
    cwd: typeof input.cwd === 'string' ? input.cwd : null,
    transcriptPath: typeof input.transcriptPath === 'string' ? input.transcriptPath : null,
    updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : Date.now(),
  };
}

export class SessionStore {
  constructor({ dataDir = defaultPluginDataDir() } = {}) {
    this.dataDir = dataDir;
    this.sessionsDir = join(dataDir, 'sessions');
    this.activePath = join(dataDir, 'active-session.json');
  }

  sessionPath(sessionId) {
    return join(this.sessionsDir, `${encodeURIComponent(sessionId)}.json`);
  }

  async markActive(input) {
    const session = normalizeSession(input);
    const current = await this.readSession(session.sessionId);
    const next = { ...session, progress: current?.progress ?? null };
    await writeJson(this.sessionPath(session.sessionId), next);
    await writeJson(this.activePath, session);
    return next;
  }

  async reportProgress(input) {
    const session = normalizeSession(input);
    const { completed, total } = input;
    if (!Number.isInteger(total) || total <= 0) throw new Error('total must be a positive integer');
    if (!Number.isInteger(completed) || completed < 0 || completed > total) {
      throw new Error('completed must be between 0 and total');
    }
    const current = await this.readSession(session.sessionId);
    if (current && Number(current.updatedAt) > session.updatedAt) return current;
    const next = {
      ...session,
      cwd: session.cwd ?? current?.cwd ?? null,
      transcriptPath: session.transcriptPath ?? current?.transcriptPath ?? null,
      progress: { completed, total },
    };
    await writeJson(this.sessionPath(session.sessionId), next);
    await writeJson(this.activePath, {
      sessionId: next.sessionId,
      cwd: next.cwd,
      transcriptPath: next.transcriptPath,
      updatedAt: next.updatedAt,
    });
    return next;
  }

  readActive() {
    return readJson(this.activePath);
  }

  readSession(sessionId) {
    if (!sessionId) return null;
    return readJson(this.sessionPath(sessionId));
  }
}
