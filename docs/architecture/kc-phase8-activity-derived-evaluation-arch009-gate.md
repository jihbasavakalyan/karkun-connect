# KC Phase 8 — Activity-Derived Evaluation (TASK-064) — KC-ARCH-009 Gate

**Ticket:** BATCH-08A / TASK-064  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020  
**Authority:** [TASK-063 Objective Evaluation](./kc-phase8-objective-evaluation-arch009-gate.md) · [Phase 5 activity reporting](./kc-phase5-mansooba-activity-reporting-arch009-gate.md) · [Phase 5 activity tracking](./kc-phase5-activity-tracking-arch009-gate.md) · [KC-020 charter](./automation-philosophy-charter.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for activity-derived evaluation (Evaluation layer only)

TASK-065–070 / NBA / Rafeeq / Vercel / Firestore rules / Phase 2 verify string-fix are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Determine how **actual recorded activity** contributes to a TASK-063 Objective evaluation |
| Not | Universal performance score, evaluation collection, second Objective, NBA, Rafeeq, AI, Phase 5 report rewrite |

**STOP checks:**

| Check | Result |
|-------|--------|
| Second Objective entity required? | **NO** — PlanningObjective remains SoT |
| Durable evaluation collection required? | **NO** — derived read model |
| Universal percentage / quality score? | **NO** — counts are facts; no completion rate formula |
| Treat scheduled-only as activity? | **NO** — scheduled ≠ occurred/completed |
| NBA / Rafeeq this task? | **NO** |
| Fix pre-existing Phase 2 provider string verify? | **NO** |

**Persistence decision:** No new SoT. Selectors only.

---

## Distinction from TASK-063

```text
Operational Data
      ↓
Objective Evaluation          TASK-063  (what evidence exists?)
      ↓
Activity-Derived Evaluation   TASK-064  (how actual activity contributes?)
      ↓
Next Best Action              TASK-065  (out of scope)
```

| Layer | Answers | Counts as positive |
|-------|---------|--------------------|
| TASK-063 | What evidence currently exists toward an Objective? | Campaign/programme links, occurrences in window, open Work, in-force Responsibility, kind-matched journey snapshots, execution evaluations |
| TASK-064 | How does **actual activity** contribute? | Occurrence occurred/completed, WI Present/Absent marks, BM Contributed/Pending marks, Work `done`, KC-020 execution `advanced` |

Journey snapshot signals (visit / development / participation / JIH) remain TASK-063 evidence. They are **not** period-scoped activity (Phase 5 already records `orientation_not_period_scoped`). TASK-064 must not treat them as activity contribution.

Where an Objective is `not_evaluated`, activity is **not interpreted**.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | N | Capability only; later tasks present |
| Services | Y | KC-020 evaluation package extended |
| Repositories | Y | Read existing planning + activity sources |
| Firestore | N | No schema / rules / collections |
| Dashboard | N | |
| Notifications | N | |
| Persistence | N | No new writes |
| WI/BM dual-write | N | Read existing marks only |
| Phase 5 reporting | N | Reuse `buildMansoobaActivityReport`; do not rewrite |
| Phase 7 journey | N | Journey snapshots not re-interpreted as period activity |

**Reuse:** `evaluatePlanningObjective`, `buildMansoobaActivityReport`, WI/BM stores, Work/Occurrence SoTs, `resolveMansoobaReportPeriod`.

**Reject:** performance score, activity-evaluation collection, duplicate WI/BM, NBA, Rafeeq.

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Invented scores | **HIGH** | States only: `not_evaluated` / `insufficient_activity` / `activity_contributes`. Counts without a rate |
| Scheduled counted as done | **HIGH** | Occurred/completed/marks/`done`/`advanced` only |
| NBA / Rafeeq leakage | **HIGH** | Do not import `deriveNextBestAction` or Rafeeq presenter |
| WI/BM SoT mutation | **HIGH** | Read-only; no save |
| Parallel activity engine | **MEDIUM** | Reuse Phase 5 report builder |
| Work attributed to wrong Objective | **MEDIUM** | Work only when programme units for that Objective include the Work unit (Phase 5 primary-unit gap reused, not a new FK) |

---

## Phase 2 — Plan

1. Pure `evaluateActivityDerivedObjective` consuming a TASK-063 evaluation + Phase 5 activity rows  
2. `loadActivityDerivedEvaluations` reads existing repos + WI/BM stores  
3. Focused verify script; keep TASK-063 and Phase 5 verifies intact  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | not_evaluated passthrough; scheduled-only ≠ activity; occurred/WI/BM/work-done/advanced contribute; no score field |
| Regression | TASK-063, KC-020, Phase 1, Phase 3–7, settings, reliability. Do **not** “fix” Phase 2 local-programme string verify |
| Architecture | No new collection; no NBA/Rafeeq imports; Phase 5 `no_approved_performance_score` gap remains |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1 | Root cause proven? | YES — TASK-063 evidence includes structure/snapshots; it does not say whether activity occurred |
| 2 | Objective evidence available? | YES — Phase 5 report + WI/BM marks + Work + KC-020 execution progress |
| 3 | Software problem? | YES |
| 4 | Configuration only? | NO |
| 5 | Operational only? | NO |
| 6–8 | Bootstrap / auth / authz? | NO |
| 9 | Repositories? | YES — read-only `loadAll` + existing WI/BM stores |
| 10 | Firestore schema? | NO |
| 11 | Dashboard? | NO |
| 12 | Persistence writes? | NO |
| 13–14 | Routing / cache? | NO |
| 15–16 | Async / races? | NO — derived read |
| 17 | Production startup? | NO |
| 18 | Existing workflows? | YES — TASK-063 and Phase 5 builders unchanged |

**May implementation start?** YES
