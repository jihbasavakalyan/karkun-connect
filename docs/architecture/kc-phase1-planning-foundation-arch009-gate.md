# KC Phase 1 Planning Foundation — KC-ARCH-009 Gate

**Ticket:** Post-campaign Phase 1 — Meqati Mansooba → Objective → Unit / Scope  
**Type:** New Feature  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 1 product/data design](./kc-phase1-product-data-design.md) · Frozen post-campaign architecture  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 gate + Phase 1 foundation certification record  
**Implementation status:** **PHASE 1 — CERTIFIED FOR DEVELOPMENT BASELINE** (TASK-011)

---

## ARCH-009 STATUS

**PASS** (design gate) · **Phase 5: READY WITH KNOWN LIMITATIONS** (implementation baseline)

Phase 1 foundation (TASK-005–010) is certified for continued local development. Production / Vercel deploy remains banned until a later production-ready ARCH-009 Phase 5 without the known browser-CRUD limitation.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Field | Value |
|-------|-------|
| Primary type | **New Feature** |
| Request | Introduce durable Admin-owned planning entities: Meqati Mansooba, Objective, Unit / Scope |
| Not | Bug fix, campaign reposition, Local Programme, Occurrence, Work, Responsibility, attendance redesign |

### 0.2 Proven need (not a speculative fix)

| Gap | Classification | Evidence |
|-----|----------------|----------|
| Meqati Mansooba absent | Architecture / product foundation | Phase 0 §3.3 / decision table — INTRODUCE Phase 1 |
| Structured Objective SoT absent | Architecture | Campaign `objective`/`objectives[]`, wizard constants, Health slices are copy/derived — Phase 0 + design §5 |
| Unit entity absent | Architecture | Only `place`/`area` strings + `DEFAULT_PLACE='Basavakalyan'` — Phase 0 §3.5; design §2.3 |
| Phase 0 certified | Baseline | `kc-post-campaign-phase0-system-mapping.md` — PHASE 0 — CERTIFIED |
| Product/data design complete | Baseline | `kc-phase1-product-data-design.md` — DESIGN ONLY |

**STOP rule satisfied:** Evidence is sufficient. No speculative “fix” of production ops. This is planned additive foundation.

### 0.3 Frozen-architecture / SoT compliance check

| Constraint | Design compliance | Result |
|------------|-------------------|--------|
| Frozen tree Mansooba → Objectives → (Campaign later) | Planning entities only; Campaign unchanged required shape | Pass |
| No duplicate people / Rukn / Karkun | Explicitly out of scope | Pass |
| No generic participation / programmeAssignment | Explicitly out of scope | Pass |
| No org hierarchy | Flat Unit; Basavakalyan first | Pass |
| No permission matrix / new roles | Keep `administrator` \| `rukn` | Pass |
| Roles evidence | `src/types/auth.types.ts` — `UserRole = 'administrator' \| 'rukn'` | Pass |
| Campaign SoT preserved | No required FKs; dual-write of Objectives into campaign strings forbidden | Pass |
| Campaign repo today | Read-only interface — `CampaignRepository` getAll/getById/getActive | Pass (Phase 1 does not require campaign writes) |
| Admin-only planning writes | Aligns with existing Admin Firestore patterns (`isAdministrator()`) | Pass |
| Production compatibility | Additive collections; existing docs remain valid | Pass |
| Current production operation | Live WI/BM/connections/campaigns untouched by design | Pass |
| Deferred decisions A–D | Unchanged; not resolved here | Pass |

**Architecture / product conflicts found:** **None.**

### 0.4 Impact Matrix

| Area | Impacted? | How | Notes |
|------|-----------|-----|-------|
| UI | Y (later impl) | Minimal Admin config surfaces only | No Rukn planning UI in Phase 1 |
| Pages | Y (later) | Admin settings / planning config routes | Additive |
| Components / Hooks | Y (later) | CRUD forms for three entities | Local-first first |
| Services | Y (later) | Thin services over new repos | No Health/WI rewrite |
| Repositories | Y | New repository interfaces + local/Firestore adapters | Pattern reuse |
| Firestore | Y | Proposed `meqatiMansoobas`, `objectives`, `units` | Not created in this gate |
| Authentication | N | Roles/claims unchanged | |
| Authorization | Y | Admin-only rules for new collections | Extend rules with schema |
| Session / Bootstrap | Y (careful) | Hydrate must not break critical path if collections empty | Non-critical / soft hydrate |
| Dashboard | N (Phase 1) | Health remains derived; not Objective SoT | |
| Metrics / Campaign Engine | N | No campaign reposition | Phase 2 |
| Automation / Notifications / Voice | N | | |
| API | N | Client Firestore path only | |
| Caching / Persistence | Y | New durable docs; KC-ARCH-001 | |
| Routing | Y (later) | Admin routes only | |
| State management | Y (later) | Stores/hydrate for new entities | |
| Background tasks | N | | |
| Performance | LOW→MED | Three small collections; avoid critical-path blocking | |
| Monitoring / Logging | Y (light) | Structured write logs on CRUD | |
| Security | Y | Admin-only writes; Rukn no write | |
| Dependencies | N | No new product dependency stack | |
| People / Connections / WI / BM | N | SoTs unchanged | |
| Campaign Setup wizard | N | Remains React-state-only | |

---

## Phase 1 — Regression risk analysis

| Domain | Risk | Why |
|--------|------|-----|
| Data integrity (existing SoTs) | **LOW** | No required mutations to campaigns/people/connections/compliance |
| Persistence (new collections) | **HIGH** | New durable writes; rules/schema must ship together |
| Authentication | **LOW** | No claim/role change |
| Authorization | **HIGH** | Mis-scoped rules could leak planning writes to Rukn or deny Admin |
| Bootstrap | **HIGH** | Adding hard-fail hydrate for empty new collections could block startup |
| Dashboard | **LOW** | Phase 1 must not rewire Health to Objective SoT |
| Repositories | **MEDIUM** | New interfaces; must not break CampaignRepository contract |
| Firestore | **HIGH** | New collections + indexes + rules |
| Concurrency | **MEDIUM** | Concurrent Admin edits — prefer per-doc writes, no shared blob LWW |
| Async / races | **MEDIUM** | Hydrate/listener ordering for new collections |
| Performance | **MEDIUM** | Full-collection hydrate of small planning sets acceptable initially |
| Cache | **LOW** | New caches isolated |
| UI / Navigation | **MEDIUM** | Admin-only; must not displace existing Admin ops IA |
| API | **LOW** | N/A |
| Security | **HIGH** | Admin-only CRUD required |
| Monitoring / Logging | **LOW** | Additive structured logs |

### HIGH items — required documentation

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Persistence of new collections | New SoTs | Bad writes / orphaned objectives | Per-entity docs; Objective requires `mansoobaId`; no nested objectives blob; await durable writes (KC-ARCH-001) | Local CRUD round-trip; failure banners; no silent success | Disable Admin UI writes; leave collections unread by ops surfaces |
| Authorization rules | New match blocks | Rukn write or Admin lockout | Admin create/update/archive only; Rukn read optional later — default **Admin read/write, Rukn none** until product asks | Rules unit tests / emulator; Rukn login cannot write | Revert rules deploy; collections unused by prod UI until READY |
| Bootstrap hydrate | Startup path | Infinite loading / failed critical hydrate | Treat planning collections as **non-critical / background** hydrate; empty set is valid | Cold start + hard refresh with empty collections | Remove from critical hydrate list |
| Security / Admin ownership | Privilege boundary | Scope leak | No new roles; no permission matrix; UI gated by `administrator` | Admin CRUD works; Rukn routes absent | Hide routes; deny rules |

### Operational classification

| Class | Verdict |
|-------|---------|
| Engineering? | **YES** — additive product foundation |
| Configuration / Infrastructure / Data / Onboarding / Ops-only? | **NO** as the primary class |

Proceed through ARCH-009 engineering gates — not an ops-only workaround.

---

## Phase 2 — Implementation plan (for TASK-005+; not executed here)

### Strategy

1. Local-first types + repository interfaces for Mansooba / Objective / Unit.  
2. Ship Firestore collection constants + schema + `firestore.rules` (+ indexes if queried) **together** (KC-ARCH-001).  
3. Seed one active Basavakalyan Unit (`placeAliases: ['Basavakalyan']`).  
4. Minimal Admin configuration UI (create / list / archive); **no Rukn surface**.  
5. Do **not** add campaign FKs, dual-write objectives into campaign strings, or change WI/BM/Health SoTs.  
6. Verify locally; **no production deploy** until Phase 5 READY for the implementation ticket.

### Files (expected; not created by this gate)

| Action | Area |
|--------|------|
| Create | Types for Mansooba / Objective / Unit |
| Create | Repository interfaces + local + Firestore adapters |
| Edit | `collections.ts` — add three collection names when implementing |
| Edit | `firestore.rules` — Admin-only match blocks |
| Edit | Indexes only if composite queries are used (`objectives` by `mansoobaId`+status) |
| Create | Minimal Admin config pages/components |
| Edit | Bootstrap hydrate — non-critical path only |
| Create | Verify script(s) for Phase 1 planning foundation |

### Repositories / collections / migrations

| Item | Plan |
|------|------|
| Repositories | New; do not change CampaignRepository required contract |
| Collections | `meqatiMansoobas`, `objectives`, `units` (per Phase 0 / design) |
| Migrations | None for existing docs; seed Unit only |
| Public interfaces | Additive Admin APIs only |
| Campaign / people / connections | No breaking field requirements |

### Order / commits / rollback / success

| Element | Plan |
|---------|------|
| Order | Types → repos (local) → rules/schema → Admin UI → soft hydrate → verify |
| Commits | One responsibility per commit |
| Rollback | Feature-flag or unroute Admin UI; rules deny; leave existing SoTs untouched |
| Success | Admin can CRUD three entities locally; existing Admin/Rukn workflows unchanged; empty planning data does not block startup |

---

## Phase 3 — Verification plan (before / during implementation)

| Type | Plan |
|------|------|
| Unit | Entity validation (mansoobaId required; no parentUnitId; status enums) |
| Integration | Local repo round-trip; Firestore emulator or local provider |
| Regression | Admin login, Rukn login, dashboard, campaign read, connections, WI, BM unchanged |
| Cold start / hard refresh | Empty planning collections → app reaches Admin shell |
| Fresh login / logout-login | Admin can open config; Rukn cannot |
| Repository / Firestore | Admin write succeeds; Rukn write denied |
| Authentication | Roles unchanged |
| Dashboard | Health numbers unchanged by planning CRUD |
| Performance | Planning hydrate does not block critical path |
| Production smoke | **Only after** Phase 5 READY — out of scope for first local commits |

### Evidence required (unacceptable: “looks fine”)

- Console / structured write logs for CRUD  
- Rules denial evidence for Rukn  
- Screenshots or traces of Admin list/create/archive  
- Cold-start timing / gate that critical hydrate succeeds with empty planning sets  
- Confirmation existing campaign doc still loads without Mansooba FKs  

---

## Go / No-Go checklist

| # | Question | Answer | Impact / Mitigation / Regression (if YES) |
|---|----------|--------|-------------------------------------------|
| 1 | Root cause / need proven? | **YES** | Phase 0 CERTIFIED + design; entities absent by inventory |
| 2 | Objective evidence available? | **YES** | Phase 0 mapping; design doc; auth/campaign/rules spot-checks |
| 3 | Actually a software problem? | **YES** | New durable planning foundation (engineering) |
| 4 | Could this be configuration only? | **NO** | Entities do not exist to configure |
| 5 | Could this be operational only? | **NO** | Not an ops workaround |
| 6 | Affect bootstrap? | **YES** | Impact: hydrate risk. Mitigation: non-critical hydrate. Regression: cold start / hard refresh with empty sets |
| 7 | Affect authentication? | **NO** | |
| 8 | Affect authorization? | **YES** | Impact: new rules. Mitigation: Admin-only. Regression: Rukn denied; Admin allowed |
| 9 | Affect repositories? | **YES** | Impact: new repos only. Mitigation: no CampaignRepository break. Regression: campaign getActive still works |
| 10 | Affect Firestore? | **YES** | Impact: new collections. Mitigation: schema+rules+indexes together. Regression: existing collections untouched |
| 11 | Affect dashboard? | **NO** (Phase 1 design forbids Health rewiring) | |
| 12 | Affect persistence? | **YES** | Impact: new durable writes. Mitigation: KC-ARCH-001 await/confirm. Regression: failure path visible |
| 13 | Affect routing? | **YES** | Impact: Admin config routes. Mitigation: additive; no Rukn routes. Regression: existing Admin nav still works |
| 14 | Affect caching? | **YES** | Impact: new store caches. Mitigation: isolated. Regression: existing store hydrate unchanged |
| 15 | Introduce async dependencies? | **YES** | Impact: optional listeners/hydrate. Mitigation: soft/background. Regression: startup without planning data |
| 16 | Could introduce race conditions? | **YES** | Impact: concurrent Admin edits. Mitigation: per-doc writes. Regression: two Admins update different objectives |
| 17 | Impact production startup? | **YES** (if mis-wired) | Impact: blocked boot. Mitigation: keep off critical path; no prod deploy until READY. Regression: cold start evidence |
| 18 | Impact existing workflows? | **YES** (UI presence only if mis-scoped) | Impact: IA clutter / accidental coupling. Mitigation: Admin-only minimal config; no WI/BM/campaign coupling. Regression: Connect, WI, BM, campaign read paths |

### GO / NO-GO

**GO** — Phase 1 implementation may begin (TASK-005), subject to:

1. Locked design in `kc-phase1-product-data-design.md`  
2. Mitigations for all HIGH risks above  
3. Local development / verification first  
4. No production / Vercel deploy until implementation ARCH-009 Phase 5 is not `NOT READY`  
5. Deferred product decisions A–D remain unresolved here  

---

## Blockers

**None.**

No genuine architecture conflict with the frozen post-campaign model, certified Phase 0 SoT boundaries, role model, or production data compatibility.

---

## Deferred decisions (unchanged)

| # | Decision | Status |
|---|----------|--------|
| A | Rukn Ijtema Present/Absent semantics | Deferred — Phase 5 product decision |
| B | KC-0104 amendment (Campaign no longer root) | Deferred — follow-on product doc |
| C | Objective `legacyKey` day-one mapping to Health/wizard ids | Optional; not required to start |
| D | Whether Mansooba `primaryUnitId` becomes required later | Optional; remains optional for seed |

ARCH-009 does **not** require resolving A–D before Phase 1 implementation begins.

---

## TASK-005 readiness

| Question | Answer |
|----------|--------|
| ARCH-009 Phases 0–3 + Go/No-Go complete? | **YES** |
| Design locked? | **YES** |
| Phase 0 certified baseline? | **YES** |
| May TASK-005 start (types + repository interfaces, local-first)? | **YES** |
| May Firestore/UI/production deploy start from this gate alone? | **NO** — follow design sequence TASK-005 → … → verify; deploy only after Phase 5 READY |

---

## Certification for this gate artifact (design gate — historical)

| Field | Value |
|-------|-------|
| ARCH-009 STATUS | **PASS** |
| Implementation code in TASK-004 | **None** |
| Collections created in TASK-004 | **None** |
| Production changed | **No** |
| Next (at gate time) | TASK-005 — types + repository interfaces (local-first) |

---

## PHASE 1 — CERTIFIED FOR DEVELOPMENT BASELINE (TASK-011)

Local integration review of the completed Phase 1 Planning Foundation (design + ARCH-009 gate + types/repos + persistence + Admin UI + UX hardening).

### Phase 4 — Regression audit (local)

| Area | Result |
|------|--------|
| Planning architecture | Mansooba root; Objective requires `mansoobaId`; Unit flat — PASS |
| Campaign / people / Rukn SoTs | Untouched by planning writes — PASS (verify script isolation + code review) |
| Application layer | UI → `getRepositories()` only; no planning service/store — PASS |
| Persistence | Local + Firestore; Admin-only rules; no delete; soft background hydrate — PASS |
| UI / authz | `/admin/planning` + nav; `ProtectedRoute allowedRole="administrator"`; TASK-010 locks intact — PASS |
| Unrelated Admin/Rukn nav | Planning additive before Settings; no Campaign/Karkun/Rukn route changes required — PASS |

### Phase 5 — Certification

| Field | Value |
|-------|-------|
| Decision | **PHASE 1 — CERTIFIED FOR DEVELOPMENT BASELINE** |
| ARCH-009 Phase 5 | **READY WITH KNOWN LIMITATIONS** |
| Architecture / design | Implemented as approved |
| Persistence | Verified (`verify:kc-phase1-planning-persistence` PASS) |
| Admin UI | Implemented (`AdminPlanningPage` at `/admin/planning`) |
| Local verification | `typecheck` PASS · `build` PASS · persistence verify PASS |
| Authenticated Admin browser CRUD | **Unverified** (credentials unavailable locally) — recorded limitation, not a new task |
| Production / Vercel deploy | **Not performed** |
| Phase 2 | **May proceed** under its own ARCH-009 gate |

### Known limitations

1. Authenticated Admin browser CRUD was not executed (no valid local Admin credentials).
2. No production deployment or production data testing.
3. Deferred product decisions A–D remain open.

### Phase 6 — Post-deploy

**Not applicable** — no production deploy in Phase 1.
