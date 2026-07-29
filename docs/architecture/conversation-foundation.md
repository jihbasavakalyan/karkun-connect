# KC-0131.1 — Conversation Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 (Approved Baseline) · DRDS-ARR-v1.0 · KC-ARCH-009 gate [`kc-0131-1-arch009-gate.md`](./kc-0131-1-arch009-gate.md)  
**Module:** `src/conversation/foundation/`  

---

## Purpose

Establish the **DRDS-aligned conversation infrastructure** for Digital Rafeeq without AI, speech, WhatsApp, calling, reminders, business execution, Firestore, repository access, or UI changes.

This sprint defines lifecycle, session, context, intent, execution plan, confirmation, and response **abstractions** so KC-0131.2+ can attach real intent resolution and secretary capabilities without inventing a parallel architecture.

---

## Module responsibilities

| Path | Responsibility |
|------|----------------|
| `types/` | Framework-independent types: state, session, context, turn, intent, plan, confirmation, response |
| `models/` | Immutable session create/update helpers |
| `contracts/` | Service interfaces (lifecycle, session, planner, confirmation, response) |
| `services/` | Lifecycle state machine; in-memory session lifecycle |
| `session/` | Session manager façade (create / complete / cancel / timeout / reset / drive) |
| `planning/` | Placeholder planner — returns non-executing plans only |
| `confirmation/` | Confirmation request models — no UI / dialogs |
| `response/` | Response models for informational / clarification / confirmation / completion / error |

**Public entry:** `createConversationFoundation()` and `import { conversationFoundation } from '@/conversation'` (namespace export).

---

## Lifecycle

DRDS foundation lifecycle (state definitions and transitions only):

```text
Idle
  ↓
Listening
  ↓
Understanding
  ↓
Planning
  ↓
AwaitingConfirmation
  ↓
Completed
  ↓
Idle
```

Additional legal edges allow return to `idle` from intermediate states for cancel / recovery without execution. Illegal transitions are rejected; ended sessions reject further transitions.

**Not included:** speech capture, STT/TTS, LLM understanding, or plan execution.

---

## Session management

In-memory only (DRDS §17.6 — conversation history is not a durable SoR):

- Create  
- Complete  
- Cancel  
- Timeout (idle duration configurable)  
- Context reset (clears active plan / pending confirmation)  

No persistence. No Firestore. No repository writes.

---

## Extension points

| Extension | Future ticket | Contract |
|-----------|---------------|----------|
| Intent resolution | KC-0131.2 | Replace / wrap `Intent` status beyond `placeholder` |
| Real execution plans | KC-0131.2 / .3 | `ConversationPlanner` implementation mapping to existing platform operations |
| Confirmation UX | Later | Consume `ConfirmationRequest` — do not embed UI here |
| Channel adapters | Later | `ConversationChannel` remains abstract |
| Secretary actions | KC-0131.3 | Plan steps must call existing services — never Firestore SDK |
| Role-aware intelligence | KC-0131.4 | Context `role` / `ruknId` already present; authz stays in platform services |

---

## Relationship to DRDS

| DRDS area | Foundation coverage |
|-----------|---------------------|
| §11 Conversation Model | Session, multi-intent collection shape, single confirmation model |
| §13 Decision Framework | Lifecycle stages Listen→…→Completion as state machine |
| §16 Architecture Constraints | Interaction-layer types only; no repos / Firestore / business rules |
| §17 Confirmation / retention | Confirmation models; ephemeral session; no transcript SoR |
| §21.1 KC-0131.1 | This module |

Non-negotiables preserved: repository-first, no duplicate business logic, disable-safe existing UI (untouched), not a general AI assistant.

---

## Relationship to existing KC-004 conversation layer

`src/conversation/ConversationEngine` and related KC-004 packages remain **unchanged in behaviour**.

KC-0131.1 adds a **sibling** `foundation/` module as the DRDS consolidation target. Callers are **not** migrated in this sprint (ARR dual-path note): Foundation is not wired into voice UI or ops answers yet, avoiding a third intelligence path at runtime.

---

## Relationship to KC-0131.2 (Intent Engine)

KC-0131.2 should:

1. Resolve utterances into `Intent` / `IntentCollection` with real codes  
2. Bind entities using existing person/connection/search services (within authz)  
3. Feed resolved intents into an upgraded `ConversationPlanner` that still **does not** execute side effects without confirmation  
4. Keep Validation in existing business services — never inside an LLM alone  

Foundation types are intentionally opaque (`operationCode`, `entities`) so Intent Engine can deepen them without breaking the lifecycle.

---

## Verification

```bash
npm run verify:kc-0131.1
npm run typecheck
```

---

## Explicit non-scope (this sprint)

AI / LLM · STT / TTS · WhatsApp · Calling · Reminders · Business execution · Firestore · Repository changes · UI behaviour changes · React dependency inside foundation
