# KC Phase 7 Admin Oversight — KC-ARCH-009 Gate

**Ticket:** BATCH-07C / TASK-060 + TASK-061  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [TASK-054–056](./kc-phase7-journey-dashboards-arch009-gate.md) · [TASK-057–059](./kc-phase7-journey-actions-arch009-gate.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Admin Organisational Picture and Exceptions / Attention

TASK-062 / Phase 7 certification / Vercel / Firestore rules are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Derived Admin organisational picture (journey + operational counts) and additional Attention exceptions from existing Work / journey / occurrence truth |
| Not | Org hierarchy, exception collection, attention database, ticketing, second inbox/notifications, BI snapshots, Vercel |

**STOP checks:**

| Check | Result |
|-------|--------|
| New organisation / exception entity required? | **NO** — selectors only |
| Second Karkun / Rukn / Connection / Responsibility model? | **NO** |
| Duplicate Inbox / notifications? | **NO** — Attention stays exceptions; queues stay Next Actions |
| Invented day-count / score rules? | **NO** — Phase 4 `canActOnWork` + existing journey signals |
| Persistence writes? | **NO** |

**Persistence decision:** No new SoT. Picture and exceptions are read-only projections. Mutations stay on existing Admin surfaces.

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Organisational Picture panel; Attention Required gains two exception rows |
| Pages | Y | Admin Command Center (existing home) |
| Components | Y | New picture panel; Attention panel reused |
| Repositories | Y | Read existing work / responsibility / occurrence / programme / unit |
| Firestore | N | No schema / rules / collections |
| Dashboard | Y | Derived picture + exceptions |
| Notifications / Inbox | N | Untouched |
| Persistence | N | No new writes |
| Routing | N | Existing routes only |
| WI/BM dual-write | N | Untouched |

---

## Phase 1 — Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Duplicate Attention / Next Actions | **HIGH** | Do not re-list WI queues, visit follow-ups, overdue Work, or Inbox |
| Duplicate notifications | **HIGH** | Do not call occurrence/notification evaluators |
| Second org hierarchy | **HIGH** | Flat counts from existing journey + planning records |
| WI/BM / Excused | LOW | No file changes there |

---

## Phase 2 — Plan

1. Org-wide continuous-journey stage counts (reuse `resolveContinuousKarkunJourney`)  
2. `buildAdminOrganisationalPicture` — journey + connections / responsibility / work / occurrence counts with existing routes  
3. Extend `buildAdminAttentionRequired` with unactionable Work (`canActOnWork`) and developed-without-participation  
4. Picture panel on existing Admin Command Center  
5. Extend `verify:kc-phase7-journey-dashboards`  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

| Type | Plan |
|------|------|
| Unit | Picture cells have existing routes; new exceptions have reason + destination; overdue-work still present once |
| Architecture | No new `FIRESTORE_COLLECTIONS`; no `saveDurable` in selectors |
| Regression | Phase 3/4/5/6/settings/reliability |
| Browser | UNVERIFIED if no credentials |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Software enhancement with evidence? | YES |
| 4–5 | Config / ops only? | NO |
| 6–8 | Bootstrap / authn / authz? | NO |
| 9–10 | Repos / Firestore schema? | Reads only |
| 11 | Dashboard? | YES — derived picture + Attention rows |
| 12 | Persistence writes? | NO |
| 13 | New routes? | NO |
| 18 | Existing workflows? | YES — Next Actions, Inbox, notifications, campaign journey kept |

**May implementation start?** YES
