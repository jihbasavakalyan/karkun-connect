# KC Phase 7 Journey Actions — KC-ARCH-009 Gate

**Ticket:** BATCH-07B / TASK-057 + TASK-058 + TASK-059  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [TASK-054–056 gate](./kc-phase7-journey-dashboards-arch009-gate.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for development actions, follow-up visibility, and responsibility visibility on the Continuous Karkun Journey

TASK-060–062 / Phase 7 certification / Vercel / Firestore rules are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Derive the next development action, the next follow-up, and Phase 4 Responsibility visibility on the existing Continuous Karkun Journey read model |
| Not | New development / follow-up / journey collections, second Work or Responsibility model, generic task system, scores, Kanban, chat, Rafeeq, WI/BM dual-write, Vercel |

**STOP checks:**

| Check | Result |
|-------|--------|
| New development database required? | **NO** — visit / orientation / JIH / existing development signals |
| Second Work / FollowUp entity required? | **NO** — read existing follow-up records, Work, occurrences, participation |
| Second Responsibility model required? | **NO** — `isResponsibilityInForce` / existing `responsibilities` |
| Invented scores / day-count thresholds? | **NO** |
| Duplicate notifications? | **NO** — journey does not call notification evaluators |
| Persistence writes for dashboard visibility? | **NO** |

**Persistence decision:** No new SoT. Selectors only. Mutations stay on existing visit, follow-up, Work, and planning surfaces.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Journey strip shows derived action / follow-up / responsibility |
| Pages | Y | Connection Journey, Person 360, Rukn Home (existing strip/counts) |
| Components | Y | `ContinuousKarkunJourneyStrip` |
| Hooks | N | |
| Services | N | Selectors only |
| Repositories | Y | Read existing responsibility / work / unit / occurrence / programme |
| Firestore | N | No schema / rules / collections |
| Dashboard | Y | Derived journey rows |
| Notifications | N | Untouched |
| Persistence | N | No new writes |
| Routing | N | Existing routes only (`ruknVisitPath`, `ROUTES.RUKN`, WI/BM routes) |
| WI/BM dual-write | N | Untouched |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Second Work / task system | **HIGH** if follow-ups persist new records | Follow-up is a projection; Work mutations stay on `RuknWorkActionPanel` |
| Duplicate notifications | **HIGH** if occurrence notices are re-emitted | Do not call `evaluateActionableNotifications` / occurrence notification evaluator |
| Second Responsibility model | **HIGH** | Reuse `isResponsibilityInForce`; no tenure/status semantic change |
| Campaign 7-stage journey | **HIGH** if replaced | Keep `ConnectionProgressTracker` / Person 360 campaign journey |
| WI/BM / Excused | LOW | No file changes there |

---

## Phase 2 — Plan

1. Extend `continuousKarkunJourney` snapshot with derived `developmentAction`, `followUp`, `responsibilities`  
2. Render those rows on the existing journey strip (deep links only)  
3. Extend `verify:kc-phase7-journey-dashboards` for TASK-057–059  
4. Run typecheck, build, Phase 3/4/5/6/settings/reliability verifies  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | Development action from visit/JIH/orientation; follow-up from existing follow-up/Work/occurrence/participation; responsibility from Phase 4 in-force matching |
| Architecture | No new `FIRESTORE_COLLECTIONS`; no `saveDurable` in journey selectors |
| Regression | Phase 3 occurrence, Phase 4 Rukn action, Phase 5 activity/reporting, Phase 6 communication/notifications, settings, reliability |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Software enhancement with evidence? | YES — TASK-056 snapshot has stages only |
| 4–5 | Config / ops only? | NO |
| 6 | Bootstrap? | NO |
| 7–8 | Authn/z? | NO |
| 9–10 | Repos / Firestore schema? | NO writes; reads existing collections |
| 11 | Dashboard? | YES — derived rows; existing widgets kept |
| 12 | Persistence writes? | NO |
| 13 | New routes? | NO |
| 18 | Existing workflows? | YES — campaign journey, Work panel, notifications, follow-up store preserved |

**May implementation start?** YES
