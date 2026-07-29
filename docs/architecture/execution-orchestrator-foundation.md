# KC-0131.5 — Execution Orchestrator Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131A · KC-0131.1–4 · [`kc-0131-5-arch009-gate.md`](./kc-0131-5-arch009-gate.md)  
**Module:** `src/conversation/orchestrator/`  

---

## Purpose

Provide the **runtime orchestration layer** that consumes immutable `ExecutionPlan`s from the Secretary Engine and coordinates their **lifecycle** — state, progress, events, pause/resume, cancellation, and completion.

The orchestrator **coordinates work**. It **never performs work**. No adapters, repositories, Firestore, services, AI, voice, or UI.

---

## Lifecycle / state machine

```text
ExecutionPlan
      ↓
Initialized
      ↓
Ready
      ↓
Running ⇄ Paused
      ↓
Completed | Failed | Cancelled
```

Legal transitions are enforced by `EXECUTION_LIFECYCLE_TRANSITIONS`. Terminal states accept no further transitions.

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `lifecycle/` | States, models, factories, transitions |
| `contracts/` | Runtime + service interfaces |
| `runtime/` | Lifecycle coordination implementation |
| `scheduler/` | Next-step order from plan (no invocation) |
| `progress/` | Placeholder percent / counts |
| `cancellation/` | Cancel path |
| `errors/` | Recoverable / non-recoverable / validation / dependency / infrastructure |
| `events/` | Event type exports |
| `observers/` | Audit / logging / notifications / metrics / UI extension points |
| `services/` | Façade + coordination simulation |

**Public entry:** `import { conversationOrchestrator } from '@/conversation'`

---

## Events

`ExecutionStarted` · `StepStarted` · `StepCompleted` · `ExecutionPaused` · `ExecutionResumed` · `ExecutionFailed` · `ExecutionCancelled` · `ExecutionCompleted`

Observers receive events; no concrete audit/UI implementations ship in this sprint.

---

## Progress model

| Field | Meaning |
|-------|---------|
| `totalSteps` | Plan step count |
| `completedSteps` | Bookkeeping completions |
| `remainingSteps` | total − completed |
| `currentStepId` / `currentStepIndex` | Coordination cursor |
| `percentComplete` | Placeholder 0–100 |

---

## Error model

Categories: `recoverable` · `non_recoverable` · `validation` · `dependency` · `infrastructure`  

`isRetryCandidate()` is an architecture hint only — **no retry engine**.

---

## Extension points

| Observer kind | Future use |
|---------------|------------|
| `audit` | Conversation / activity audit |
| `logging` | Structured logs |
| `notifications` | User/system notices |
| `metrics` | Operational metrics |
| `ui` | Progress surfaces |

---

## Relationship to Secretary Engine (KC-0131.4)

- Input: immutable secretary `ExecutionPlan` (`isPlaceholder: true`)  
- Orchestrator does not mutate the plan  
- Step begin/complete are **bookkeeping** markers for future adapters  

---

## Relationship to future Execution Adapter Layer

Adapters should:

1. Subscribe as observers and/or be invoked by a future executor **outside** this package  
2. Perform confirmed platform operations via existing services/repos  
3. Report success/failure back into orchestrator lifecycle APIs  
4. Never embed Firestore or business rules inside the orchestrator  

`simulateCoordination()` exists only to verify lifecycle integrity in tests — it must not be used as production execution.

---

## Verification

```bash
npm run verify:kc-0131.5
npm run verify:kc-0131.1
npm run verify:kc-0131.2
npm run verify:kc-0131.3
npm run verify:kc-0131.4
npm run typecheck
```

---

## Explicit non-scope

Business execution · Repository / Firestore / KC service calls · Adapters · AI · Voice · UI · Retry engines
