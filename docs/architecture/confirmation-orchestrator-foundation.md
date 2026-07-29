# KC-0131.8 — Confirmation Orchestrator Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131A · KC-0131.1–7 · [`kc-0131-8-arch009-gate.md`](./kc-0131-8-arch009-gate.md)  
**Module:** `src/conversation/confirmation/`  

---

## Purpose

Provide the **decision gate** between planning / orchestration and any future business execution.

Every execution request must pass through a confirmation decision before it is eligible for execution. The Confirmation Orchestrator decides whether:

- execution may proceed (`AUTO_APPROVED`)
- explicit user confirmation is required (`USER_CONFIRMATION_REQUIRED`)
- execution is denied (`DENIED`)
- additional information is required (`MORE_INFORMATION_REQUIRED`)
- the decision is deferred (`DEFERRED`)

It **never performs execution**.

---

## Decision lifecycle

```text
ExecutionPlan / Execution request (metadata)
        ↓
ConfirmationRequest + ConfirmationContext
        ↓
ConfirmationDecision (architecture state)
        ↓
ConfirmationResult
        ↓
Future Execution Pipeline (Phase C+) — only if eligible
```

No runtime policy engine ships in this sprint. Policy contracts are metadata placeholders.

---

## Confirmation states

| State | Meaning |
|-------|---------|
| `AUTO_APPROVED` | May proceed without user prompt |
| `USER_CONFIRMATION_REQUIRED` | Explicit user approval required |
| `DENIED` | Must not execute |
| `MORE_INFORMATION_REQUIRED` | Cannot decide — need more input |
| `DEFERRED` | Decision postponed |

---

## Policy model

Placeholder policy kinds (metadata only — **no evaluation logic**):

- `read_only_action`
- `informational_response`
- `single_business_action`
- `multiple_business_actions`
- `external_communication`
- `high_impact_operation`

---

## Risk classifications

Architectural labels only:

- `none` · `low` · `medium` · `high` · `critical`

No automatic risk scoring in this sprint.

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `contracts/` | Orchestrator / policy interfaces |
| `policies/` | Policy metadata definitions |
| `decisions/` | Decision vocabulary + factories |
| `contexts/` | Context model (plan, capability, risk, actor) |
| `prompts/` | Future confirmation prompt contracts |
| `responses/` | Result models |
| `validators/` | Structural validation |
| `errors/` | Invalid request / missing context / unsupported / configuration |
| `services/` | Placeholder façade — builds requests/results without executing |

**Public entry:** `import { conversationConfirmationOrchestrator } from '@/conversation'`

---

## Relationship to Execution Orchestrator (KC-0131.5)

| Layer | Role |
|-------|------|
| Execution Orchestrator | Lifecycle coordination of plans (no work) |
| Confirmation Orchestrator | Eligibility / approval decision gate |
| Future Execution Pipeline | Performs work only after eligible decision |

Orchestrator may later consult confirmation before marking steps ready for adapters. Wiring deferred.

---

## Relationship to future Execution Pipeline

Phase C+ may:

1. Build `ConfirmationRequest` from session + plan metadata
2. Obtain `ConfirmationDecision`
3. If `AUTO_APPROVED` or user confirms → proceed to adapters / service contracts
4. If `DENIED` / `MORE_INFORMATION_REQUIRED` / `DEFERRED` → halt or wait

This foundation defines shapes only.

---

## Distinct from plan-time confirmation

- **Secretary (KC-0131.4)** — planning-time `ConfirmationRequirement` on steps
- **Foundation confirmation** — conversation-level confirmation service
- **This module** — execution-gate decisions before any business action

---

## Constraints (enforced)

Repository · Firestore · React · business-service · framework · AI · voice — **independent**.  
No execution.

Verify: `npm run verify:kc-0131.8`
