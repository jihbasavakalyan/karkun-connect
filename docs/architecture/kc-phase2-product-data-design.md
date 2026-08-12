# KC Phase 2 — Product / Data Design

**Status:** **PHASE 2 — CERTIFIED FOR DEVELOPMENT BASELINE** (TASK-019; TASK-020 ABSORBED) · [ARCH-009 Phase 2 gate: GO](./kc-phase2-local-programme-arch009-gate.md)  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 1 — CERTIFIED FOR DEVELOPMENT BASELINE](./kc-phase1-product-data-design.md) · Frozen post-campaign architecture · [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md) · [ARCH-009 Phase 2 gate](./kc-phase2-local-programme-arch009-gate.md)  
**Scope of this document:** Campaign → Local Programme  
**Implementation:** Types, persistence, Campaign planning links, Admin Local Programme UI, and local verification complete (TASK-014–018). This design remains the product/data authority for the certified baseline.

Label every item below as **DESIGN DECISION** (locked for later implementation), **IMPLEMENTATION TASK** (belongs to ARCH-009 + coding tickets), or **PRODUCT DECISION** (cannot be closed from frozen architecture alone).

---

## 1. Phase 2 objective

Establish the smallest durable **Campaign → Local Programme** relationship while preserving existing Campaign production data and live operator behaviour.

```text
میقاتی منصوبہ (Meqati Mansooba)
        ↓
اہداف (Objectives)
        ↓
Campaign                    ← REUSE + REPOSITION (existing `campaigns`)
        ↓
Local Programme             ← INTRODUCE (new entity)
        ↓
Occurrences                 ← Phase 3 (out of scope here)
```

**DESIGN DECISION:** Phase 1 planning entities (Mansooba, Objective, Unit) remain the planning foundation. Phase 2 does **not** redesign them. Phase 2 does **not** create Occurrence, Work, Responsibility, attendance redesign, or notifications.

**DESIGN DECISION:** Existing production remains the live user-facing system. Phase 2 implementation (when approved under its own ARCH-009 gate) must be additive and locally testable first.

---

## 2. Local Programme definition

### 2.1 Purpose

**DESIGN DECISION:** A Local Programme is an **Admin-owned operational programme configuration** that belongs to exactly one Campaign. It names and scopes a concrete programme track (for example Weekly Ijtema or Monthly Bait-ul-Maal) under that Campaign so later phases can attach Occurrences / wrap existing ops SoTs without inventing a second Campaign or a generic programme engine.

| | |
|--|--|
| Disposition | **NEW** durable entity (absent today — Activities IA is presentation only) |
| Owner | Administrator only |
| Phase 0 map | INTRODUCE — Phase 2 |
| Not | A Campaign clone · a people table · a participation table · an Occurrence · Work |

### 2.2 Ownership

**DESIGN DECISION:** Only `administrator` creates / updates / archives Local Programmes.  
**DESIGN DECISION:** Rukn operational scope (connections, assigned karkuns, own WI/BM submissions) is unchanged. No Rukn Local Programme CRUD in Phase 2.  
**DESIGN DECISION:** No new roles and no permission-matrix product.

### 2.3 Relationship to Mansooba / Objectives

**DESIGN DECISION:** Local Programme does **not** require a direct `mansoobaId` or `objectiveIds`. It reaches Mansooba / Objectives **through its Campaign**:

```text
LocalProgramme.campaignId → Campaign → (optional) mansoobaId / objectiveIds
```

This avoids dual-parent conflicts while Campaign FKs are still optional on legacy docs.

---

## 3. Entity / data model

### 3.1 Local Programme — minimal fields

Fields below are the **smallest viable durable shape**. Metadata follows existing KC patterns (`createdAt` / `updatedAt` / `createdBy` / `updatedBy`). No soft-delete product; archive via `status` (same spirit as campaigns / planning entities).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Stable document id |
| `campaignId` | string | Yes | Parent Campaign (`campaigns` doc id) |
| `name` | string | Yes | Display name |
| `kind` | ProgrammeKind | Yes | Typed programme track — see §5 |
| `status` | `'draft' \| 'active' \| 'archived'` | Yes | Lifecycle |
| `unitId` | string | No | Optional link to Phase 1 Unit (Basavakalyan-first) |
| `startDate` | `YYYY-MM-DD` | No | Programme window start; may inherit Campaign window in UI |
| `endDate` | `YYYY-MM-DD` | No | Programme window end |
| `frequency` | ProgrammeFrequency | No | Configuration hint for Phase 3 Occurrence generation — **not** a calendar engine |
| `summary` | string | No | Short description |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | string | Yes | Audit metadata |

**DESIGN DECISION:** No nested occurrence arrays on the Local Programme document as SoT. Occurrences (Phase 3) are separate docs keyed by `programmeId`.

**DESIGN DECISION:** No `parentProgrammeId`. No programme hierarchy.

### 3.2 ProgrammeKind (configuration enum)

**DESIGN DECISION:** Start with kinds that map to **existing** operational tracks / Activities IA — do not invent a free-form programme engine:

| Kind | Maps to existing (wrap later; do not replace in Phase 2) |
|------|----------------------------------------------------------|
| `weekly_ijtema` | Weekly Ijtema event track |
| `monthly_baitul_maal` | Monthly Bait-ul-Maal cycle track |
| `campaign_execution` | Annexure / campaign execution ops |
| `follow_up` | Follow-up queues |
| `other` | Explicit escape hatch only — prefer typed kinds |

### 3.3 ProgrammeFrequency (optional)

**DESIGN DECISION:** Frequency is **configuration metadata only** in Phase 2. It does not open/close events and does not invent a calendar.

| Shape (illustrative) | Notes |
|----------------------|-------|
| `{ cadence: 'weekly', dayOfWeek?: number }` | Aligns with existing WI schedule precursor (`attendanceWindowEngine`) |
| `{ cadence: 'monthly', dayOfMonth?: number }` | Aligns with BM cycle thinking |
| `{ cadence: 'once' }` | Finite / one-shot programme window |
| `{ cadence: 'custom', note?: string }` | Text only — no engine |

**IMPLEMENTATION TASK:** Exact TypeScript union for `ProgrammeFrequency` when coding — keep JSON-serialisable and minimal.

### 3.4 Campaign — additive optional fields only

Existing required shape (`CampaignListItem`) remains valid:

| Existing field | Disposition |
|----------------|-------------|
| `id`, `name`, `status`, `startDate`, `endDate`, `theme`, `objective`, `objectives[]`, `nextMilestone`, `motto?` | **Unchanged** — remain readable copy / library fields |

**DESIGN DECISION — EXTEND Campaign (additive):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `mansoobaId` | string | No | Optional link to Phase 1 Meqati Mansooba |
| `objectiveIds` | string[] | No | Optional links to Phase 1 Objective ids — **not** a dual-write of titles into `objectives[]` |

**DESIGN DECISION:** Free-text `objective` / `objectives[]` remain campaign **copy**. Structured Objective SoT remains Phase 1 `objectives` collection. Dual-write of Objective titles into campaign string arrays remains **forbidden**.

---

## 4. Campaign relationship

### 4.1 Cardinality

**DESIGN DECISION:** **Campaign 1 → many Local Programmes.**

One Campaign may host multiple programme tracks (e.g. Weekly Ijtema + Monthly Bait-ul-Maal + Follow-up) as separate Local Programme records. One-to-one would force merging distinct ops tracks and conflicts with wrap-later guidance for WI/BM.

### 4.2 Architectural repositioning (not a data rewrite)

**DESIGN DECISION:** Existing Campaign **becomes a referenced node under Mansooba → Objectives**, not a retired entity and not a second Campaign table.

| Aspect | Decision |
|--------|----------|
| What Campaign is | Still the durable campaign library SoT (`campaigns`) |
| What changes architecturally | Campaign is no longer the product root; it sits under Mansooba → Objectives |
| What operators see day-one of Phase 2 impl | Existing Campaign UI/behaviour may remain until IMPLEMENTATION chooses additive Admin surfaces |
| What Local Programme is | New child configuration under a Campaign |

**PRODUCT DECISION (deferred handbook):** KC-0104 still describes Campaign as product root — amendment remains a follow-on product doc (Phase 0 deferred decision B). This design does **not** silently rewrite KC-0104.

### 4.3 How existing Campaign records remain valid

**DESIGN DECISION:**

1. Every existing `campaigns` document remains readable with **zero** Phase 1/2 FKs.  
2. Missing `mansoobaId` / `objectiveIds` is valid indefinitely.  
3. Missing Local Programme children is valid — empty programme list is a normal state.  
4. Active campaign id convention (e.g. `campaign-active`) is preserved.  
5. `CampaignRepository` read contract (`getAll` / `getById` / `getActive`) remains required.

### 4.4 Migration / repositioning approach (design only — do not implement here)

| Step | Kind | Approach |
|------|------|----------|
| A | **No breaking migration** | Do not rewrite existing campaign required fields |
| B | **Additive FKs** | Optionally set `mansoobaId` / `objectiveIds` on selected campaigns when Admin links them |
| C | **Introduce `localProgrammes`** | New collection; seed optional later — not required for existing campaigns to load |
| D | **Wrap, don’t replace** | WI / BM / follow-up / execution SoTs stay as they are; Local Programme records **reference kinds**, Phase 3+ wraps occurrences |

**IMPLEMENTATION TASK:** Any backfill of FKs or seed Local Programmes is a separate, reversible Admin/script step after ARCH-009 — not a production cutover rewrite.

---

## 5. Programme configuration (before Occurrences)

Phase 2 configures only what is required **before** Occurrence generation:

| Config | Required in Phase 2? | Why |
|--------|----------------------|-----|
| Identity (`name`, `kind`, `status`) | Yes | Name the track under a Campaign |
| Parent (`campaignId`) | Yes | Campaign → Local Programme edge |
| Scope (`unitId`) | Optional | Reuse Phase 1 Unit; Basavakalyan-first |
| Window (`startDate` / `endDate`) | Optional | May default to Campaign window in UI |
| Frequency hint | Optional | Feeds Phase 3; does not generate Occurrences |
| People selection / assignments | **No** | Existing connections / setup wizard remain SoT for people links |
| Occurrence auto-open/close | **No** | Phase 3; keep using existing WI window engine until then |
| Attendance / BM marks | **No** | Existing compliance SoTs |

**DESIGN DECISION:** Campaign Setup wizard (`CampaignSetupState` / `LAUNCH_CAMPAIGN`) may remain **React-state-only** through Phase 2 design. Making the wizard persist Firestore is **not** required to introduce Local Programme.

**PRODUCT DECISION:** Whether Phase 2 implementation should also make Campaign Setup write durable Campaign / Local Programme records — see §10.

---

## 6. Scope model

**DESIGN DECISION:** Reuse Phase 1 **flat Unit / Scope**. Do not create another organisational hierarchy.

| Rule | Decision |
|------|----------|
| Unit entity | Reuse `units` from Phase 1 |
| Local Programme → Unit | Optional `unitId` |
| People `unitId` | **Not required** (unchanged from Phase 1) |
| Person `place` / `area` | Remain compatible geography text |
| Parent units / wards as Units | Forbidden |

```text
Unit (flat, Phase 1)
   ↑ optional unitId
Local Programme ──*──1── Campaign ──?── Mansooba / Objectives
```

---

## 7. Existing-data compatibility

**DESIGN DECISION:** Preserve all production campaign, Rukn, Karkun, connection, compliance, and settings data.

| Surface | Unchanged | Referenced / repositioned | New |
|---------|-----------|---------------------------|-----|
| `campaigns` docs | Required fields & readability | Optional `mansoobaId` / `objectiveIds`; architectural position under Mansooba → Objectives | — |
| `CampaignListItem.objective` / `objectives[]` | Keep as copy | May be linked via `objectiveIds` later | — |
| Campaign Setup wizard | Remains ephemeral unless PRODUCT DECISION changes it | — | — |
| `CampaignRepository` reads | Required | May gain optional `saveDurable` for additive fields | — |
| WI / BM compliance SoTs | Remain SoTs | Later wrapped by Occurrence / programme kind | — |
| Activities IA (`ACTIVITIES_MODULES`) | Remains navigation registry | Not Local Programme SoT | — |
| People / connections | Unchanged | No required `campaignId` / `programmeId` | — |
| Phase 1 planning collections | Unchanged contracts | Campaign may optionally link to them | — |
| `localProgrammes` | — | — | **New** collection (proposed) |

**Backward-compatibility law (from Phase 0 — restated):**

1. Additive fields only on existing production docs.  
2. Campaign docs remain readable without Meqati / Objective / Local Programme children.  
3. Connections remain valid without `campaignId`.  
4. No hard-delete of campaigns.  
5. No dual-write of structured Objectives into campaign string arrays.

---

## 8. Reuse / Extend / New decisions

| Item | Disposition | Rationale |
|------|-------------|-----------|
| `campaigns` collection + `CampaignListItem` | **REUSE + REPOSITION** | Production SoT; move down the tree; do not clone |
| Campaign free-text objectives | **REUSE** as copy | Structured Objective SoT already in Phase 1 |
| `CampaignRepository` read API | **REUSE** | Keep `getAll` / `getById` / `getActive` |
| Campaign durable write API | **EXTEND** (when implementing FKs) | Interface is read-only today; additive save is needed for optional FKs if Admin UI links them |
| Phase 1 Unit | **REUSE** | Programme scope |
| Phase 1 Mansooba / Objective | **REUSE** | Linked via Campaign optional FKs |
| Repository / provider / KC-ARCH-001 patterns | **REUSE** | Same local + Firestore adapters, Admin-only rules, soft background hydrate |
| Admin `ProtectedRoute` / roles | **REUSE** | `administrator` \| `rukn` only |
| Activities IA modules | **REUSE** as kind catalogue inspiration | Not a SoT |
| Weekly Ijtema / BM SoTs | **REUSE** (wrap later) | Do not replace in Phase 2 |
| `attendanceWindowEngine` | **REUSE** as Occurrence precursor | Phase 3 extends; Phase 2 may only store frequency hints |
| Local Programme entity + `localProgrammes` | **NEW** | Absent today |
| Campaign `mansoobaId` / `objectiveIds` | **NEW** optional fields on existing docs | Additive only |
| Second Campaign entity | **Forbidden** | Duplicate concept |
| programmeAssignment / participation table | **Forbidden** | Connections remain relationship SoT |

---

## 9. Explicitly out of scope (Phase 2)

**DESIGN DECISION — do not design or implement in Phase 2:**

- Generic participation / programme-member tables  
- A second Campaign entity or campaign library clone  
- A second people / Rukn / Karkun database  
- A generic programme execution engine  
- A generic approval workflow  
- Task / Activity / Work hierarchy  
- Responsibility / Tenure  
- Occurrence generation / calendar integration  
- Notification engine  
- Reporting redesign  
- AI / Digital Rafeeq features  
- Rewriting WI / BM into a new attendance model  
- Requiring `unitId` on people  
- Permission matrix / new roles  
- Silent KC-0104 rewrite  
- Production deploy / Vercel release as part of this design  

Those belong to later phases or deferred product docs.

---

## 10. Open product decisions

Only decisions that **cannot** be closed from the frozen architecture + Phase 0/1 alone:

| # | Decision | Notes |
|---|----------|-------|
| P2-A | **Independent Local Programmes (no `campaignId`)** | Phase 0 index hint allowed `unitId`+status programmes. TASK-012 approved direction is Campaign → Local Programme. Design locks **campaign-scoped** programmes for Phase 2; independent programmes remain a later product choice if needed. |
| P2-B | **Should Campaign Setup persist in Phase 2?** | Today wizard is React-state-only. Design allows Local Programme Admin config without changing the wizard. Persisting setup is optional product scope for the implementation ticket. |
| P2-C | **Day-one seeding of Local Programmes for the active Campaign** | Empty children are valid. Whether to seed `weekly_ijtema` / `monthly_baitul_maal` rows for `campaign-active` is a product/ops choice at implementation — not required for compatibility. |
| P2-D | **Uniqueness: one active Local Programme per `(campaignId, kind)`?** | Recommended default **yes** for typed kinds (avoid duplicate WI programmes under one Campaign), but confirm at ARCH-009 / impl. |
| B | **KC-0104 amendment** (Campaign no longer product root) | Still deferred from Phase 0 — handbook follow-on, not this design |

Phase 0 deferred decision **A** (Rukn Ijtema Present/Absent) remains Phase 5 — not a Phase 2 blocker.

---

## 11. Proposed implementation sequence

| Step | Kind | Work |
|------|------|------|
| **TASK-012** | DESIGN (this doc) | Product/data design — **complete** |
| **TASK-013** | ARCH-009 gate | [GO](./kc-phase2-local-programme-arch009-gate.md) — Impact Matrix, HIGH risks, plan, verification |
| **TASK-014** | IMPLEMENTATION | Types + `LocalProgrammeRepository` contract — **complete** |
| **TASK-015** | IMPLEMENTATION | Collection `localProgrammes` + Admin-only `firestore.rules` + local/Firestore repos + soft hydrate — **complete** |
| **TASK-016** | IMPLEMENTATION | Optional additive Campaign `mansoobaId` / `objectiveIds` + merge-only planning-links write — **complete** |
| **TASK-017** (+ **TASK-018** absorbed) | IMPLEMENTATION | Minimal Admin UI: list/create/edit Local Programmes under a selected Campaign — **complete** |
| **TASK-019** (+ **TASK-020** absorbed) | VERIFY + CERTIFY | Local verification; soft background hydrate; Phase 5 development-baseline certification — **complete** |

**IMPLEMENTATION TASK (later phases):** Occurrence generation (Phase 3); wrap WI/BM under programme/occurrence; Work / Responsibility (Phase 4).

**DESIGN DECISION:** ARCH-009 for Phase 2 is **GO** (`kc-phase2-local-programme-arch009-gate.md`). Phase 2 foundation is certified for continued local development; no production deploy until a later production-ready Phase 5 without the known browser-CRUD limitation.

---

## 12. ARCH-009 inputs / risks (for the next gate)

This section is **input to** the Phase 2 ARCH-009 gate — not a substitute for it.

### 12.1 Likely classification

| Field | Value |
|-------|-------|
| Type | **New Feature** (Local Programme) + **Enhancement** (optional additive Campaign FKs / repositioning) |
| Production impact | Additive; existing campaigns must remain valid without children or FKs |

### 12.2 Impact highlights (for gate)

| Area | Likely impact | Note |
|------|---------------|------|
| Repositories | Y | New Local Programme repos; possible Campaign `saveDurable` extension |
| Firestore | Y | Proposed `localProgrammes`; optional campaign field adds; rules + indexes together |
| Authorization | Y | Admin-only programme writes |
| Bootstrap | Y | Soft / background hydrate — empty programmes must not block startup |
| UI / routing | Y | Additive Admin surfaces; Campaign Setup may stay unchanged |
| Campaign read paths | MEDIUM | Must not break `getActive` / dashboards / reports |
| WI / BM / connections / people | N (Phase 2 design forbids SoT rewrite) | Wrap later |
| Dashboard Health | N if no SoT rewiring | Do not treat Local Programme as Health SoT |

### 12.3 HIGH-risk themes to document fully in ARCH-009

| Risk | Why | Mitigation direction |
|------|-----|----------------------|
| Campaign write-path introduction | `CampaignRepository` is read-only today | Additive save only for optional FKs; await durable writes (KC-ARCH-001); no LWW full-doc wipe |
| Orphan / detached programmes | `campaignId` required | Validate parent exists on save; archive don’t delete |
| Bootstrap regression | New collection hydrate | Non-critical / soft background hydrate (same pattern as Phase 1 planning) |
| Accidental Campaign dual-write of objectives | Copy vs structured SoT | Forbid writing Objective titles into `objectives[]` as SoT sync |
| Scope creep into Occurrence / WI rewrite | Adjacent frozen entities | Phase 2 ships config only; WI/BM remain SoTs |
| Authz leak | New collection | Admin-only create/update; `allow delete: if false` |

### 12.4 Verification themes for the gate

- Local Local Programme CRUD round-trip  
- Campaign docs without FKs / without children still load  
- `getActive()` and existing Campaign UI read paths unchanged  
- Rukn cannot write Local Programmes  
- Empty `localProgrammes` does not block cold start  
- No WI/BM/people/connection schema break  
- Objective dual-write absent  

### 12.5 Explicit non-goals for the gate

Do not expand ARCH-009 into Occurrence, Work, Responsibility, reporting, or KC-0104 rewrite. Resolve only P2-A–D (and uniqueness) as needed for Go/No-Go.

---

## 13. Certification posture for this document

| Field | Value |
|-------|-------|
| Type | Product / data design (authority for Phase 2 entities) |
| Design | Approved (TASK-012); ARCH-009 PASS / GO (TASK-013) |
| Implementation | Complete for Phase 2 foundation (TASK-014–018) |
| Verification / certification | TASK-019 (+ TASK-020 absorbed) — **PHASE 2 — CERTIFIED FOR DEVELOPMENT BASELINE** |
| Production | Unchanged — no Vercel / production deploy in Phase 2 |
| Architecture conflicts found | **None** |
| Next | Phase 3 (Occurrence generation + Calendar) under its own ARCH-009 gate — not started here |

---

## 14. PHASE 2 — CERTIFIED FOR DEVELOPMENT BASELINE

| Field | Value |
|-------|-------|
| Decision | **PHASE 2 — CERTIFIED FOR DEVELOPMENT BASELINE** |
| Date | 2026-08-13 |
| Task | TASK-019 — local verification & certification (TASK-020 ABSORBED INTO TASK-019) |
| Architecture / design | Implemented as approved: Campaign 1 → many Local Programmes; optional Campaign `mansoobaId` / `objectiveIds`; programme reaches planning via Campaign only |
| Persistence | Verified (`verify:kc-phase2-local-programme-persistence` PASS · `verify:kc-phase2-campaign-planning-links` PASS) — Admin-only rules, no client delete, soft background hydrate (not critical), Campaign parent validation, merge-only planning links, no Objective dual-write |
| Admin UI | `/admin/planning` Campaign selection + Local Programme CRUD; `programmeCampaignId` lock; no delete UI; archive via status |
| Local verification | `npm run typecheck` PASS · `npm run build` PASS · Phase 1 + Phase 2 verify scripts PASS |
| Authenticated browser CRUD | **Unverified** — valid local Admin credentials not available; do not treat as a follow-on credential task |
| Production deployment | **Not performed** |
| ARCH-009 Phase 5 | **READY WITH KNOWN LIMITATIONS** (browser CRUD unverified; production deploy still banned until a later production-ready gate) |
| Phase 3 | **May proceed** under its own KC-ARCH-009 gate |

**Deferred product decisions P2-A–D and KC-0104 B remain unresolved** (see design §10 / ARCH-009 gate).
