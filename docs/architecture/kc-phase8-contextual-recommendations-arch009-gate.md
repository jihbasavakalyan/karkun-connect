# KC Phase 8 — Contextual Recommendations (TASK-066) — KC-ARCH-009 Gate

**Ticket:** BATCH-08A / TASK-066  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020  
**Authority:** [TASK-065 NBA](./kc-phase8-next-best-action-arch009-gate.md) · [TASK-064](./kc-phase8-activity-derived-evaluation-arch009-gate.md) · [TASK-063](./kc-phase8-objective-evaluation-arch009-gate.md) · [Phase 7 journey](./kc-phase7-certification.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for contextual recommendations around an already-selected NBA

TASK-067–070 / Rafeeq presentation / voice / monitoring / Vercel / Firestore rules / Phase 2 verify string-fix are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Explain **why** a TASK-065 NBA is relevant here and now, using existing evaluation + operational context |
| Not | Ranked feed, second NBA engine, score, AI/LLM, Urdu/Rafeeq, recommendation collection |

**STOP checks:**

| Check | Result |
|-------|--------|
| Re-derive NBA? | **NO** — consume `ObjectiveNextBestAction` as given |
| Multiple competing actions per Objective? | **NO** — one recommendation wrapping one NBA |
| Rank people / “who first”? | **NO** — identity refs from evidence IDs only, evidence order |
| Universal score? | **NO** |
| Rafeeq / Urdu this task? | **NO** |
| Durable recommendation collection? | **NO** — derived read model |

**Persistence decision:** No new SoT. Selector only.

---

## Layer

```text
Objective
   ↓
Evaluation                 TASK-063
   ↓
Activity Evidence          TASK-064
   ↓
Next Best Action           TASK-065  (already chosen)
   ↓
Context                    TASK-066  (this task)
   ↓
Recommendation
   ↓
Rafeeq Presentation        TASK-067  (out of scope)
```

| Layer | Answers |
|-------|---------|
| TASK-065 | What is the one action? |
| TASK-066 | Why is that action relevant here and now, and where can the user act? |

---

## Model

`buildObjectiveContextualRecommendation({ action, evaluation, refs })`

- `action` is authoritative for code / reason / priority / routeHint
- `evaluation` supplies TASK-063/064 evidence, period, counts
- `refs` optional Work / Occurrence / connection count / journey stage counts already in memory

Output includes: Objective identity, consumed NBA, why-now, supporting evidence (filtered, original order), timing (due / occurrence dates), destination (existing `ROUTES`), optional org connection/journey counts, optional subjects from evidence source IDs.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | N | Capability only |
| Services | Y | KC-020 execution package extended |
| Repositories | Y | Read via TASK-064 loader + existing Work/Occurrence |
| Firestore | N | |
| Persistence | N | No writes |
| Journey | N | Read `countContinuousJourneyByStage` / connection count |
| Rafeeq / voice | N | Do not import presenter |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Second NBA engine | **HIGH** | Pure builder never calls `deriveObjectiveNextBestAction` |
| Ranking / score | **HIGH** | Evidence order preserved; no rate field |
| Rafeeq leakage | **HIGH** | No Urdu; no presenter import |
| Invented people | **HIGH** | Subjects only from Work/Occurrence evidence IDs |

---

## Phase 2 — Plan

1. Pure `buildObjectiveContextualRecommendation`  
2. `loadObjectiveContextualRecommendations` = TASK-064 evals → TASK-065 NBA → context wrap  
3. Focused verify  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | Passed NBA is preserved even if evaluation would imply another code; why-now explainable; no score |
| Regression | TASK-063–065, KC-020, Phase 3–7, settings, reliability |
| Architecture | No collection; no presenter; no `deriveObjectiveNextBestAction(` in the builder |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Proven software enhancement? | YES — NBA exists; presentation needs structured why-now context |
| 4–5 | Config / ops only? | NO |
| 6–8 | Bootstrap / auth / authz? | NO |
| 9 | Repositories? | YES — read-only |
| 10 | Firestore? | NO |
| 11 | Dashboard? | NO |
| 12 | Persistence writes? | NO |
| 13–16 | Routing / cache / async / races? | NO — route **hints** reused |
| 17 | Production startup? | NO |
| 18 | Existing workflows? | YES — TASK-063–065 and execution NBA unchanged |

**May implementation start?** YES
