# Codex Goal Progress MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a Windows-first local Codex Goal Progress MVP that shows only Goal percentage, token consumption, and rough remaining time in a collapsible localhost panel.

**Architecture:** A dependency-light Node.js service normalizes App Server-style Goal, Plan, and token events into a persisted per-thread state. A deterministic view-model module calculates the three displayed values. An HTTP server serves the panel, a read-only JSON endpoint, SSE updates, and an explicit event-ingestion endpoint for App Server adapters and replay tests. The UI has no Codex DOM/CDP dependency and can be opened in the Codex Browser panel.

**Tech Stack:** Node.js 22+, built-in `node:test`, built-in `http`, vanilla HTML/CSS/JavaScript, JSONL snapshot/event persistence, Windows `.cmd` launcher.

---

## File map

- Create: `package.json` — scripts and Node engine declaration.
- Create: `src/domain/progress.js` — pure deterministic progress, token, ETA, and formatting functions.
- Create: `src/domain/progress.test.js` — unit tests for all model branches.
- Create: `src/domain/state-store.js` — append-only event log and current state snapshot for one thread.
- Create: `src/domain/state-store.test.js` — recovery, ordering, and wrong-thread tests.
- Create: `src/server/app.js` — loopback HTTP API, SSE fanout, static panel serving, and event validation.
- Create: `src/server/app.test.js` — API behavior tests using an ephemeral port.
- Create: `src/cli.js` — command-line entry point, replay input, and server startup.
- Create: `src/public/index.html` — accessible compact panel markup.
- Create: `src/public/styles.css` — compact expanded/collapsed visual states and reduced-motion rules.
- Create: `src/public/app.js` — API polling/SSE, rendering, and bottom expand/collapse control.
- Create: `src/public/app.test.js` — browser-independent rendering/format tests for view state.
- Create: `scripts/start-goal-progress.cmd` — Windows launcher.
- Create: `README.md` — install, launch, event adapter contract, ETA caveat, and Codex Browser-panel workflow.
- Modify: `.gitignore` — ignore runtime data and dependencies.

### Task 1: Initialize the Node project and pure progress model

**Files:** `package.json`, `src/domain/progress.test.js`, `src/domain/progress.js`

- [ ] **Step 1: Write failing model tests** for completed/total percentage, no-plan state, completed Goal override, token priority, zero-progress ETA, range formatting, and terminal statuses.
- [ ] **Step 2: Run `npm test -- src/domain/progress.test.js`** and verify it fails because the module does not exist.
- [ ] **Step 3: Implement the smallest pure functions**: `calculateProgress`, `selectTokenTotal`, `calculateEta`, `formatTokenTotal`, and `buildViewModel`.
- [ ] **Step 4: Run the focused test and then the full empty suite**; expected focused result is all model tests passing.
- [ ] **Step 5: Commit `feat: add deterministic goal progress model`**.

### Task 2: Add event normalization and restart recovery

**Files:** `src/domain/state-store.test.js`, `src/domain/state-store.js`

- [ ] **Step 1: Write failing tests** for Goal updates, Plan updates, token updates, same-thread filtering, stale event rejection, append-only recovery, and malformed-line tolerance.
- [ ] **Step 2: Run `npm test -- src/domain/state-store.test.js`** and verify expected missing-module failures.
- [ ] **Step 3: Implement `StateStore`** with `applyEvent`, `readState`, `appendEvent`, and `restore`, storing `state.json` and `events.jsonl` below `.goal-progress/<threadId>/`.
- [ ] **Step 4: Run focused recovery tests and inspect the generated temporary files**; expected all pass and unrelated thread events never change state.
- [ ] **Step 5: Commit `feat: persist normalized goal events`**.

### Task 3: Build the loopback API and live update stream

**Files:** `src/server/app.test.js`, `src/server/app.js`, `src/cli.js`

- [ ] **Step 1: Write failing API tests** for `GET /api/state`, `GET /api/events` SSE headers, `POST /api/events`, invalid JSON/invalid event rejection, loopback-only binding configuration, and static `GET /`.
- [ ] **Step 2: Run `npm test -- src/server/app.test.js`** and verify missing-module failures.
- [ ] **Step 3: Implement the HTTP server** using built-in modules, with `127.0.0.1` default binding, read-only state endpoint, bounded event validation, SSE subscribers, and static-file delivery.
- [ ] **Step 4: Implement CLI flags** `--thread <id>`, `--port <port>`, `--data-dir <path>`, and `--open` (print URL; do not require private Codex UI automation).
- [ ] **Step 5: Run API tests and a manual `node src/cli.js --thread demo --port 0` smoke request**; expected JSON state and SSE stream are reachable.
- [ ] **Step 6: Commit `feat: expose local goal progress service`**.

### Task 4: Implement the compact collapsible panel

**Files:** `src/public/index.html`, `src/public/styles.css`, `src/public/app.js`, `src/public/app.test.js`

- [ ] **Step 1: Write failing view tests** for expanded and collapsed text, unavailable percentage/ETA labels, numeric token formatting, and terminal state labels.
- [ ] **Step 2: Run `npm test -- src/public/app.test.js`** and verify the rendering helpers are missing.
- [ ] **Step 3: Implement the accessible panel**: three metrics only, one bottom button with `aria-expanded`, localStorage preference, SSE-first updates with polling fallback, and no step/log/reasoning fields.
- [ ] **Step 4: Add responsive narrow-width styles and `prefers-reduced-motion: reduce` behavior**, then run focused view tests.
- [ ] **Step 5: Commit `feat: add collapsible goal progress panel`**.

### Task 5: Add Windows launch/replay documentation and integration verification

**Files:** `scripts/start-goal-progress.cmd`, `README.md`, `.gitignore`

- [ ] **Step 1: Add the Windows launcher** that forwards CLI arguments to `node src/cli.js` without embedding credentials.
- [ ] **Step 2: Document installation, launch, explicit thread selection, event payload examples, localhost security boundary, rough ETA formula, and opening the printed URL in Codex's Browser panel.**
- [ ] **Step 3: Add an integration test script or documented PowerShell sequence** that starts a server, posts a Goal/Plan/token event sequence from 0% to 100%, checks the view JSON at each stage, and terminates cleanly.
- [ ] **Step 4: Run `npm test`, `npm run check`, the integration smoke sequence, and `git diff --check`.**
- [ ] **Step 5: Commit `docs: add Windows launch and verification workflow`**.

### Task 6: Prepare and publish the GitHub repository

- [ ] **Step 1: Inspect the target remote with `git ls-remote https://github.com/GuMu599/-codex-goal-viewer.git`** and record whether it is empty or has existing branches.
- [ ] **Step 2: Add the remote only after confirming the target URL, then push `main` with `git push -u origin main`; never force-push.**
- [ ] **Step 3: Verify the pushed commit with `git ls-remote origin refs/heads/main` and confirm the local worktree is clean.**
- [ ] **Step 4: Report the GitHub URL, commit SHA, verification commands, and any limitations about automatic Codex panel opening.**

## Plan self-review

- Coverage: the design's three metrics, collapse control, deterministic percentage, rough ETA, token priority, persistence, local API, Windows launch, and Codex Browser-panel limitation each map to a task above.
- No plan generation or editing is introduced; the event ingestion path is read-only with respect to Goal/Plan semantics.
- No private DOM/CDP dependency is introduced.
- The only external mutation is the user-requested push to the specified GitHub repository, after local tests pass.
