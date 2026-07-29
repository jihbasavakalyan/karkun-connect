# KC-0131.9 — Execution Pipeline Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131A · KC-0131.1–8 · [`kc-0131-9-arch009-gate.md`](./kc-0131-9-arch009-gate.md)  
**Module:** `src/conversation/executionPipeline/`  

---

## Purpose

Coordinate the flow from an **approved Confirmation Decision** toward the **Execution Adapter Layer**.

The pipeline **coordinates** execution stages. It does **not**:

- perform business logic
- call repositories
- invoke platform services
- evaluate confirmation policies

---

## Pipeline stages

| Stage | Meaning |
|-------|---------|
| `INITIALIZED` | Pipeline instance created |
| `CONFIRMED` | Bound to an eligible confirmation decision |
| `PREPARING` | Preparing routing context |
| `READY` | Ready for adapter routing |
| `ROUTING` | Coordinating step → adapter routing (no invocation) |
| `WAITING` | Waiting on external/async coordination |
| `COMPLETED` | Pipeline coordination finished |
| `FAILED` | Pipeline failed |
| `CANCELLED` | Pipeline cancelled |

---

## Transition model

Legal transitions (metadata state machine):

```text
INITIALIZED → CONFIRMED | CANCELLED | FAILED
CONFIRMED → PREPARING | CANCELLED | FAILED
PREPARING → READY | CANCELLED | FAILED
READY → ROUTING | CANCELLED | FAILED
ROUTING → WAITING | COMPLETED | CANCELLED | FAILED
WAITING → ROUTING | COMPLETED | CANCELLED | FAILED
COMPLETED | FAILED | CANCELLED → (terminal)
```

Enforced by `PIPELINE_STAGE_TRANSITIONS` / `isLegalPipelineTransition`. No business work on transition.

---

## Checkpoint model

Placeholder checkpoint kinds (no implementations):

| Kind | Intent |
|------|--------|
| `validation` | Structural / eligibility checks recorded |
| `confirmation` | Confirmation binding recorded |
| `routing` | Adapter routing coordination recorded |
| `completion` | Terminal success recorded |
| `audit` | Observability placeholder |

---

## Lifecycle

```text
ConfirmationDecision (eligible)
        ↓
ExecutionPipeline (INITIALIZED)
        ↓
CONFIRMED → PREPARING → READY → ROUTING ⇄ WAITING
        ↓
COMPLETED | FAILED | CANCELLED
```

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `contracts/` | Pipeline service interfaces |
| `stages/` | Stage vocabulary |
| `transitions/` | Legal transition table |
| `contexts/` | Pipeline context (plan, decision, capability) |
| `checkpoints/` | Checkpoint metadata |
| `lifecycle/` | Models, factories, transition helpers |
| `results/` | PipelineResult |
| `errors/` | Invalid transition, missing checkpoint, config, cancelled |
| `validators/` | Structural validation |
| `services/` | Placeholder coordination façade |

**Public entry:** `import { conversationExecutionPipeline } from '@/conversation'`

---

## Relationship to Confirmation Orchestrator (KC-0131.8)

Confirmation decides eligibility (`AUTO_APPROVED` or post-user-approval).  
Pipeline accepts a confirmation decision id / eligibility flag as **metadata** and advances stages. It does not re-evaluate policies.

---

## Relationship to Execution Adapters (KC-0131.6)

`ROUTING` stage represents coordination toward adapters. This sprint records stage/checkpoint metadata only — **no adapter invocation**.

---

## Constraints (enforced)

Repository · Firestore · React · business-service · framework · AI · voice — **independent**.  
No execution.

Verify: `npm run verify:kc-0131.9`
