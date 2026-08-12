# KC Phase 2 Local Programme — KC-ARCH-009 Gate

**Ticket:** TASK-013 — Post-campaign Phase 2 — Campaign → Local Programme  
**Type:** New Feature (Local Programme) + Enhancement (optional additive Campaign FKs / write path)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 1 — CERTIFIED FOR DEVELOPMENT BASELINE](./kc-phase1-planning-foundation-arch009-gate.md) · [Phase 2 product/data design](./kc-phase2-product-data-design.md) · Frozen post-campaign architecture  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for Phase 2 implementation (design gate only)  
**Implementation status:** **NOT STARTED** — this gate does not authorize code, collections, UI, or deploy

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

Phase 2 implementation may begin under subsequent tickets (TASK-014+), subject to the locked design, HIGH-risk mitigations below, local-first verification, and no production / Vercel deploy until implementation Phase 5 is not `NOT READY`.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Field | Value |
|-------|-------|
| Primary type | **New Feature** |
| Secondary | **Enhancement** (optional additive Campaign `mansoobaId` / `objectiveIds` + durable Campaign write path if Admin linking is in scope) |
| Request | Introduce durable Admin-owned Local Programme under existing Campaign (1 → many); reposition Campaign under Mansooba → Objectives without replacing Campaign |
| Not | Occurrence engine, WI/BM rewrite, generic participation, Campaign Setup persistence mandate, KC-0104 rewrite, production cutover |

### 0.2 Proven need (not a speculative fix)

| Gap | Classification | Evidence |
|-----|----------------|----------|
| Local Programme absent as durable entity | Architecture / product foundation | Phase 0 §3.4 — Activities IA (`ACTIVITIES_MODULES`) is presentation only; decision table INTRODUCE Phase 2 |
| Campaign is production SoT but architectural root must move under Mansooba → Objectives | Architecture | Phase 0 §3.3 — REUSE + REPOSITION; Phase 2 design §4 |
| Campaign repository is read-only today | Architecture / implementation boundary | `CampaignRepository` — `getAll` / `getById` / `getActive` only (`src/repositories/interfaces/CampaignRepository.ts`) |
| Optional Campaign FKs not present on type | Architecture | `CampaignListItem` has free-text `objective` / `objectives[]` only (`src/constants/mockMissions.ts`); no `mansoobaId` / `objectiveIds` |
| Phase 0 certified; Phase 1 certified; Phase 2 design complete | Baseline | Phase 0 CERTIFIED · Phase 1 CERTIFIED FOR DEVELOPMENT BASELINE · commit `548cd8c` Phase 2 design |

**STOP rule satisfied:** Evidence is sufficient. No speculative production ops “fix.” This is planned additive foundation per frozen sequence.

### 0.3 Frozen-architecture / SoT compliance check

| Constraint | Design compliance | Result |
|------------|-------------------|--------|
| Frozen tree … → Campaign → Local Programme → Occurrence | Phase 2 introduces Local Programme only; Occurrence out of scope | Pass |
| Campaign REUSE + REPOSITION (not replace / not second Campaign) | Existing `campaigns` retained; no clone entity | Pass |
| Local Programme INTRODUCE | New `localProgrammes`; Admin-owned; requires `campaignId` | Pass |
| No generic participation / programmeAssignment | Explicitly forbidden in Phase 2 design §9 | Pass |
| WI / BM remain SoTs (wrap later) | Design forbids rewrite; kinds reference tracks only | Pass |
| No org hierarchy | Reuse Phase 1 flat Unit; optional `unitId` | Pass |
| No permission matrix / new roles | Keep `administrator` \| `rukn` (`src/types/auth.types.ts`) | Pass |
| Campaign required shape preserved | Missing FKs / missing children valid indefinitely | Pass |
| Objective dual-write forbidden | Structured Objective SoT stays Phase 1; campaign strings remain copy | Pass |
| Campaign rules already Admin create/update; no client delete | `firestore.rules` match `/campaigns` — align any new write API with merge/additive semantics | Pass |
| Phase 1 soft hydrate pattern reusable | `applyPlanningHydrate` / soft-read — non-critical path | Pass |
| Phase 0 index hint listed `mansoobaId` on programmes | Phase 2 design routes Mansooba via Campaign; **no direct programme `mansoobaId`** — indexes follow design (`campaignId` + status), not the earlier hint | Pass (design refinement; not a conflict) |
| Deferred KC-0104 / P2 product decisions | Unresolved here unless GO-blocking | Pass |

**Architecture / product conflicts found:** **None.**

Approved TASK-012 direction (Campaign 1 → many Local Programme) aligns with Phase 0 dispositions. No silent redesign required.

### 0.4 Impact Matrix

| Area | Impacted? | How | Notes |
|------|-----------|-----|-------|
| UI | Y (later impl) | Minimal Admin Local Programme config under Campaign; optional Campaign FK linking | No Rukn programme CRUD |
| Pages | Y (later) | Additive Admin routes / panels | Do not replace `/admin/campaign` reads |
| Components / Hooks | Y (later) | CRUD forms for Local Programme | Local-first first |
| Services | Y (later) | Thin services over new repos; optional Campaign save helper | No Health/WI/BM rewrite |
| Repositories | Y | New `LocalProgrammeRepository` (+ local/Firestore); **possible** Campaign `saveDurable` extension for optional FKs | Preserve read contract |
| Firestore | Y | Proposed `localProgrammes`; optional additive campaign fields; rules + indexes together | Not created in this gate |
| Authentication | N | Roles/claims unchanged | |
| Authorization | Y | Admin-only programme writes (mirror Phase 1 planning rules) | |
| Session / Bootstrap | Y (careful) | Soft / background hydrate; empty programmes must not block startup | Reuse Phase 1 pattern |
| Dashboard | N (Phase 2) | Do not treat Local Programme as Health SoT | |
| Metrics / Campaign Engine | MEDIUM | Campaign reads (`getActive`) must remain valid | Additive FKs only |
| Automation / Notifications / Voice | N | | |
| API | N | Client Firestore path only | |
| Caching / Persistence | Y | New durable docs; optional Campaign merge writes; KC-ARCH-001 | |
| Routing | Y (later) | Admin-only additive | |
| State management | Y (later) | Soft hydrate / cache for programmes | |
| Background tasks | N | Occurrence generation out of scope | |
| Performance | LOW→MED | Small collection; avoid critical-path blocking | |
| Monitoring / Logging | Y (light) | Structured write logs on CRUD | |
| Security | Y | Admin-only create/update; `allow delete: if false` | |
| Dependencies | N | | |
| People / Connections | N | No required `campaignId` / `programmeId` | |
| WI / BM compliance SoTs | N | Isolation required — wrap later only | |
| Campaign Setup wizard | N unless PRODUCT P2-B chooses otherwise | Remains React-state-only by default | |
| Occurrence / Calendar | N | Explicit scope boundary | |
| Participation / programme-member tables | N | Forbidden | |

### 0.5 Assessment targets (TASK-013 required evidence themes)

| # | Theme | Gate finding |
|---|-------|--------------|
| 1 | Campaign write-path introduction | **HIGH** — interface is read-only; rules already allow Admin writes; any new save must be additive merge for optional FKs only (no LWW wipe) |
| 2 | Local Programme persistence | **HIGH** — new collection + schema + rules + repo together (KC-ARCH-001) |
| 3 | Orphan programme prevention | **HIGH** — require existing `campaignId` on save; archive don’t delete; no hard-delete of parent campaigns |
| 4 | Bootstrap / hydrate impact | **HIGH** — soft / non-critical hydrate; empty set valid (Phase 1 precedent) |
| 5 | Objective dual-write risk | **HIGH** (if Campaign FK linking shipped) — forbid syncing Objective titles into `objectives[]` |
| 6 | Admin-only authorization | **HIGH** — mirror Phase 1 `isAdministrator()` create/update; no Rukn write |
| 7 | Existing Campaign compatibility | Pass by design — required fields unchanged; missing FKs/children valid |
| 8 | Empty Local Programme validity | Pass — empty children is normal state |
| 9 | Missing optional Campaign FKs validity | Pass — optional indefinitely |
| 10 | WI / BM isolation | Pass — Phase 2 forbids SoT rewrite; kinds are labels only |
| 11 | Scope vs Occurrence | Pass — frequency is config hint only; no generator |
| 12 | Scope vs generic participation | Pass — forbidden; connections remain relationship SoT |
| 13 | Backward compatibility | Pass — additive law from Phase 0 §8 |
| 14 | Rollback strategy | Unroute Admin UI; deny/unused rules; leave campaigns/WI/BM untouched |
| 15 | Local verification strategy | Local CRUD + soft hydrate + campaign read regression + Rukn denial — see Phase 3 |

---

## Phase 1 — Regression risk analysis

| Domain | Risk | Why |
|--------|------|-----|
| Data integrity (existing SoTs) | **MEDIUM** | Campaign optional FKs must not rewrite required fields or dual-write objectives |
| Persistence (new programmes + optional Campaign writes) | **HIGH** | New durable writes; Campaign write path newly exposed via repo |
| Authentication | **LOW** | No claim/role change |
| Authorization | **HIGH** | Mis-scoped rules could leak programme writes to Rukn |
| Bootstrap | **HIGH** | Hard-fail hydrate of empty `localProgrammes` could block startup |
| Dashboard | **LOW** | Must not rewire Health to Local Programme |
| Repositories | **HIGH** | New Local Programme repos; Campaign read contract must remain; optional `saveDurable` is a public-interface change |
| Firestore | **HIGH** | New collection + rules + optional indexes |
| Concurrency | **MEDIUM** | Concurrent Admin edits — per-doc writes; no shared blob LWW on campaigns |
| Async / races | **MEDIUM** | Soft hydrate / listener ordering |
| Performance | **MEDIUM** | Full-collection hydrate of small programme set acceptable initially |
| Cache | **LOW→MEDIUM** | New programme cache isolated; Campaign cache must tolerate additive fields |
| UI / Navigation | **MEDIUM** | Admin-only; must not displace existing Campaign / Activities / WI / BM IA |
| API | **LOW** | N/A |
| Security | **HIGH** | Admin ownership required |
| Monitoring / Logging | **LOW** | Additive structured logs |
| WI / BM / connections / people | **LOW** if isolation held | Scope creep would elevate to HIGH — treat as controlled boundary |
| Occurrence / participation creep | **MEDIUM** (process) | Adjacent frozen entities — ticket scope must stay config-only |

### HIGH items — required documentation

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Campaign write-path introduction | `CampaignRepository` is read-only; production patches historically via admin scripts; rules already allow Admin create/update | Accidental full-doc replace / wipe of live campaign copy fields; broken `getActive` consumers | If Admin linking is in scope: add **additive** `saveDurable` (or equivalent) that merges **only** optional `mansoobaId` / `objectiveIds` (and audit metadata); never replace required shape; await durable write (KC-ARCH-001); do **not** require FKs for reads | Campaign without FKs still loads; `getActive()` unchanged; structured write logs; no silent success | Remove/disable Campaign write UI; leave existing docs; repo can remain read-only again |
| Local Programme persistence | New SoT collection | Bad writes; schema/rules drift | Per-entity docs; `campaignId` + `name` + `kind` + `status` required; ship `collections` + types + rules (+ indexes if queried) together; await durable writes | Local CRUD round-trip; failure banners | Unroute Admin UI; leave collection unread by ops surfaces |
| Orphan / detached programmes | Parent Campaign required | Programmes pointing at missing campaigns; confusing Admin IA | Validate parent Campaign exists on save; archive via `status` (no client delete); preserve campaign no-delete rule | Save with invalid `campaignId` rejected; archive path works | Stop writes; archive orphans manually if any test data |
| Bootstrap hydrate | Startup path | Infinite loading / failed critical hydrate | Treat `localProgrammes` as **non-critical / soft background** hydrate (same pattern as Phase 1 `applyPlanningHydrate` / soft-read); empty set is valid | Cold start + hard refresh with empty programmes | Remove from critical hydrate list |
| Objective dual-write | Copy vs structured SoT | Campaign string arrays become fake Objective SoT | Forbid writing Objective titles into `objectives[]` as sync; `objectiveIds` are id links only; free-text fields remain copy | Code review + test that FK link does not mutate `objectives[]` titles from Objective docs | Revert FK write helper; leave strings untouched |
| Authorization / Admin-only | Privilege boundary | Rukn write or Admin lockout | Admin create/update only; default Admin read/write, Rukn none (until product asks); `allow delete: if false`; UI gated by `administrator` | Rules tests / emulator; Rukn cannot write | Revert rules; hide routes |
| Security / ownership | Same as authz | Scope leak | No new roles; no permission matrix | Admin CRUD works; Rukn routes absent | Hide routes; deny rules |

### Operational classification

| Class | Verdict |
|-------|---------|
| Engineering? | **YES** — additive product foundation |
| Configuration / Infrastructure / Data / Onboarding / Ops-only? | **NO** as the primary class |

Proceed through ARCH-009 engineering gates — not an ops-only workaround.

---

## Phase 2 — Implementation plan (for TASK-014+; not executed here)

### Strategy

1. Local-first types + `LocalProgrammeRepository` interface (+ local adapter).  
2. Ship Firestore collection constant + schema + `firestore.rules` (+ indexes if `campaignId`+status queried) **together** (KC-ARCH-001).  
3. Soft / background hydrate for `localProgrammes` — empty is valid; never block critical startup.  
4. Minimal Admin UI: list / create / edit / archive Local Programmes under a selected Campaign.  
5. Optional (product-scoped): additive Campaign `mansoobaId` / `objectiveIds` + **merge-only** Campaign write path — only if Admin linking is included in the implementation ticket.  
6. Do **not** implement Occurrence generation, WI/BM rewrite, participation tables, or Campaign Setup persistence unless PRODUCT P2-B explicitly expands that ticket.  
7. Verify locally; **no production / Vercel deploy** until Phase 5 READY for the implementation ticket.

### Boundaries (hard)

| In scope | Out of scope |
|----------|--------------|
| `localProgrammes` entity + Admin CRUD | Occurrence / calendar engine |
| Campaign 1 → many programmes | Generic participation / programme-member tables |
| Optional additive Campaign FKs | Second Campaign entity |
| Reuse Phase 1 Unit (`unitId` optional) | Requiring `unitId` on people |
| ProgrammeKind / frequency **config** | WI/BM SoT replacement |
| Soft hydrate | Hard-fail bootstrap on empty programmes |
| Local verification | Production seed rewrite / Vercel as part of foundation |

### Files (expected; not created by this gate)

| Action | Area |
|--------|------|
| Create | Types for Local Programme / ProgrammeKind / ProgrammeFrequency |
| Create | Repository interface + local + Firestore adapters |
| Edit | `collections.ts` — add `localProgrammes` when implementing |
| Edit | `firestore.rules` — Admin-only match block; `allow delete: if false` |
| Edit | Indexes only if composite queries used (`campaignId` + status; optional `unitId`) |
| Edit (optional) | `CampaignListItem` + Campaign repository — additive optional FKs + merge save |
| Create | Minimal Admin Local Programme UI under Campaign context |
| Edit | Bootstrap hydrate — non-critical / soft path only |
| Create | Verify script(s) for Phase 2 local programme persistence / isolation |

### Repositories / collections / migrations

| Item | Plan |
|------|------|
| Repositories | New Local Programme repos; Campaign read API preserved; optional Campaign write extension |
| Collections | `localProgrammes` (proposed); `campaigns` additive fields only |
| Migrations | None required for existing campaigns to load; optional later Admin/script seed (P2-C) — reversible |
| Public interfaces | Additive Admin APIs; Campaign `getAll` / `getById` / `getActive` remain |
| WI / BM / people / connections | No breaking field requirements |

### Order / commits / rollback / success

| Element | Plan |
|---------|------|
| Order | Types → repos (local) → rules/schema → soft hydrate → Admin UI → optional Campaign FK write → verify |
| Commits | One responsibility per commit |
| Rollback | Unroute Admin UI; rules deny / unused; Campaign write UI off; existing SoTs untouched |
| Success | Admin can CRUD Local Programmes locally under a Campaign; campaigns without FKs/children still load; `getActive` works; Rukn cannot write; empty programmes do not block cold start; WI/BM/people/connections unchanged |

---

## Phase 3 — Verification / evidence plan

| Type | Plan |
|------|------|
| Unit | Validation: `campaignId` required; parent exists; kind/status enums; optional dates/frequency shape; uniqueness recommendation when implemented |
| Integration | Local repo round-trip; Firestore emulator or local provider |
| Regression | Admin login, Rukn login, dashboard, campaign library / `getActive`, connections, WI, BM unchanged |
| Cold start / hard refresh | Empty `localProgrammes` → app reaches Admin shell |
| Fresh login / logout-login | Admin can open programme config; Rukn cannot |
| Repository / Firestore | Admin write succeeds; Rukn write denied; campaign docs without FKs still deserialize |
| Authentication | Roles unchanged |
| Dashboard | Health numbers unchanged by programme CRUD |
| Performance | Programme hydrate does not block critical path |
| Objective dual-write | Linking `objectiveIds` does not rewrite `objectives[]` copy |
| Orphan prevention | Invalid `campaignId` rejected |
| Production smoke | **Only after** Phase 5 READY — out of scope for first local commits |

### Evidence required (unacceptable: “looks fine”)

- Console / structured write logs for Local Programme (and optional Campaign FK) CRUD  
- Rules denial evidence for Rukn  
- Screenshots or traces of Admin list/create/archive under a Campaign  
- Cold-start evidence that critical hydrate succeeds with empty programmes  
- Confirmation existing campaign doc loads without `mansoobaId` / `objectiveIds` / children  
- Confirmation WI/BM/compliance schemas and Campaign required fields unchanged  

---

## Go / No-Go checklist

| # | Question | Answer | Impact / Mitigation / Regression (if YES) |
|---|----------|--------|-------------------------------------------|
| 1 | Root cause / need proven? | **YES** | Phase 0 CERTIFIED + Phase 2 design; Local Programme absent by inventory |
| 2 | Objective evidence available? | **YES** | Phase 0 mapping; Phase 2 design; CampaignRepository / rules / CampaignListItem / Phase 1 soft-hydrate spot-checks |
| 3 | Actually a software problem? | **YES** | New durable Local Programme foundation + optional Campaign FK write path |
| 4 | Could this be configuration only? | **NO** | Entity / collection / repos do not exist to configure |
| 5 | Could this be operational only? | **NO** | Not an ops workaround |
| 6 | Affect bootstrap? | **YES** | Impact: hydrate risk. Mitigation: non-critical soft hydrate. Regression: cold start / hard refresh with empty programmes |
| 7 | Affect authentication? | **NO** | |
| 8 | Affect authorization? | **YES** | Impact: new rules. Mitigation: Admin-only. Regression: Rukn denied; Admin allowed |
| 9 | Affect repositories? | **YES** | Impact: new Local Programme repos; optional Campaign save. Mitigation: preserve Campaign read contract; merge-only writes. Regression: `getActive` / library reads |
| 10 | Affect Firestore? | **YES** | Impact: new collection + optional campaign fields. Mitigation: schema+rules+indexes together. Regression: existing collections untouched |
| 11 | Affect dashboard? | **NO** (Phase 2 design forbids Health rewiring) | |
| 12 | Affect persistence? | **YES** | Impact: new durable writes + possible Campaign merge writes. Mitigation: KC-ARCH-001 await/confirm. Regression: failure path visible |
| 13 | Affect routing? | **YES** | Impact: Admin config routes. Mitigation: additive; no Rukn routes. Regression: existing Admin nav still works |
| 14 | Affect caching? | **YES** | Impact: new programme cache; Campaign cache must tolerate additive fields. Mitigation: isolated soft hydrate. Regression: campaign read with/without FKs |
| 15 | Introduce async dependencies? | **YES** | Impact: optional soft hydrate. Mitigation: background / soft-empty. Regression: startup without programmes |
| 16 | Could introduce race conditions? | **YES** | Impact: concurrent Admin edits. Mitigation: per-doc writes; no campaign LWW wipe. Regression: two Admins update different programmes |
| 17 | Impact production startup? | **YES** (if mis-wired) | Impact: blocked boot. Mitigation: keep off critical path; no prod deploy until READY. Regression: cold start evidence |
| 18 | Impact existing workflows? | **YES** (if mis-scoped) | Impact: Campaign IA clutter; accidental WI/BM/Occurrence coupling. Mitigation: Admin-only minimal config; strict out-of-scope list. Regression: Campaign read, Connect, WI, BM paths |

### GO / NO-GO

**GO** — Phase 2 implementation may begin (TASK-014+), subject to:

1. Locked design in `kc-phase2-product-data-design.md`  
2. Mitigations for all HIGH risks above  
3. Local development / verification first  
4. No production / Vercel deploy until implementation ARCH-009 Phase 5 is not `NOT READY`  
5. Deferred product decisions (P2-A–D, KC-0104 B) remain unresolved here unless a later ticket explicitly expands scope  

---

## High-risk mitigations (summary)

| HIGH risk | Required control before / during implementation |
|-----------|--------------------------------------------------|
| Campaign write-path | Merge-only optional FKs; preserve required Campaign shape; await durable writes; keep reads working without FKs |
| Local Programme persistence | Schema + rules + repo together; required `campaignId` / identity fields; KC-ARCH-001 |
| Orphan programmes | Validate parent Campaign; archive don’t delete |
| Bootstrap | Soft / non-critical hydrate; empty valid |
| Objective dual-write | Never sync Objective titles into `objectives[]` |
| Admin-only authz | `isAdministrator()` create/update; no client delete; no Rukn write UI |

---

## Blockers

**None.**

No genuine architecture conflict with the frozen post-campaign model, certified Phase 0 SoT boundaries, Phase 1 baseline, approved Phase 2 design, role model, or production data compatibility.

---

## Deferred product decisions (unchanged / not GO-blocking)

| # | Decision | Status |
|---|----------|--------|
| P2-A | Independent Local Programmes (no `campaignId`) | Deferred — Phase 2 locks campaign-scoped programmes |
| P2-B | Should Campaign Setup persist in Phase 2? | Deferred — wizard may remain React-state-only |
| P2-C | Day-one seeding of Local Programmes for active Campaign | Deferred — empty children valid |
| P2-D | Uniqueness: one active Local Programme per `(campaignId, kind)`? | Deferred product confirm — **recommended default YES** as implementation validation when coding; not a GO blocker |
| B | KC-0104 amendment (Campaign no longer product root) | Deferred — handbook follow-on (Phase 0 decision B) |
| A | Rukn Ijtema Present/Absent semantics | Deferred — Phase 5; not a Phase 2 blocker |

ARCH-009 does **not** require resolving P2-A–D or KC-0104 before Phase 2 implementation begins.

---

## TASK-014 readiness

| Question | Answer |
|----------|--------|
| ARCH-009 Phases 0–3 + Go/No-Go complete? | **YES** |
| Design locked? | **YES** (`kc-phase2-product-data-design.md`) |
| Phase 0 certified baseline? | **YES** |
| Phase 1 certified baseline? | **YES** |
| May TASK-014 start (types + repository interfaces, local-first)? | **YES** |
| May Firestore/UI/production deploy start from this gate alone? | **NO** — follow design sequence; deploy only after implementation Phase 5 READY |

---

## Certification for this gate artifact (design gate)

| Field | Value |
|-------|-------|
| ARCH-009 STATUS | **PASS** |
| Go / No-Go | **GO** |
| Implementation code in TASK-013 | **None** |
| Collections created in TASK-013 | **None** |
| Production changed | **No** |
| Architecture conflicts | **None** |
| Next | TASK-014 — Phase 2 types + repository interfaces (local-first) — **not started by this task** |

**Stop:** Do not begin Phase 2 implementation from this conversation. Do not start TASK-014 here.
