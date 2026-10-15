# Codex Goal Viewer

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Windows-first local viewer for long-running Codex Goals.

Codex Goal Viewer answers only three questions:

- How much of the Goal is complete?
- How many tokens has it consumed?
- Roughly how much time remains?

The panel is intentionally compact. It can be collapsed from the bottom, leaving a one-line summary visible. It does not show model reasoning, command logs, step lists, or a second editable task plan.

> **Status:** MVP. The progress model, persistence, localhost API, collapsible panel, replay tests, and App Server stdio bridge are implemented. Direct automatic attachment to an already-open Codex Desktop conversation is limited by the public App Server boundary; details below.

## Features

- Deterministic progress: `completed steps / total structured Plan steps`
- Coarse ETA range derived from elapsed time and completion percentage
- Goal token total with thread-token fallback
- Restart recovery through an append-only JSONL event log and snapshot
- Loopback-only HTTP API and Server-Sent Events updates
- Optional `codex app-server --stdio` JSON-RPC bridge
- Keyboard-accessible collapse/expand control
- Reduced-motion styling and narrow-panel layout
- No Codex DOM/CDP injection and no free-text guessing

## Requirements

- Windows for the first release
- Node.js 22 or newer
- A Codex CLI installation if using `--app-server`

## Install and run

```powershell
git clone https://github.com/GuMu599/-codex-goal-viewer.git
cd -LiteralPath .\-codex-goal-viewer
node src\cli.js --thread <thread-id>
```

Or use the Windows launcher:

```powershell
.\scripts\start-goal-progress.cmd --thread <thread-id>
```

The service prints a URL such as `http://127.0.0.1:43821/`. Open that URL in Codex's right-side Browser panel.

Useful options:

```text
--thread <id>       Thread to monitor
--port <port>       Fixed port; defaults to an available ephemeral port
--data-dir <path>   Local state directory
--app-server        Start codex app-server --stdio and bridge its events
--codex-bin <path>  Custom Codex executable for --app-server
```

## Public App Server boundary

The bridge performs public JSON-RPC initialization, requests `thread/goal/get`, and forwards these notifications when visible on that App Server connection:

- `thread/goal/updated`
- `turn/plan/updated`
- `thread/tokenUsage/updated`

The public API does not guarantee that an independently started App Server shares the Goal state of a conversation already open inside Codex Desktop. On Codex Desktop 0.160.0, the stdio handshake works, but an independent process may still report `未连接` because Desktop's in-memory conversation is not exposed to it.

When that happens, a host adapter must forward the current conversation's events to the local endpoint below. The project does not read private DOM, inject CDP scripts, or infer progress from free-form text.

## Event adapter API

The local service accepts App Server-style events at `POST /api/events` and exposes the normalized view at `GET /api/state`.

```powershell
$base = 'http://127.0.0.1:<port>'
$goal = @{ method = 'thread/goal/updated'; params = @{ threadId = 'thread-1'; goal = @{ status = 'active'; tokensUsed = 126400; timeUsedSeconds = 1080; updatedAt = 1 } } } | ConvertTo-Json -Depth 8
$plan = @{ method = 'turn/plan/updated'; params = @{ threadId = 'thread-1'; turnId = 'turn-1'; plan = @(@{ status = 'completed'; step = 'one' }, @{ status = 'pending'; step = 'two' }) } } | ConvertTo-Json -Depth 8
Invoke-RestMethod "$base/api/events" -Method Post -ContentType 'application/json' -Body $goal
Invoke-RestMethod "$base/api/events" -Method Post -ContentType 'application/json' -Body $plan
Invoke-RestMethod "$base/api/state"
```

The service ignores unrelated threads and stale events. It does not expose mutation endpoints for changing the Goal or Plan.

## Progress and ETA

```text
completion = completed steps / total structured Plan steps
remaining ≈ elapsed time × (1 - completion) / completion
```

The displayed range is intentionally broad (75%–125% of the central estimate) and is directional, not a deadline.

- No structured Plan or 0%: `暂无估算`
- Complete Goal: `已完成`
- Blocked/usage-limited/budget-limited Goal: `等待处理`
- Goal `tokensUsed` takes priority over thread totals; otherwise `暂无数据`

Tokens are displayed only. They do not affect the percentage or ETA.

## Local verification

```powershell
npm test
npm run check
git diff --check
```

The test suite covers the progress model, ETA edge cases, event ordering, restart recovery, loopback API, event-stream endpoint, panel rendering, collapse state, and CLI replay from unavailable → 50% → complete.

## Repository layout

```text
src/domain/       Progress calculation and durable state store
src/codex/        App Server JSON-RPC bridge and protocol helpers
src/server/       Loopback API, SSE, and static file server
src/public/       Compact browser panel
scripts/           Windows launcher
docs/              Design and implementation specifications
```

## License

MIT. See [LICENSE](LICENSE).
