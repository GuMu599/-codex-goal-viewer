# Codex Goal Viewer

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Codex Goal Viewer is a compact Codex Desktop plugin for long-running Goal tasks. It adds a conversation side-panel entrypoint that shows only:

- Goal progress
- Token consumption
- A rough remaining-time estimate

Use the icon button at the bottom of the panel to collapse or expand it.

## How it works

The plugin uses supported Codex and MCP interfaces instead of reading the desktop DOM or parsing free-form model text:

1. Trusted Codex lifecycle hooks record the current conversation session ID.
2. The hook asks the Goal agent to report `completed` and `total` from its structured plan through `goal_progress.report`.
3. The MCP server reads `tokensUsed` and `timeUsedSeconds` from Codex `thread/goal/get`.
4. An MCP App with an OpenAI `thread` entrypoint renders the compact side panel and refreshes every 2.5 seconds.

Progress is `completed / total`. ETA uses the elapsed Goal time and current percentage:

```text
remaining = elapsed x (1 - completion) / completion
```

The panel displays a deliberately broad 75%-125% range. It is directional, not a deadline. Tokens are displayed but do not affect percentage or ETA.

## Install in Codex Desktop

Requirements:

- Codex Desktop with plugin, hook, and MCP Apps support
- Node.js 22 or newer available as `node`

Install from the GitHub marketplace repository:

```powershell
codex plugin marketplace add GuMu599/-codex-goal-viewer
codex plugin add codex-goal-viewer@gumu-codex-plugins
```

Review and trust the two plugin hooks when Codex asks. Start a new Goal conversation, or send the next message in an existing Goal conversation, so the hook can bind that conversation to the viewer.

Open the panel from the conversation header:

1. Select the `+` button at the upper right to open a conversation side tab.
2. Select **更多工具...**.
3. Under **插件和 MCP**, select **Goal Progress**.

The **来源** card only confirms that `codex-goal-viewer` is connected; selecting that source does not open the panel. The first load can briefly show `暂无数据` while Codex returns the current Goal snapshot. Keep the **Goal Progress** tab open for live updates. Use the arrow at the bottom of the panel to collapse it to one line or expand it again.

## Update or remove

```powershell
codex plugin marketplace upgrade gumu-codex-plugins
codex plugin remove codex-goal-viewer@gumu-codex-plugins
```

Local runtime state is stored under `%USERPROFILE%\.codex-goal-viewer\plugin` by default. Override it with `GOAL_VIEWER_DATA_DIR` when needed.

## Development

```powershell
npm ci
npm run build:plugin
npm test
npm run check
npm run verify:plugin
git diff --check
```

`npm run verify:plugin` checks the publishable files, launches the bundled MCP server, and verifies all three tools plus the `text/html;profile=mcp-app` thread resource.

For local marketplace development:

```powershell
codex plugin marketplace add .
codex plugin add codex-goal-viewer@gumu-codex-plugins
```

After changing hook commands, Codex intentionally marks their new hashes as modified. Review and trust the updated hooks again.

## Architecture

```text
.agents/plugins/marketplace.json  GitHub marketplace catalog
.codex-plugin/plugin.json         Codex compatibility manifest
.mcp.json                         MCP server declaration
hooks/                            Session binding and agent context
src/plugin/                       MCP server, state, and panel source
src/codex/                        Codex App Server client
dist/                             Self-contained publishable bundles
```

The repository still contains the original localhost viewer under `src/server` and `src/public` for development and regression coverage. The installed Codex plugin uses the bundled files in `dist/`.

## Current limitations

- Progress requires a structured plan with at least one step. The plugin never guesses a percentage from prose.
- Existing conversations need one new user submission after installation so the hook can bind the session.
- The active-session binding is local to the current Windows user. Rapidly alternating between multiple Goal conversations may briefly show the most recently active one until the current conversation reports again.
- Lifecycle hooks make this a desktop/local-executor plugin. It is distributed through this GitHub marketplace repository rather than the universal public plugin directory.

## Security

- Hook commands are explicit and hash-trusted by Codex.
- The plugin stores only the session ID, workspace/transcript paths supplied by Codex, and structured step counts.
- It does not inspect model reasoning, scrape the UI, inject CDP, or send telemetry.
- MCP App HTML is bundled locally; no remote scripts are loaded.

## License

MIT. See [LICENSE](LICENSE).
