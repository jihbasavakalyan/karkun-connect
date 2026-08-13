# KC Phase 8 — Objective Evaluation (TASK-063) — KC-ARCH-009 Gate

**Ticket:** BATCH-08A / TASK-063  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020  
**Authority:** [KC-020 charter](./automation-philosophy-charter.md) · [Execution framework](./execution-automation-framework.md) · [Phase 7 certification](./kc-phase7-certification.md) · [Phase 1 planning](./kc-phase1-product-data-design.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for deterministic Objective evaluation (Evaluation layer only)

TASK-064–070 / NBA / Rafeeq / Vercel / Firestore rules are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Derived, explainable evaluation of existing Planning Objectives from operational evidence |
| Not | Universal performance score, evaluation collection, second Objective entity, NBA, Rafeeq, AI |

**STOP checks:**

| Check | Result |
|-------|--------|
| Second Objective entity required? | **NO** — PlanningObjective remains SoT |
| Durable evaluation collection required? | **NO** — KC-020 already evaluates in-memory on execution close; TASK-063 is a read model |
| Universal percentage / quality score? | **NO** — explicit states only |
| NBA / Rafeeq this task? | **NO** |

**Persistence decision:** No new SoT. Selectors only.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | N | Capability only; later tasks present |
| Services | Y | KC-020 evaluation package extended |
| Repositories | Y | Read existing objective / campaign / programme / occurrence / work / responsibility |
| Firestore | N | No schema / rules / collections |
| Dashboard | N | |
| Notifications | N | |
| Persistence | N | No new writes |
| WI/BM dual-write | N | Untouched |
| Phase 7 journey | N | Read signals only |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Parallel evaluation engine | **HIGH** | Reuse `evaluateCampaignObjective` + Planning Objective selector in `src/execution/` |
| Invented scores | **HIGH** | States: `not_evaluated` / `insufficient_evidence` / `evidence_present` only |
| NBA / Rafeeq leakage | **HIGH** | Do not import `deriveNextBestAction` or Rafeeq presenter |
| Objective SoT mutation | **HIGH** | Read `PlanningObjective`; no `saveDurable` |

---

## Phase 2 — Plan

1. `evaluatePlanningObjective` derived selector (evidence + explicit state + explanation)  
2. `loadPlanningObjectiveEvaluations` reads existing repos  
3. Map `legacyKey` to existing `CampaignObjectiveKind` only when exact  
4. Focused verify script; keep `verify:execution-automation` intact  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | Not evaluated vs insufficient evidence vs evidence present; no score field; deterministic |
| Regression | KC-020, Phase 1–7, settings, reliability |
| Architecture | No new collection; no NBA/Rafeeq imports |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Software enhancement with evidence? | YES — KC-020 evaluates executions; Planning Objectives have no current-state evaluator |
| 4–5 | Config / ops only? | NO |
| 6–8 | Bootstrap / auth? | NO |
| 9–10 | Repos / Firestore schema? | Reads only |
| 11 | Dashboard? | NO |
| 12 | Persistence writes? | NO |
| 18 | Existing workflows? | YES — KC-020 per-execution evaluation unchanged |

**May implementation start?** YES
