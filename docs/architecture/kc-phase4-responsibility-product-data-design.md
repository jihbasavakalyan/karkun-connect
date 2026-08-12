# KC Phase 4 — Responsibility Product / Data Design

**Status:** **APPROVED FOR IMPLEMENTATION** (BATCH-04A / TASK-028)  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 1 Unit / Scope](./kc-phase1-product-data-design.md) · [Phase 3 — CERTIFIED](./kc-phase3-occurrence-foundation-arch009-gate.md) · Frozen post-campaign architecture · [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md) · [ARCH-009 Phase 4 Responsibility gate](./kc-phase4-responsibility-foundation-arch009-gate.md)  
**Scope of this document:** Person → Responsibility → Unit / Scope + Tenure  
**Implementation:** TASK-029 (entity) · TASK-030 (tenure) · TASK-031 (Unit / Scope reference)

Label every item below as **DESIGN DECISION** (locked) or **IMPLEMENTATION TASK** (this batch).

---

## 1. Objective

Establish the minimum durable Responsibility foundation for Phase 4:

```text
Person (existing Rukn)
        ↓
Responsibility          ← INTRODUCE (this batch)
        ↓
Unit / Scope            ← REUSE (Phase 1)
        +
Tenure (start / optional end)
```

**Frozen definition:** Responsibility = who is responsible for an area of work.

**DESIGN DECISION:** Responsibility is a standing organisational relationship record. It is **not** Work, **not** a person record, **not** a second Unit hierarchy, and **not** a generic assignment / person-role engine.

**DESIGN DECISION:** Existing production remains the live user-facing system. This batch is additive and locally testable first. No Vercel / production deploy.

**DESIGN DECISION:** Work, Work lifecycle, contextual Work permissions, Rukn dashboard, and Admin dashboard changes are **out of scope**.

---

## 2. Entity definition

### 2.1 Purpose

**DESIGN DECISION:** A Responsibility names a standing area of organisational work held by one existing person, scoped to one Phase 1 Unit, for a tenure window.

| | |
|--|--|
| Disposition | **NEW** durable entity (Phase 0: ABSENT / INTRODUCE — Phase 4) |
| Owner | Administrator only |
| Phase 0 map | INTRODUCE — Phase 4 |
| Not | Work · Occurrence · Connection · a second Rukn/Karkun · a participant table · an org chart |

### 2.2 Responsible person

**DESIGN DECISION:** The responsible person is an existing **Rukn** (`rukns` document id as `ruknId`).

| Rule | Decision |
|------|----------|
| People SoT | Existing `rukns` + `karkuns` remain canonical. Responsibility does not replace them. |
| Holder | `ruknId` — required reference to an existing Rukn |
| Karkun as holder | **Not introduced.** Connection remains the Karkun relationship SoT. A generic participant / person-kind engine is rejected. |
| Mutation | Responsibility **must not** write `unitId` or any other field onto the person record |
| Auth user | Administrator configures; the person record is the Rukn, not the AuthUser |

**STOP rule:** Changing the frozen people model is forbidden. This design does not.

### 2.3 Nature / type

**DESIGN DECISION:** `nature` is a required standing-responsibility label (string). It classifies **what area of work the person is responsible for**. It is not a Work record, not a task title, and not a closed Jamaat office taxonomy.

A closed enum (Secretary, Qayyim, in-charge, …) would be a **product decision** not present in the frozen architecture. This batch does **not** invent that taxonomy.

### 2.4 Unit / Scope

**DESIGN DECISION:** Responsibility references the existing Phase 1 Unit (`unitId` required). Unit remains flat. No Halqa, Zone, District, `parentUnitId`, or second organisational hierarchy.

People `place` / `area` strings stay as they are. **No `unitId` on people.**

### 2.5 Tenure

**DESIGN DECISION:** Tenure is represented on the Responsibility itself:

| Field | Required | Meaning |
|-------|----------|---------|
| `startDate` | Yes | Inclusive tenure start (`YYYY-MM-DD`) |
| `endDate` | No | Inclusive tenure end when present; omit = open-ended |

**DESIGN DECISION:** Multiple simultaneous Responsibilities for the same person are valid (different natures, units, or overlapping windows). No uniqueness constraint on `(ruknId, unitId)`.

**DESIGN DECISION:** Do **not** invent renewal, approval, performance lifecycle, or a history/audit module. Historical responsibility is the same record with its tenure (and archive status).

In-force rule (inclusive):

```text
status === 'active'
AND startDate <= asOfDate
AND (endDate is absent OR asOfDate <= endDate)
```

### 2.6 Status

**DESIGN DECISION:** `status: 'active' | 'archived'` is justified by the existing planning / programme archive-via-status convention (no client delete). It is **not** a Work lifecycle.

- `active` — operational record; in-force is then derived from tenure
- `archived` — Admin archived; never in-force, tenure retained on the record

No stored `ended` status — that would duplicate `endDate`.

---

## 3. Minimal fields

Metadata follows existing KC patterns (`createdAt` / `updatedAt` / `createdBy` / `updatedBy`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Stable document id (`responsibility-{time36}-{rand}`) |
| `ruknId` | string | Yes | Existing `rukns` document id |
| `nature` | string | Yes | Standing-responsibility label — not Work |
| `unitId` | string | Yes | Existing Phase 1 Unit id |
| `startDate` | `YYYY-MM-DD` | Yes | Tenure start (inclusive) |
| `endDate` | `YYYY-MM-DD` | No | Tenure end (inclusive); omit = open |
| `status` | `'active' \| 'archived'` | Yes | Archive via status |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | string | Yes | Audit metadata on the record |

**DESIGN DECISION:** No nested work arrays, no permission-grant blobs, no person snapshot copy.

---

## 4. Relationships

```text
Rukn (existing people SoT)     Unit (Phase 1, flat)
        ↑                              ↑
        └──── Responsibility ──────────┘
                    + tenure
```

| Relationship | Cardinality | DESIGN DECISION |
|--------------|-------------|-----------------|
| Responsibility → Rukn | many → 1 | `ruknId` required; person unchanged |
| Responsibility → Unit | many → 1 | `unitId` required; Unit unchanged / flat |
| Same Rukn → many Responsibilities | 1 → many | Simultaneous tenures allowed |
| Responsibility → Work | none | Work is a later Phase 4 task |

**DESIGN DECISION:** Collection `responsibilities` — one document per Responsibility (KC-ARCH-001; no LWW blob).

---

## 5. Source-of-truth

| Concept | SoT | Not SoT |
|---------|-----|---------|
| People | Existing `rukns` / `karkuns` | Responsibility |
| Unit / Scope | Existing `units` | A new hierarchy on Responsibility |
| Responsibility | New `responsibilities` docs | Auth role, Connection, replacement-reason strings |
| Tenure / history | Fields on the Responsibility | A new audit module |
| Work | **Absent** (later) | Responsibility.nature |
| Permissions | Existing `administrator` \| `rukn` + Admin-only rules | A permission-matrix product |

---

## 6. Permission direction

Frozen model (do not redesign):

```text
Base Role + Active Responsibility + Unit / Scope + Tenure
```

**DESIGN DECISION — this batch (minimum persistence protection only):**

| Layer | Behaviour |
|-------|-----------|
| **Base Role** | Keep `administrator` \| `rukn` |
| **Writes** | Administrator only (create / update / archive). No client delete. |
| **Reads** | Administrator, or Rukn reading **own** (`ruknId` match). Required so Work contextual permission can be derived from Responsibility data (BATCH-04B / P4-C). |
| **Active Responsibility + Unit + Tenure** | Represented on the record; applied as Work contextual permission in BATCH-04B |

**DESIGN DECISION:** No new roles, no claim redesign, no permission-matrix UI. Contextual Work authorization is BATCH-04B (`canActOnWork`).

---

## 7. What is reused

| Reused | How |
|--------|-----|
| `rukns` | Person reference via `ruknId` |
| Phase 1 `units` / `UnitRepository` | Scope reference via `unitId`; parent validated on save |
| `administrator` / `rukn` | Base Role; Admin writes; Rukn read-own (BATCH-04B) |
| ID / timestamp conventions | `responsibility-{time36}-{rand}`; ISO timestamps; `YYYY-MM-DD` dates |
| Repository + provider | Same local / Firestore bundle; soft background hydrate |
| Archive-via-status | `active` \| `archived`; `allow delete: if false` |

---

## 8. What is genuinely new

| New | Notes |
|-----|-------|
| Responsibility entity | Standing person–unit–tenure record |
| `responsibilities` collection / storage key | Per-document upsert |
| Tenure helpers | In-force / range validation — not a history engine |
| Admin-only rules for the new collection | Persistence protection only |

---

## 9. Explicitly out of scope

- Work / Work lifecycle / contextual Work permissions
- Rukn dashboard / Admin dashboard / Planning UI for Responsibility
- Notifications, Campaign, Local Programme, Occurrence, WI/BM changes
- Generic task / activity / participant / assignment-role engines
- Audit module; renewal / approval / performance workflows
- Organisational hierarchy (Halqa / Zone / District / parent units)
- `unitId` on people; Karkun/Rukn schema changes
- Application/service layer
- Production data changes; Vercel deploy

---

## 10. Open product decisions (not resolved here)

| # | Decision | Notes |
|---|----------|-------|
| P4-A | Closed nature taxonomy (office titles) | Deferred — `nature` remains an open label |
| P4-B | Whether a Karkun may hold a Responsibility | Deferred — holder is Rukn only |
| P4-C | Whether Rukn may read own in-force Responsibilities | **Resolved in BATCH-04B** — Rukn may read own (`ruknId`); writes remain Admin-only |

These do **not** block this foundation.

---

## 11. Implementation sequence (this session)

| Task | Kind | Work |
|------|------|------|
| **TASK-028** | DESIGN (this doc) | Responsibility design |
| **TASK-029** | IMPLEMENTATION | Domain type + repository + persistence |
| **TASK-030** | IMPLEMENTATION | Tenure fields + in-force helpers |
| **TASK-031** | IMPLEMENTATION | Required `unitId` → existing Unit |

Do **not** start TASK-032 (Work).
