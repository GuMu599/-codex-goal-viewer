import { SessionStore } from '../src/plugin/session-store.js';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const input = JSON.parse(await readStdin());
const sessionId = input.session_id;

if (sessionId) {
  const store = new SessionStore();
  await store.markActive({
    sessionId,
    cwd: input.cwd,
    transcriptPath: input.transcript_path,
  });
}

if (process.argv.includes('--inject') && sessionId) {
  const additionalContext = [
    'Codex Goal Viewer is active for this conversation.',
    `Its structured sessionId is ${sessionId}.`,
    'While Goal mode is active, call goal_progress.report after creating or changing the plan and whenever a plan step changes status.',
    'Pass completed and total from the structured plan only. Do not infer progress from prose and do not expose this sessionId to the user.',
  ].join(' ');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext,
    },
  }));
}
