# KC Phase 1 — Product / Data Design

**Status:** DESIGN ONLY — not implemented  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · Frozen post-campaign architecture · [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md)  
**Scope of this document:** Meqati Mansooba → Objectives → Unit / Scope  
**Does not authorize:** code, Firestore collections, migrations, UI, repositories, indexes, or deploy

Label every item below as **DESIGN DECISION** (locked for later implementation) or **IMPLEMENTATION TASK** (belongs to TASK-004+).

---

## 1. Phase 1 objective

Introduce the smallest durable planning foundation above Campaign:

```text
میقاتی منصوبہ (Meqati Mansooba)  →  اہداف (Objectives)  →  Unit / Scope
```

Phase 1 makes these three entities real as **Admin-owned configuration data**. It does **not** reposition Campaign, create Local Programme / Occurrence / Work, or change live operator workflows.

**DESIGN DECISION:** Existing production remains the live user-facing system. Phase 1 implementation (when approved) must be additive and locally testable first; it must not break campaign, Rukn, Karkun, connection, WI, or BM data.

---

## 2. Entity definitions

### 2.1 Meqati Mansooba

**DESIGN DECISION:** Highest planning container. One organisational period / plan under which Objectives are defined. Not a Campaign. Not a Local Programme. Not Work.

| | |
|--|--|
| Disposition | **NEW** (absent today) |
| Owner | Administrator only |
| Phase 0 map | INTRODUCE — Phase 1 |

### 2.2 Objective

**DESIGN DECISION:** Structured planning goal belonging to exactly one Meqati Mansooba. Replaces the need to treat campaign free-text / wizard checklists / Health slices as the Objective SoT. Those existing surfaces remain readable; they are not promoted to planning SoT.

| | |
|--|--|
| Disposition | **NEW** durable entity; **EXTEND later** via optional links from Campaign (Phase 2) |
| Owner | Administrator only |
| Phase 0 map | INTRODUCE / EXTEND — Phase 1 |

**DESIGN DECISION:** Campaign Health slices and `APPROVED_CAMPAIGN_OBJECTIVES` remain derived / ephemeral / copy — never Objective SoT.

### 2.3 Unit / Scope

**DESIGN DECISION:** Minimal flat organisational scope. First concrete Unit is **Basavakalyan** (aligns with `DEFAULT_PLACE = 'Basavakalyan'`). No parent/child tree. No ward/halqa hierarchy.

| | |
|--|--|
| Disposition | **NEW** minimal entity; existing `place` / `area` strings on people **REUSE** as display / match fields |
| Owner | Administrator only |
| Phase 0 map | INTRODUCE (minimal) — Phase 1 |

---

## 3. Minimal fields

Fields below are the **smallest viable durable shape**. Metadata follows existing KC patterns (`createdAt` / `updatedAt` / `createdBy` / `updatedBy`). No soft-delete product; use `status: archived` where needed (same spirit as campaigns / people archive).

### 3.1 Meqati Mansooba

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Stable document id |
| `name` | string | Yes | Display name (Urdu and/or English) |
| `status` | `'draft' \| 'active' \| 'archived'` | Yes | Only one **active** Mansooba expected initially |
| `startDate` | `YYYY-MM-DD` | No | Plan window start |
| `endDate` | `YYYY-MM-DD` | No | Plan window end |
| `primaryUnitId` | string | No | Optional link to Unit; Basavakalyan Unit when present |
| `summary` | string | No | Short description |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | string | Yes | Audit metadata on the record |

**DESIGN DECISION:** No nested objectives array on the Mansooba document as SoT. Objectives are separate docs keyed by `mansoobaId` (avoids LWW blob growth; KC-ARCH-001).

### 3.2 Objective

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Stable document id |
| `mansoobaId` | string | Yes | Parent Meqati Mansooba |
| `title` | string | Yes | Display title |
| `description` | string | No | Short explanation |
| `status` | `'active' \| 'archived'` | Yes | |
| `sortOrder` | number | No | Admin display order |
| `legacyKey` | string | No | Optional bridge to wizard/Health ids later — **not** a second SoT |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | string | Yes | Audit metadata |

**DESIGN DECISION:** Objective does **not** store attendance, participation, assignments, or programme membership.

### 3.3 Unit

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Stable document id |
| `name` | string | Yes | e.g. `Basavakalyan` |
| `status` | `'active' \| 'archived'` | Yes | |
| `placeAliases` | string[] | No | Match existing person `place` strings (default include `Basavakalyan`) |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | string | Yes | Audit metadata |

**DESIGN DECISION:** No `parentUnitId`. No org-chart fields. `area` stays a free-text person attribute — not a child Unit.

---

## 4. Relationships

```text
Unit (flat)
   ↑ optional primaryUnitId
Meqati Mansooba ──1:*── Objective

People (rukns / karkuns) continue to use place / area strings.
Campaign docs remain valid with zero Phase 1 FKs.
```

| Relationship | Cardinality | DESIGN DECISION |
|--------------|-------------|-----------------|
| Mansooba → Objective | 1 → many | Objective always requires `mansoobaId` |
| Mansooba → Unit | many → 0..1 | Optional `primaryUnitId`; not a hierarchy |
| Unit → People | conceptual | Match via `place` / `placeAliases`; **no required `unitId` on people in Phase 1** |
| Mansooba / Objective → Campaign | deferred | Optional additive `mansoobaId` / `objectiveIds` on campaigns = **Phase 2** |
| Unit → Responsibility / Tenure | deferred | **Phase 4** — do not invent in Phase 1 |

**DESIGN DECISION:** Phase 1 does not create programme-member, programme-assignment, or participation edges.

---

## 5. Source-of-truth decisions

| Concept | Phase 1 SoT | Not SoT |
|---------|-------------|---------|
| Meqati Mansooba | New Mansooba records | Campaign docs, wizard state |
| Objective | New Objective records | `CampaignListItem.objective` / `objectives[]`, `APPROVED_CAMPAIGN_OBJECTIVES`, Health slices, setup `enabledObjectives` |
| Unit / Scope | New Unit records | Person `place` / `area` strings (retained as compatible geography text) |
| People | Existing `rukns` + `karkuns` | Any new person table |
| Relationship | Existing `connections` | Any programmeAssignment |
| Campaign | Existing `campaigns` (unchanged required shape) | Campaign Setup React state |

**DESIGN DECISION:** Dual-write of Objectives into campaign string arrays is **forbidden** in Phase 1. Campaign copy may be linked later (Phase 2) with additive optional fields only.

---

## 6. Scope / permission model

Frozen direction (do not redesign):

```text
Base Role + Unit / Scope + Active Responsibility + Tenure
```

### Phase 1 boundaries (smallest viable)

| Layer | Phase 1 behaviour | DESIGN DECISION |
|-------|-------------------|-----------------|
| **Base Role** | Keep `administrator` \| `rukn` (`AuthUser.role`) | No new roles |
| **Unit / Scope** | Introduce Unit entity; Admin configures it | Rukn does not CRUD Units |
| **Active Responsibility** | **Absent** (Phase 4) | Do not overload Connections as Unit tenure |
| **Tenure** | **Absent** (Phase 4) | Do not add tenure fields to rukns/connections in Phase 1 |

**DESIGN DECISION — Admin ownership:** Only `administrator` creates/updates/archives Mansooba, Objectives, and Units.

**DESIGN DECISION — Rukn:** No Phase 1 write access to planning entities. Existing Rukn operational scope (own connections, assigned karkuns, own WI/BM submissions) unchanged.

**DESIGN DECISION:** No permission-matrix product, no claim redesign, no Firestore rule expansion beyond what TASK-004’s ARCH-009 gate proves necessary for Admin CRUD of the three new collections.

---

## 7. Existing-data compatibility

**DESIGN DECISION:** Preserve all production campaign, Rukn, Karkun, connection, compliance, and settings data.

| Existing surface | Compatibility rule |
|------------------|--------------------|
| `campaigns` | Remain readable without Mansooba/Objective FKs |
| `CampaignListItem.objective` / `objectives[]` | Keep as campaign copy |
| Campaign Setup wizard | Remains React-state-only; not Mansooba SoT |
| `rukns.place` / `karkuns.place` / `area` | Keep strings; default place `Basavakalyan` |
| `connections` | No required campaignId / unitId / mansoobaId |
| Roles / claims | Unchanged |
| WI / BM / Health | Unchanged; not Objective SoT |

**DESIGN DECISION:** Seed path for first Unit: one active Unit named Basavakalyan with `placeAliases: ['Basavakalyan']`. (**IMPLEMENTATION TASK** when coding — not done here.)

---

## 8. What is reused

| Reused | How |
|--------|-----|
| `administrator` / `rukn` roles | Base Role layer only |
| `rukns` / `karkuns` | People SoT unchanged |
| `connections` (+ reviews / ledger / activityLogs) | Relationship SoT unchanged |
| `campaigns` | Remains campaign library SoT; repositioned later (Phase 2) |
| `DEFAULT_PLACE` / person `place`+`area` | Proto-scope text until optional Unit match |
| Repository + Firestore patterns | Same KC-ARCH-001 persistence discipline for any future collections |
| Admin Settings / Admin IA patterns | Configuration UX home for planning entities (**IMPLEMENTATION TASK**) |

---

## 9. What is genuinely new

| New | Notes |
|-----|-------|
| Meqati Mansooba entity | Planning root |
| Objective entity | Structured goals under Mansooba |
| Unit entity | Flat scope; Basavakalyan first |
| Admin configuration of the three | Ownership surface — design only here |
| Proposed collections (from Phase 0) | `meqatiMansoobas`, `objectives`, `units` — **not created in this task** |

---

## 10. Explicitly out of scope (Phase 1)

**DESIGN DECISION — do not introduce or implement:**

- Duplicate people / Rukn / Karkun entities
- Generic participation or programme-member tables
- Generic approval engine
- Org hierarchy (parent units, wards as Units)
- Permission matrix UI or new role taxonomy
- Responsibility / Tenure entities (Phase 4)
- Campaign reposition / Local Programme (Phase 2)
- Occurrence / Calendar (Phase 3)
- Work engine (Phase 4)
- Attendance / BM / Reporting redesign (Phase 5)
- Inbox / Communication / Notifications changes (Phase 6)
- Dashboard / Search / Journey redesign (Phase 7)
- Digital Rafeeq changes (Phase 8)
- Fourth Weekly Ijtema writer; treating `Committed` as Attendance
- Making Campaign Setup persist Firestore
- Rewriting KC-0104 in this ticket
- Production deploy / Vercel release as part of design

---

## 11. Open product decisions

These are **not** resolved by this design. They do not block writing the design; they may affect later implementation tickets.

| # | Decision | Notes |
|---|----------|-------|
| A | **Rukn Ijtema Present/Absent semantics** | Deferred from Phase 0 — Phase 5 product decision on existing WI event |
| B | **KC-0104 amendment** (Campaign no longer product root) | Deferred follow-on product handbook — not a silent rewrite |
| C | **Whether `legacyKey` on Objective must map to current Health / wizard ids on day one** | Design allows optional `legacyKey`; mapping content is a product choice at implementation |
| D | **Whether every Mansooba must have `primaryUnitId` once Unit exists** | Design keeps it optional for first seed; product may harden later |

No additional open decisions are required to keep Phase 1 minimal.

---

## 12. ARCH-009 status (for Phase 1 implementation)

ARCH-009 requirements are **already documented** in [kc-arch-009-feature-impact.md](./kc-arch-009-feature-impact.md). This design does **not** invent new ARCH-009 rules.

| Item | Status |
|------|--------|
| This TASK-003 artifact | Documentation / product-data design only — **no coding** |
| Phase 0 post-campaign mapping | **CERTIFIED** — baseline for reuse decisions |
| Before any Phase 1 code (TASK-004+) | **REQUIRED:** ARCH-009 Phases 0–3 + Go/No-Go for the **implementation** ticket |
| Classification for that ticket | **New Feature** (planning foundation) |
| Must include | Impact Matrix · regression risk (HIGH items fully documented) · implementation plan · verification plan · Go/No-Go answers with Impact / Mitigation / Regression Tests for every YES |
| Deploy | Banned until ARCH-009 Phase 5 certification is not `NOT READY` |
| Related | KC-ARCH-001 — schema + repository + `firestore.rules` (+ indexes) ship together |

**DESIGN DECISION:** TASK-004 must produce the ARCH-009 gate artifact and receive Go before creating collections, repositories, UI, or rules.

---

## 13. Implementation sequence for TASK-004 onward

| Step | Kind | Work |
|------|------|------|
| **TASK-003** | DESIGN (this doc) | Product/data design — **complete when accepted** |
| **TASK-004** | ARCH-009 gate | Impact Matrix, risks, plan, verification, Go/No-Go for Phase 1 implementation |
| **TASK-005** | IMPLEMENTATION | Types + repository interfaces for Mansooba / Objective / Unit (local-first) |
| **TASK-006** | IMPLEMENTATION | Firestore schema + rules + indexes together; Admin-only writes; seed Basavakalyan Unit |
| **TASK-007** | IMPLEMENTATION | Minimal Admin configuration UI (create/list/archive); no Rukn surface |
| **TASK-008** | VERIFY | Local verification evidence per ARCH-009 Phase 3/4; no production deploy until Phase 5 READY |

**IMPLEMENTATION TASK (later):** Optional additive Campaign FKs and Campaign reposition belong to **Phase 2**, not Phase 1.

**IMPLEMENTATION TASK (later):** Responsibility + Tenure + Unit-aware access = **Phase 4**, extending — not replacing — Base Role.

---

## 14. Certification posture for this document

| Field | Value |
|-------|-------|
| Type | Product / data design |
| Code | None |
| Collections created | None |
| Production | Unchanged |
| Next gate | TASK-004 ARCH-009 for Phase 1 implementation |

**Stop:** Do not begin implementation from this document alone.
