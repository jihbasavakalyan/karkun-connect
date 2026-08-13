# KC Phase 8 — Next Best Action (TASK-065) — KC-ARCH-009 Gate

**Ticket:** BATCH-08A / TASK-065  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020  
**Authority:** [TASK-063](./kc-phase8-objective-evaluation-arch009-gate.md) · [TASK-064](./kc-phase8-activity-derived-evaluation-arch009-gate.md) · [KC-020 NBA](./execution-automation-framework.md) · [automation charter](./automation-philosophy-charter.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Objective-level Next Best Action (decision layer only)

TASK-066–070 / Contextual Recommendations / Rafeeq presentation / voice / Vercel / Firestore rules / Phase 2 verify string-fix are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Deterministic Next Best Action from TASK-063 + TASK-064 evaluation outputs |
| Not | Ranked people lists, contextual recommendation copy, Urdu/Rafeeq, voice, universal score, NBA persistence |

**STOP checks:**

| Check | Result |
|-------|--------|
| Replace per-execution `deriveNextBestAction`? | **NO** — KC-020 execution NBA stays intact |
| Invent action when Objective is `not_evaluated`? | **NO** — explicit `NO_EVALUATION_ACTION` |
| Ranked recommendations / “who first”? | **NO** — one action per Objective (TASK-066) |
| Rafeeq Urdu this task? | **NO** — machine-readable `reason` only (TASK-067) |
| Durable NBA collection? | **NO** — derived read model |

**Persistence decision:** No new SoT. Selector only.

---

## Layer

```text
Operational Data
      ↓
Objective Evaluation          TASK-063
      ↓
Activity-Derived Evaluation   TASK-064
      ↓
Next Best Action              TASK-065  (this task — one action)
      ↓
Contextual Recommendations    TASK-066  (out of scope)
      ↓
Rafeeq Presentation           TASK-067  (out of scope)
```

KC-020 already maps **execution outcome → NBA**. TASK-065 maps **Objective evaluation + activity evaluation → NBA**. Same codes/priority/reason contract where they fit; different input.

| Input | Engine | Unchanged? |
|-------|--------|------------|
| Execution type + outcome | `deriveNextBestAction` | YES |
| `ActivityDerivedEvaluation` (embeds TASK-063) | `deriveObjectiveNextBestAction` | NEW |

---

## Decision rules (single action)

| Condition | Code | Priority |
|-----------|------|----------|
| Objective / activity `not_evaluated` | `NO_EVALUATION_ACTION` | low |
| Pending Work overdue | `RECORD_PENDING_ACTIVITY` | high |
| Pending occurrence (not occurred) | Kind-mapped existing code, else `RECORD_PENDING_ACTIVITY` | high if insufficient activity, else medium |
| Other pending Work | `RECORD_PENDING_ACTIVITY` | medium |
| `activity_contributes` and nothing pending | `CLOSE_LOOP` | low |
| `insufficient_activity` and nothing pending | Kind-mapped start/record code | medium |

Kind map (existing KC-020 codes): `first_meeting` → `SCHEDULE_MEETING`; `worker_development` / `connection` → `CONTINUE_DEVELOPMENT`; `ijtema_participation` → `RECORD_IJTEMA`; `baitulmaal` / `compliance_update` / `jih_portal` → `UPDATE_COMPLIANCE`; unknown kind with pending → `RECORD_PENDING_ACTIVITY`.

Route hints reuse existing `ROUTES`. Reason is English/machine-readable, not Urdu.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | N | Capability only |
| Services | Y | KC-020 execution package extended |
| Repositories | Y | Read via TASK-064 loader |
| Firestore | N | |
| Persistence | N | No writes |
| Rafeeq / voice / notifications | N | Do not import presenter |
| Per-execution NBA | N | `deriveNextBestAction` unchanged |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Parallel NBA inventing new outcomes | **HIGH** | Reuse KC-020 codes; do not change execution mapping |
| Action without evaluation rule | **HIGH** | `NO_EVALUATION_ACTION` |
| Recommendation/Rafeeq leakage | **HIGH** | No ranked list; no `presentNextBestActionForRafeeq` |
| Score | **HIGH** | No percentage |

---

## Phase 2 — Plan

1. Pure `deriveObjectiveNextBestAction`  
2. `loadObjectiveNextBestActions` over `loadActivityDerivedEvaluations`  
3. Focused verify; keep `verify:execution-automation` intact  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | not_evaluated → no guessed operational action; pending → record; contributes+done → CLOSE_LOOP; deterministic |
| Regression | TASK-063, TASK-064, KC-020 execution NBA, Phase 1/3–7, settings, reliability |
| Architecture | No new collection; no Urdu/Rafeeq import; execution NBA unchanged |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Proven software enhancement? | YES — evaluation layers exist; objective-level action is not derived yet |
| 4–5 | Config / ops only? | NO |
| 6–8 | Bootstrap / auth / authz? | NO |
| 9 | Repositories? | YES — read-only via TASK-064 |
| 10 | Firestore? | NO |
| 11 | Dashboard? | NO |
| 12 | Persistence writes? | NO |
| 13–16 | Routing / cache / async / races? | NO — derived read; route **hints** only |
| 17 | Production startup? | NO |
| 18 | Existing workflows? | YES — `deriveNextBestAction` + TASK-063/064 unchanged |

**May implementation start?** YES
