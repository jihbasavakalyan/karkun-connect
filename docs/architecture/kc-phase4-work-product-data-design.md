# KC Phase 4 — Work Product / Data Design

**Status:** **APPROVED FOR IMPLEMENTATION** (BATCH-04B / TASK-032 + TASK-033 + TASK-034)  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 4 Responsibility](./kc-phase4-responsibility-product-data-design.md) · Frozen post-campaign architecture · [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md) · [ARCH-009 Phase 4 Work gate](./kc-phase4-work-foundation-arch009-gate.md)  
**Scope of this document:** Person → Responsibility → Unit / Scope + Tenure → Work  
**Implementation:** TASK-032 (entity) · TASK-033 (lifecycle) · TASK-034 (contextual permissions)

Label every item below as **DESIGN DECISION** (locked) or **IMPLEMENTATION TASK** (this batch).

---

## 1. Objective

Establish the minimum durable Work foundation and its contextual permission boundary:

```text
Person (existing Rukn)
        ↓
Responsibility          ← REUSE (BATCH-04A)
        ↓
Unit / Scope + Tenure   ← REUSE (Phase 1 + BATCH-04A)
        ↓
Work                    ← INTRODUCE (this batch)
```

**Frozen definition:** Work = a concrete thing that needs to be done.

**DESIGN DECISION:** Work is the operational record. It is **not** Responsibility, **not** a Task/Activity hierarchy, **not** a project-management model, and **not** a replacement for follow-up / annexure SoTs (those remain; later REFACTOR CAREFULLY may point Work at them).

**DESIGN DECISION:** Existing production remains the live user-facing system. This batch is additive and locally testable first. No Vercel / production deploy.

**DESIGN DECISION:** Rukn dashboard, Admin dashboard, notifications, Calendar, Occurrence, Campaign / Local Programme, and WI/BM changes are **out of scope**.

---

## 2. Entity definition

### 2.1 Purpose

**DESIGN DECISION:** A Work record names one concrete operational unit: what needs to be done, who is the assignee (existing Rukn), which Unit / Scope it belongs to, and optionally which standing Responsibility it is associated with.

| | |
|--|--|
| Disposition | **NEW** durable entity (Phase 0: INTRODUCE / REFACTOR — Phase 4). This batch **INTRODUCES** only; it does not refactor follow-ups or annexure. |
| Owner | Administrator creates / administers. Rukn may act only with valid contextual permission. |
| Phase 0 map | INTRODUCE — Phase 4 |
| Not | Task · Activity · Assignment+Task tree · Kanban card · Responsibility · Occurrence |

### 2.2 What needs to be done

**DESIGN DECISION:** `title` is a required free-text label for the concrete work. It is not a closed taxonomy and not a Responsibility `nature`.

### 2.3 Assignee / person

**DESIGN DECISION:** Assignee is an existing **Rukn** (`ruknId` — same person-reference convention as Responsibility and follow-ups).

| Rule | Decision |
|------|----------|
| People SoT | Existing `rukns` + `karkuns` remain canonical. Work does not replace them. |
| Assignee | `ruknId` — required reference to an existing Rukn |
| Mutation | Work **must not** write `unitId` or any other field onto the person record |
| Karkun as assignee | **Not introduced.** |

### 2.4 Related Responsibility

**DESIGN DECISION:** `responsibilityId` is optional (“where applicable”). When present it must reference an existing Responsibility, and Work `ruknId` / `unitId` must match that Responsibility.

**DESIGN DECISION:** Missing or invalid `responsibilityId` **cannot** grant Rukn contextual access. Admin may still persist Work without a Responsibility (administrative control).

### 2.5 Unit / Scope

**DESIGN DECISION:** Work references the existing Phase 1 Unit (`unitId` required). Unit remains flat. No second hierarchy. **No `unitId` on people.**

When `responsibilityId` is set, `unitId` is taken as consistent with that Responsibility — not a parallel scope.

### 2.6 Due date

**DESIGN DECISION:** Optional `dueDate` (`YYYY-MM-DD`) is included because the frozen Phase 0 query map already names due date on `work`. It is not a calendar product and not effort/time tracking.

### 2.7 Occurrence

**DESIGN DECISION:** `occurrenceId` is **not** on this minimum record. The approved relationship is Person → Responsibility → Unit / Tenure → Work. Linking Work to Occurrence is a later task; this batch does not modify Occurrence.

---

## 3. Lifecycle (TASK-033)

**DESIGN DECISION:** Only three statuses. `Blocked` is not introduced — follow-ups have no Blocked state and no implementation need requires it.

```text
pending → in_progress → done
```

| From | Allowed to |
|------|------------|
| *(create)* | `pending` only |
| `pending` | `pending` (idempotent save), `in_progress` |
| `in_progress` | `in_progress` (idempotent save), `done` |
| `done` | `done` (idempotent save) |

**DESIGN DECISION:** No skip (`pending` → `done`), no reverse, no cancel/defer, no subtasks, no Kanban, no priority engine.

Same-status saves are allowed so title / due date / metadata can update without a fake transition.

---

## 4. Minimal fields

Metadata follows existing KC patterns (`createdAt` / `updatedAt` / `createdBy` / `updatedBy`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Stable document id (`work-{time36}-{rand}`) |
| `title` | string | Yes | What needs to be done |
| `ruknId` | string | Yes | Assignee — existing `rukns` document id |
| `unitId` | string | Yes | Existing Phase 1 Unit id |
| `responsibilityId` | string | No | Existing Responsibility id when applicable |
| `status` | `'pending' \| 'in_progress' \| 'done'` | Yes | Lifecycle |
| `dueDate` | `YYYY-MM-DD` | No | Frozen query map; not a calendar SoT |
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | string | Yes | Audit metadata on the record |

**DESIGN DECISION:** No nested task arrays, no effort fields, no dependency graph, no permission-grant blobs.

---

## 5. Relationships

```text
Rukn (people SoT)     Unit (Phase 1, flat)
        ↑                      ↑
        └──── Responsibility ──┘
                    ↑
                    │ (optional)
                  Work
```

| Relationship | Cardinality | DESIGN DECISION |
|--------------|-------------|-----------------|
| Work → Rukn | many → 1 | `ruknId` required; person unchanged |
| Work → Unit | many → 1 | `unitId` required; Unit unchanged / flat |
| Work → Responsibility | many → 0..1 | optional; when set, person + unit must match |
| Responsibility → Work | none stored on Responsibility | Responsibility is not a hidden Work store |

**DESIGN DECISION:** Collection `work` — one document per Work (KC-ARCH-001; no LWW blob).

---

## 6. Source-of-truth

| Concept | SoT | Not SoT |
|---------|-----|---------|
| People | Existing `rukns` / `karkuns` | Work |
| Unit / Scope | Existing `units` | Copied place strings on Work |
| Responsibility | Existing `responsibilities` | Work.title |
| Work | New `work` docs | Responsibility.nature; Mission Workspace queue; follow-ups (not refactored here) |
| Permissions | `administrator` \| `rukn` + in-force Responsibility + Unit + Tenure | A permission-matrix product; new Work roles |

---

## 7. Contextual permissions (TASK-034)

Frozen model (do not redesign):

```text
Base Role + Active Responsibility + Unit / Scope + Tenure
```

**DESIGN DECISION:**

| Layer | Behaviour |
|-------|-----------|
| **Base Role** | Keep `administrator` \| `rukn` |
| **Admin** | Administrative control: create / read / update Work. No client delete. |
| **Rukn act** | Allowed only when Work has a `responsibilityId` that resolves to an **in-force** Responsibility for that Rukn, with matching `unitId` and `ruknId`, as of the evaluation date. |
| **Missing / invalid Responsibility** | Deny Rukn. Do not infer access from Unit alone or from assignee alone. |
| **Responsibility writes** | Remain Administrator only. |
| **Responsibility reads** | Administrator, or Rukn reading **own** (`ruknId` match). Resolves P4-C so contextual Work permission can be derived from Responsibility data. |

**DESIGN DECISION:** No new roles, no claim redesign, no permission-matrix UI, no generic policy engine. Application helper `canActOnWork` is the deterministic rule; Firestore rules provide a persistence floor (Admin; Rukn assignee + active linked Responsibility + matching unit). Tenure completeness stays in the helper (reuses `isResponsibilityInForce`).

---

## 8. What is reused

| Reused | How |
|--------|-----|
| `rukns` | Person reference via `ruknId` |
| Phase 1 `units` / `UnitRepository` | Scope via `unitId` |
| Phase 4 Responsibility | Optional `responsibilityId`; tenure via `isResponsibilityInForce` |
| `administrator` / `rukn` | Base Role |
| `assignedToRukn` | Firestore helper for assignee / own-Responsibility reads |
| ID / timestamp conventions | `work-{time36}-{rand}`; ISO timestamps; `YYYY-MM-DD` dates |
| Repository + provider | Same local / Firestore bundle; soft background hydrate |

---

## 9. What is genuinely new

| New | Notes |
|-----|-------|
| Work entity | Concrete operational record |
| `work` collection / storage key | Per-document upsert |
| Lifecycle helpers | pending → in_progress → done only |
| `canActOnWork` | Contextual permission from Responsibility + Unit + Tenure |
| Firestore rules for `work` | Admin administers; Rukn acts with linked active Responsibility |
| Rukn read-own on `responsibilities` | Required for contextual derivation (P4-C) |

---

## 10. Explicitly out of scope

- Rukn / Admin dashboards; Planning UI for Work
- Notifications, Calendar, Occurrence, Campaign, Local Programme, WI/BM
- Refactor of follow-ups / annexure into Work subtypes
- Task / Activity / assignment hierarchy; Kanban; effort / time tracking; dependencies
- `Blocked`, cancel, defer
- `occurrenceId` on Work
- `unitId` on people; Karkun/Rukn schema changes
- Application/service layer beyond the permission helper
- Production data changes; Vercel deploy; composite indexes

---

## 11. Implementation sequence (this session)

| Task | Kind | Work |
|------|------|------|
| **TASK-032** | IMPLEMENTATION | Domain type + repository + persistence |
| **TASK-033** | IMPLEMENTATION | pending → in_progress → done |
| **TASK-034** | IMPLEMENTATION | `canActOnWork` + Firestore floor + Rukn read-own Responsibility |

Do **not** start TASK-035.
