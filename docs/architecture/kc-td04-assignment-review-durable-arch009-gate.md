# TD-04 / KC-032 P1 — Durable Assignment Review Persistence — KC-ARCH-009 Gate

**Ticket:** TD-04 · KC-032 §4.3 P1 · KC-0103A P-19/P-20
**Pass:** A — Persistence Foundation · **B — Workflow Correctness**
**Type:** Enhancement (persistence + workflow)
**Standards:** KC-ARCH-009 · KC-ARCH-001
**Date:** 2026-08-12
**Coding authorized after:** Phases 0–3 + Go/No-Go below

---

## Pass B — Scope delta (workflow correctness)

| Item | Plan |
|------|------|
| Objective | Eliminate silent-success / reload / concurrency failures on top of Pass A |
| Touch | Service, store (as needed), AssignmentReviewQueue, ConnectedKarkunCard, ConnectionJourneyPage, CAS messages, verify |
| Ordering | Connection/assignment mutation **must succeed before** durable review resolve; resolve-after-mutation failure → retry resolve only |
| CAS | Second Admin resolve fails with clear operator error (no LWW) |
| Submit | Await durable create before success UI; failure never success |
| Do not | Redesign UI; rewrite assignment engines; GCP; deploy; unrelated collections |

### Pass B Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| Software problem? | YES — workflow correctness on Pass A foundation |
| Affect assignment engines? | NO — call existing APIs only |
| Affect UI redesign? | NO — busy/retry/error copy only |
| Affect Firestore schema? | NO — reuse Pass A docs/locks |
| Race / concurrent resolve? | YES — CAS + clear error |

**Pass B decision: GO**

---

## Phase 0 — Root cause & impact

### 0.1 Classification

**Enhancement** — make assignment review requests durable. Not a production incident bug fix.

### 0.2 Root cause (current gap)

| Finding | Classification | Evidence |
|---------|----------------|----------|
| Review lifecycle lives only in `assignmentReviewStore` memory | Implementation / Architecture | No `assignmentReviews` in `FIRESTORE_COLLECTIONS`; no hydrate; submit/decide sync success without Firestore await |
| Multi-device / reload loses Pending queue | Persistence | Store cleared on reload/reset; activity log durable but review entity is not |

### 0.3 Impact Matrix (Pass A)

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y (thin) | Await durable submit/decide only — no redesign |
| Pages / Components | Y (thin) | `ConnectedKarkunCard`, `ConnectionJourneyPage`, `AssignmentReviewQueue` await paths |
| Hooks | N | — |
| Services | Y | `assignmentReviewService` durable create/resolve |
| Repositories | Y | New `assignmentReview` repo (local + Firestore) |
| Firestore | Y | New `assignmentReviews` collection + rules |
| Authz | Y | Rules: Admin read/resolve; Rukn create/read own; Rukn cannot resolve; delete deny except pending-lock cleanup |
| Session / Bootstrap | Y (hydrate) | Background hydrate + store reload |
| Dashboard / metrics / campaign / voice / API | N | Untouched |
| Assignment / Transfer / Replace / Release engines | N | Pass A does not change connection mutation logic |
| Caching / Persistence | Y | Per-doc SyncCache + pending lock for duplicate Pending |
| Monitoring / Logging | Y | Structured create/resolve logs |
| Dependencies / GCP config | N | No new deps; no GCP mutations; no deploy |

---

## Phase 1 — Regression risk

| Category | Risk | Notes |
|----------|------|-------|
| Data Integrity | MEDIUM | New collection; pending lock + transaction create |
| Persistence | HIGH | Core change — await before success |
| Authentication | LOW | Claims reuse existing role/ruknId |
| Authorization | MEDIUM | New rules; must not weaken others |
| Bootstrap / Dashboard | MEDIUM | Soft-read hydrate; must not gate critical path |
| Repositories / Firestore | HIGH | New repo + hydrate wiring |
| Concurrency / Races | HIGH | Prepare CAS resolve + pending lock (no shared-blob LWW) |
| Performance | LOW | Background collection load |
| Caching | MEDIUM | SyncCache + store reload |
| UI / Navigation | LOW | Thin await only |
| Security | MEDIUM | Rukn scoped; Admin resolve only |
| Monitoring / Logging | LOW | Additive |

### HIGH mitigations

| Risk | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Persistence | New durable path | Lost reviews or false success | Await transactions; map persist errors | Verify script + typecheck | Revert Pass A commit |
| Repos/Firestore | New collection | Hydrate/rules drift | Ship collection + rules + repo together | Rules markers in verify | Revert rules + collection |
| Concurrency | Duplicate Pending / double resolve | Corrupt queue | Pending lock + Pending→Resolved CAS primitives | Marker asserts; Pass B uses them | Disable durable path |

**Operational class:** Engineering — proceed with code (not ops-only).

---

## Phase 2 — Implementation plan (Pass A only)

| Element | Plan |
|---------|------|
| Strategy | Per-entity `assignmentReviews/{reviewId}` + optional `pending_{karkunId}` lock docs; hydrate into existing store; durable create/read/update; local provider parity |
| Create | Interface, local/Firestore repos, ARCH-009 gate, verify script |
| Modify | `collections.ts`, `firestore.rules`, hydrate/listeners, store, service, thin UI awaits, `provider`, `storageKeys`, `package.json` |
| Do not | Redesign UI; change Transfer/Replace/Release engines; unrelated collections; GCP; deploy; commit |
| Order | Gate → collection/rules → repo/cache/hydrate → store/service → thin awaits → verify |
| Rollback | Revert Pass A files; rules restore prior |
| Success | Dedicated verify PASS; typecheck PASS; build if required; diff scoped |

---

## Phase 3 — Verification plan

| Type | Plan |
|------|------|
| Unit / static | `npm run verify:kc-td04-assignment-review-durable` — collection, rules, repo markers, no shared-blob LWW, await primitives |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` if repository policy requires (this repo `build` = `tsc -b && vite build`) |
| Regression | Diff limited to intended files; Transfer/Replace/Release engines untouched |
| Live Firestore / GCP | Not required for Pass A offline verify |
| Evidence | Verify exit 0; typecheck; build; git diff inspection |

---

## Go / No-Go

| # | Question | Answer | If YES — Impact / Mitigation / Tests |
|---|----------|--------|--------------------------------------|
| 1 | Root cause proven? | YES | Memory-only store; no collection |
| 2 | Objective evidence? | YES | Phase 1 discovery |
| 3 | Software problem? | YES | Persistence foundation |
| 4 | Configuration? | NO | — |
| 5 | Operational? | NO | — |
| 6 | Affect bootstrap? | YES | Soft background hydrate / Mitigation: soft-skip / Tests: verify markers |
| 7 | Affect authentication? | NO | — |
| 8 | Affect authorization? | YES | New rules only / Mitigation: scoped ruknId / Tests: rules asserts |
| 9 | Affect repositories? | YES | New assignmentReview / Mitigation: mirror connectionLedger pattern |
| 10 | Affect Firestore? | YES | New collection / Mitigation: per-doc + lock |
| 11 | Affect dashboard? | NO | Queue already exists |
| 12 | Affect persistence? | YES | Core Pass A |
| 13 | Affect routing? | NO | — |
| 14 | Affect caching? | YES | SyncCache |
| 15 | Introduce async deps? | YES | Durable await paths / thin UI await |
| 16 | Race conditions? | YES | Lock + CAS prep / Pass B completes claim UX |
| 17 | Impact production startup? | LOW | Soft background read |
| 18 | Impact existing workflows? | LOW | Submit/decide await; connection engines unchanged |

**Go / No-Go decision: GO for Pass A**

---

## Phase 4–6 (post-coding / deploy)

Recorded after implementation. Deploy banned until Phase 5 ≠ `NOT READY`. Pass A does not deploy.

### Phase 4 — Audit (Pass A)

| Item | Result |
|------|--------|
| Shared-blob LWW for reviews? | NO — per-doc + pending lock |
| Transfer/Replace/Release engines changed? | NO |
| UI redesign? | NO |
| Rules weakened? | NO (additive match only) |

### Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS** — Pass A foundation + Pass B workflow (await, CAS messages, connection-then-resolve retry). Live multi-device Firestore drill and rules deploy remain ops. No deploy in this pass.

### Phase 6

No deploy in Pass A/B.
