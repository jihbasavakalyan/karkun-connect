# KC Phase 4 Responsibility Foundation — KC-ARCH-009 Gate

**Ticket:** BATCH-04A / TASK-028 + TASK-029 + TASK-030 + TASK-031  
**Type:** New Feature (Responsibility domain)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 4 Responsibility design](./kc-phase4-responsibility-product-data-design.md) · [Phase 1 Unit / Scope](./kc-phase1-product-data-design.md) · [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 3 — CERTIFIED](./kc-phase3-occurrence-foundation-arch009-gate.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for the minimum Responsibility foundation (person → responsibility → Unit / Scope + tenure)

Phase 0–3 of **prior** post-campaign work are already certified and are **not** re-analysed here.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **New Feature** |
| Request | Minimum Responsibility entity, tenure, Unit/Scope reference, Admin-only persistence protection |
| Not | Work, dashboards, notifications, Campaign/Programme/Occurrence/WI/BM changes, people-schema changes, Vercel deploy |

**STOP checks (this batch):**

| Check | Result |
|-------|--------|
| Responsibility requires changing the frozen people model? | **NO** — `ruknId` reference only; no person mutation; no `unitId` on people |
| Unit / Scope cannot be reused safely? | **NO** — required `unitId` to existing Phase 1 Unit; Unit stays flat |
| Contextual permission model requires a new permission architecture? | **NO** — existing `administrator` \| `rukn`; Admin-only collection rules |
| Genuine product decision required for Responsibility semantics? | **NO** — frozen definition is sufficient; nature is an open label (P4-A–C deferred) |

---

## Impact (this batch only)

| Area | Impacted? | How |
|------|-----------|-----|
| Types | Y | New Responsibility |
| Repositories / provider | Y | ResponsibilityRepository + local/Firestore; Unit + Rukn injected for parent checks |
| Firestore | Y | `responsibilities` collection + Admin-only rules; no composite indexes |
| Bootstrap / hydrate | Y | Soft background hydrate only |
| Tenure helpers | Y | `src/lib/responsibility/tenure.ts` — in-force / range only |
| UI / dashboards / Work / Campaign / Occurrence / people schemas | N | Explicitly out of scope |

**Reuse-first:** Phase 1 `UnitRepository`; existing `RuknRepository`; existing ID/timestamp/archive/provider/writeDoc/soft-hydrate patterns. No second person entity. No service layer.

---

## Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| People records | **HIGH** if mutated | Save path writes only `responsibilities`; verify rukn snapshot unchanged |
| Unit hierarchy | **HIGH** if new org tree | `unitId` FK only; no parentUnitId; Unit verify still valid |
| Permissions | MEDIUM | Admin-only rules mirroring `units` / `occurrences`; no new roles |
| Bootstrap | MEDIUM | Soft-empty hydrate; non-critical path |
| Work / dashboards | LOW | Not implemented |

---

## Implementation plan

1. Types + tenure helpers + repository contract  
2. Local + Firestore persistence (validate existing `ruknId` + `unitId`)  
3. Collection / storage key / Admin rules / provider / soft hydrate  
4. Focused verify + `npm run typecheck`  
5. No UI, Work, indexes, or production deploy  

**Rollback:** Remove new responsibility modules/collection wiring. People, Unit, Campaign, Occurrence untouched.

**Success criteria:** Types compile; durable local CRUD; tenure in-force logic; Unit/Rukn parent validation; Admin-only rules; people/Unit records unchanged.

---

## Verification

| Check | Evidence |
|-------|----------|
| `npm run typecheck` | exit 0 |
| `npm run verify:kc-phase4-responsibility-foundation` | CRUD, tenure, Unit FK, person isolation, Admin rules |
| Planning persistence (if touched) | `verify:kc-phase1-planning-persistence` only if Unit wiring changes |

Reject “looks fixed.”

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Mutate Rukn/Karkun schema or add `unitId` on people? | NO |
| Second person / participant / assignment-role engine? | NO |
| New org hierarchy? | NO |
| Work / dashboards / notifications this batch? | NO |
| New permission architecture? | NO |
| Production / Vercel? | NO |

**GO.**

---

## After coding — Phases 4–6 (ARCH-009)

- **Phase 4 (audit):** Local Responsibility CRUD; tenure in-force; Unit/Rukn validation; no person mutation; no Work/UI  
- **Phase 5:** **READY WITH KNOWN LIMITATIONS** — no Admin/Rukn UI; no Work permissions; no composite indexes; no production / Vercel deploy; authenticated browser may be unverified without Admin credentials  
- **Phase 6:** N/A until production deploy authorised  

---

## Task status

| Task | Status |
|------|--------|
| TASK-028 — Responsibility design | **COMPLETE** |
| TASK-029 — Responsibility entity | **COMPLETE** (this batch) |
| TASK-030 — Responsibility tenure | **COMPLETE** (this batch) |
| TASK-031 — Responsibility scope / Unit | **COMPLETE** (this batch) |
| TASK-032 — Work | **COMPLETE** (BATCH-04B) |
| TASK-033 — Work lifecycle | **COMPLETE** (BATCH-04B) |
| TASK-034 — Contextual permissions | **COMPLETE** (BATCH-04B) |

Official counter after this batch: **31 / 72** (27 accounted + these four). No absorption.
