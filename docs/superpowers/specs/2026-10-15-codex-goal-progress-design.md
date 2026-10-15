# Codex Goal Progress MVP Design

## 1. Product purpose

Codex Goal Progress is a Windows-first, GitHub-publishable local extension for people running long Codex tasks. Its only job is to answer three questions without exposing model reasoning or creating a second task-management system:

1. How much of the current Goal is complete?
2. How many tokens has it consumed?
3. Roughly how much time remains?

The extension reads the Goal and structured Plan that Codex already owns. It never creates, edits, confirms, locks, or reinterprets that plan.

## 2. MVP surface

The MVP presents a compact local web panel intended for Codex's right-side Browser panel. It has two user-controlled states.

### Expanded

```text
Goal 进度

[████████░░░░░░░░░░] 40%

Token：126,400
预计剩余：约 25–45 分钟

                         收起 ▲
```

### Collapsed

```text
Goal 40% · Token 126,400 · 剩余约 25–45 分钟
                                      展开 ▼
```

The entire bottom toggle row is clickable, keyboard operable, and exposes its expanded state to assistive technology. The collapsed preference is stored locally and restored when the panel is reopened.

No step list, current-step description, command output, execution log, model reasoning, or “正在计算” indicator appears in either state.

## 3. Source of truth

The local service consumes Codex App Server data for the currently selected thread:

- `thread/goal/get` and `thread/goal/updated` provide Goal identity, status, elapsed time, and Goal token usage.
- `turn/plan/updated` provides structured Plan steps with `pending`, `inProgress`, or `completed` state.
- `thread/tokenUsage/updated` provides the current thread token total when available.

The most recent valid event for the selected thread wins. A small append-only local event log and current-state snapshot support restart recovery and missed-event repair. Free-form assistant text is never parsed to invent steps or percentages.

If the installed Codex build does not expose a documented mechanism for selecting the active thread or automatically opening a right-side Browser panel, the MVP uses an explicit thread identifier at launch and a one-click URL-opening flow. It must not depend on CDP or Codex DOM injection.

## 4. Progress calculation

For the latest structured Plan:

```text
progress = completed step count / total step count
```

- Only `completed` contributes to the numerator.
- `inProgress` and `pending` do not receive partial credit.
- Token usage does not influence progress.
- A completed Goal displays 100%, even if the last received Plan event has not yet caught up.
- A non-complete Goal with no structured Plan displays `暂无可计算进度`, not a fabricated percentage.

The panel may use a recovered Plan snapshot only when it belongs to the same thread and is newer than any conflicting local state.

## 5. Token display

The panel displays one human-readable total, such as `126,400` or `1.2M` at very large values.

Priority order:

1. Goal `tokensUsed`, because it represents consumption associated with the active Goal.
2. Thread total token usage when Goal-specific usage is unavailable.
3. `暂无数据` when neither value is available.

Input, output, cached-input, and reasoning-token breakdowns are intentionally excluded from the MVP.

## 6. Rough remaining-time estimate

When progress `p` is greater than zero and less than one:

```text
estimated total duration = elapsed duration / p
central remaining duration = elapsed duration * (1 - p) / p
display range = central remaining duration * 0.75 to 1.25
```

The range is rounded to readable minute or hour boundaries and prefixed with `约`. It is a directional estimate, not a deadline.

Special cases:

- `p = 0` or no calculable progress: `暂无估算`
- Goal complete: `已完成`
- Goal paused: retain the last estimate but label it `暂停中`
- Goal blocked, usage-limited, or budget-limited: `等待处理`
- Invalid, negative, or stale elapsed time: `暂无估算`

The UI does not show a calculation animation, confidence score, or explanation of the formula.

## 7. Architecture

```text
Codex App Server events
          ↓
Windows local collector
  - active thread filter
  - event normalization
  - append-only recovery log
          ↓
Deterministic progress model
  - percentage
  - token total
  - rough ETA range
          ↓
localhost HTTP + event stream
          ↓
Codex right-side Browser panel
  - expanded/collapsed card
  - no Codex DOM injection
```

The implementation is split into four bounded units:

1. **Collector:** connects to App Server, validates relevant notifications, and filters them by thread.
2. **Progress model:** converts normalized Goal, Plan, token, and elapsed-time data into the three display values.
3. **Local service:** persists recovery state and exposes a loopback-only API plus live updates.
4. **Panel:** renders the compact card and owns only presentation state such as expanded/collapsed preference.

## 8. Local API contract

The panel reads a single view model rather than raw Codex events:

```json
{
  "threadId": "thread-id",
  "goalStatus": "active",
  "progress": {
    "available": true,
    "completed": 4,
    "total": 10,
    "percent": 40
  },
  "tokens": {
    "available": true,
    "total": 126400,
    "formatted": "126,400"
  },
  "eta": {
    "available": true,
    "label": "约 25–45 分钟"
  },
  "updatedAt": "2026-10-15T10:00:00.000Z"
}
```

The server binds to `127.0.0.1`, chooses or validates an available port, rejects non-local origins, and exposes no mutation endpoint for Goal or Plan data.

## 9. Recovery and failure behavior

- On startup, the service loads only the snapshot for the requested thread, then reconciles it with fresh App Server state.
- Malformed or unrelated events are ignored and recorded as diagnostics without crashing the panel.
- If the App Server disconnects, the last valid values remain visible with a stale-data indicator available to accessibility text; the visible MVP stays limited to the three metrics.
- If the panel cannot reach the local service, all three values use unavailable states and retry automatically with bounded backoff.
- Local logs must not store model reasoning, message contents, credentials, or authentication tokens.

## 10. Installation and launch boundary

The repository will provide a Windows installation command and a launch command. Launching the service starts monitoring one Codex thread and prints or opens the localhost panel URL.

Automatic placement inside Codex's right-side Browser panel is attempted only through a supported public Codex mechanism. If no such mechanism exists, documentation instructs the user to open the printed URL in Codex's Browser panel with one click. The project does not claim a native sidebar extension point that the public API does not provide.

## 11. Verification requirements

The MVP is complete only when all of the following are demonstrated:

- Unit tests cover progress, token-source priority, ETA ranges, and every unavailable/special state.
- Protocol tests replay Goal, Plan, and token events, including restart recovery and wrong-thread events.
- API tests verify loopback binding, read-only behavior, validation, and live state updates.
- Browser tests verify expanded/collapsed interaction, preference restoration, keyboard operation, responsive narrow width, loading/unavailable states, and reduced motion.
- A Windows smoke test launches the service, opens the panel, replays a sample Goal from 0% to 100%, and confirms visible values update.
- README documents what is measured, how ETA is calculated, why it is approximate, and the right-panel auto-open limitation.

## 12. Explicitly out of scope

- Generating or editing Goal plans
- Multiple-thread dashboards
- Step lists or current-step descriptions
- Model reasoning, command streams, or detailed logs
- Token-cost calculation
- Predictive difficulty models or machine-learned ETA
- macOS or Linux support in the first release
- CDP, Electron patching, or private DOM injection
- Publishing to GitHub before local verification and explicit user authorization to push

