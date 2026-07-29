# KC-0131.4 — Secretary Engine Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131.1–0131.3 · [`kc-0131-4-arch009-gate.md`](./kc-0131-4-arch009-gate.md)  
**Module:** `src/conversation/secretary/`  

---

## Purpose

Provide the **planning and orchestration layer** that converts resolved intent batches into **immutable execution plans**.

The Secretary Engine decides what actions are required, in which order, which require confirmation, which dependencies exist, and which policies apply.

**It never executes plans.** No repository writes, Firestore, WhatsApp sends, calls, reminders, navigation side effects, AI, or UI.

---

## Planning pipeline

```text
Resolved Intent Batch
        ↓
Planning Context
        ↓
Policy Evaluation          (Planning / Role / Safety)
        ↓
Dependency Analysis
        ↓
Sequencing                 (OrderingPolicy)
        ↓
Confirmation Analysis      (required | not_required | blocked | incomplete)
        ↓
Execution Plan             (immutable, isPlaceholder: true)
        ↓
Planning Result
```

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `plans/` | ExecutionPlan, steps, groups, dependencies, confirmation, issues, warnings |
| `contracts/` | Planner, policies, analyzers, service interfaces |
| `policies/` | Placeholder Planning / Confirmation / Ordering / Safety / Role policies |
| `dependencies/` | Dependency graph modeling |
| `sequencing/` | Step ordering |
| `confirmation/` | Confirmation kind assignment — no dialogs |
| `planner/` | Pipeline orchestration |
| `validators/` | Structural plan integrity |
| `services/` | Façade + foundation plan bridge |

**Public entry:** `import { conversationSecretary } from '@/conversation'`

---

## Policy architecture

| Policy | Role |
|--------|------|
| `PlanningPolicy` | Allow / deny a step structurally |
| `ConfirmationPolicy` | required / not_required / blocked / incomplete |
| `OrderingPolicy` | Rank intent codes for sequencing |
| `SafetyPolicy` | Block unsafe placeholder steps (e.g. UNKNOWN) |
| `RolePolicy` | Placeholder allow-all — real authz stays in platform services |

---

## Dependency model

| Kind | Example |
|------|---------|
| `sequence` | Visit before Follow-up |
| `requires_resolution` | Person resolution before update |
| `requires_confirmation` | Confirmation before Baitul Maal change |
| `soft` | Adjacent soft order edges |

Dependencies are recorded on the plan — not executed.

---

## Confirmation model

| Kind | Meaning |
|------|---------|
| `required` | Mutating / secretary actions — DRDS confirmation before future execution |
| `not_required` | Read-only (SEARCH / NAVIGATION / REPORT) |
| `blocked` | Policy / safety blocked |
| `incomplete` | Missing parameters / ambiguous targets |

No confirmation UI in this sprint.

---

## Relationship to Intent Engine (KC-0131.3)

- Input: `IntentBatch` from Intent Engine  
- Conflicts on the batch become planning warnings/issues  
- Intent codes become `operationCode: secretary:<CODE>` steps  
- `toFoundationPlanningCodes` / `secretaryPlanToFoundationPlan` bridge to KC-0131.1 placeholder planner **without execution**

---

## Relationship to future Execution Engine

A future Execution Engine should:

1. Accept an immutable secretary `ExecutionPlan`  
2. Re-validate confirmation + platform authz via existing services  
3. Invoke **existing** business workflows only  
4. Never bypass repositories or invent Firestore paths  

Secretary remains planning-only; Execution owns side effects under DRDS confirmation rules.

---

## Verification

```bash
npm run verify:kc-0131.4
npm run verify:kc-0131.1
npm run verify:kc-0131.2
npm run verify:kc-0131.3
npm run typecheck
```

---

## Explicit non-scope

Business execution · Repository writes · Firestore · React · AI · NLP · Voice · WhatsApp sending · Calling · Reminder scheduling · Navigation execution · UI
