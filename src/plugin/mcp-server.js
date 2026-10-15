import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { OpenAIExtensions } from '@openai/mcp-extensions/server';
import { z } from 'zod';
import { CodexAppServerRpc } from '../codex/app-server-rpc.js';
import { SessionStore } from './session-store.js';
import { GoalSnapshotService } from './snapshot-service.js';
import { WIDGET_HTML, WIDGET_URI } from './widget-html.js';

const sessionStore = new SessionStore();
const appServer = new CodexAppServerRpc();
const snapshots = new GoalSnapshotService({ sessionStore, appServer });

function snapshotResult(state) {
  return {
    structuredContent: state,
    content: [{ type: 'text', text: `Goal ${state.progress.available ? `${state.progress.percent}%` : '暂无进度'}，Token ${state.tokens.formatted}，预计剩余 ${state.eta.label}` }],
  };
}

serveStdio(() => {
  const server = new McpServer({ name: 'codex-goal-viewer', version: '0.2.0' });
  new OpenAIExtensions(server);

  registerAppResource(server, 'goal-progress-panel', WIDGET_URI, {}, async () => ({
    contents: [{
      uri: WIDGET_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: WIDGET_HTML,
      _meta: {
        ui: { prefersBorder: false },
        'openai/ui': {
          preferredDisplayMode: 'fullscreen',
          availableDisplayModes: ['fullscreen'],
        },
      },
    }],
  }));

  registerAppTool(server, 'goal_progress.open', {
    title: 'Goal Progress',
    description: 'Open the compact Goal progress panel for this conversation.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
    _meta: {
      ui: { resourceUri: WIDGET_URI, visibility: ['app'] },
      'openai/ui': { entrypoints: [{ type: 'thread' }] },
    },
  }, async () => snapshotResult(await snapshots.read()));

  server.registerTool('goal_progress.read', {
    title: 'Read Goal progress',
    description: 'Read the latest structured Goal progress, token usage, and rough ETA.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
    _meta: { ui: { visibility: ['app'] } },
  }, async () => snapshotResult(await snapshots.read()));

  server.registerTool('goal_progress.report', {
    title: 'Report Goal progress',
    description: 'Report completed and total steps from the current structured Goal plan. Call after the plan is created or a plan step changes status. Never infer progress from prose.',
    inputSchema: z.object({
      sessionId: z.string().min(1).describe('Current Codex session id supplied by the Goal Viewer hook.'),
      completed: z.number().int().min(0),
      total: z.number().int().positive(),
    }),
  }, async ({ sessionId, completed, total }) => {
    await sessionStore.reportProgress({ sessionId, completed, total });
    return {
      structuredContent: { sessionId, completed, total },
      content: [{ type: 'text', text: `Goal progress recorded: ${completed}/${total}.` }],
    };
  });

  return server;
});
