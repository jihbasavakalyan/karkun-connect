# KC Phase 4 Work Foundation — KC-ARCH-009 Gate

**Ticket:** BATCH-04B / TASK-032 + TASK-033 + TASK-034  
**Type:** New Feature (Work domain + contextual permissions)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 4 Work design](./kc-phase4-work-product-data-design.md) · [Phase 4 Responsibility](./kc-phase4-responsibility-product-data-design.md) · [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for the minimum Work foundation (Work + lifecycle + contextual permissions)

Phase 0–3 of **prior** post-campaign work are already certified and are **not** re-analysed here.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **New Feature** |
| Request | Minimum Work entity, Pending → In Progress → Done, contextual Rukn permission from active Responsibility + Unit + Tenure |
| Not | Task/Activity engine, dashboards, notifications, Occurrence/Campaign/WI/BM changes, people-schema changes, Vercel deploy |

**STOP checks (this batch):**

| Check | Result |
|-------|--------|
| Work requires a generic Task/Activity architecture? | **NO** — one Work record; no hierarchy |
| Responsibility cannot safely provide contextual authorization? | **NO** — in-force Responsibility + matching unit/person; missing/invalid denies Rukn |
| Unit / Scope model needs to change? | **NO** — `unitId` FK only; Unit stays flat |
| Frozen permission model insufficient (new permission architecture)? | **NO** — existing `administrator` \| `rukn` + Responsibility context |
| Genuine product decision required for Work semantics? | **NO** — frozen definition is sufficient; `Blocked` / `occurrenceId` not required |

---

## Impact (this batch only)

| Area | Impacted? | How |
|------|-----------|-----|
| Types | Y | New Work |
| Repositories / provider | Y | WorkRepository + local/Firestore; Unit + Rukn + Responsibility injected for parent checks |
| Firestore | Y | `work` collection + rules; Rukn read-own on `responsibilities`; no composite indexes |
| Bootstrap / hydrate | Y | Soft background hydrate only |
| Lifecycle helpers | Y | `src/lib/work/lifecycle.ts` |
| Authorization | Y | `src/lib/work/permissions.ts` — not a new auth architecture |
| UI / dashboards / Campaign / Occurrence / people schemas | N | Explicitly out of scope |
| followUps / annexure | N | Not refactored this batch |

**Reuse-first:** Responsibility tenure + repositories; Phase 1 Unit; existing Rukn; `assignedToRukn`; ID/timestamp/provider/writeDoc/soft-hydrate. No second person entity. No service layer.

---

## Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| People records | **HIGH** if mutated | Save path writes only `work`; verify rukn snapshot unchanged |
| Unit hierarchy | **HIGH** if new org tree | `unitId` FK only |
| Permissions | **HIGH** if role explosion | Keep two roles; contextual helper; missing Responsibility denies Rukn |
| Responsibility collection | MEDIUM | Writes stay Admin-only; add Rukn read-own only |
| Bootstrap | MEDIUM | Soft-empty hydrate; non-critical path |
| follow-ups / dashboards | LOW | Untouched |

**HIGH mitigations**

| Area | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| People | Accidental `unitId` on person | People SoT drift | No people writes | Verify script person snapshot | Remove Work modules |
| Unit | New hierarchy | Org model break | FK only | Unit verify still valid | Remove Work modules |
| Permissions | New roles / silent Rukn grant | Authz hole | Helper + rules; missing Responsibility denies | Focused permission cases | Revert rules + helper |

---

## Implementation plan

1. Types + lifecycle + permission helper + shape validation  
2. Local + Firestore persistence (validate existing `ruknId` + `unitId` + optional Responsibility consistency + transitions)  
3. Collection / storage key / rules / provider / soft hydrate  
4. Focused verify + `npm run typecheck` + existing Responsibility verify  
5. No UI, indexes, or production deploy  

**Rollback:** Remove new work modules/collection wiring; revert Rukn read-own on responsibilities. People, Unit, Campaign, Occurrence, Responsibility writes untouched.

**Success criteria:** Types compile; durable local CRUD; sequential lifecycle only; Unit/Rukn/Responsibility parent validation; Admin administers; Rukn contextual access; people records unchanged.

---

## Verification

| Check | Evidence |
|-------|----------|
| `npm run typecheck` | exit 0 |
| `npm run verify:kc-phase4-work-foundation` | CRUD, lifecycle, permissions, Unit FK, person isolation, rules |
| `npm run verify:kc-phase4-responsibility-foundation` | Still passes after Rukn read-own |

Reject “looks fixed.”

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Mutate Rukn/Karkun schema or add `unitId` on people? | NO |
| Task / Activity / assignment hierarchy? | NO |
| New org hierarchy? | NO |
| Dashboards / notifications / Occurrence this batch? | NO |
| New permission architecture / Work roles? | NO |
| Production / Vercel? | NO |

**GO.**

---

## After coding — Phases 4–6 (ARCH-009)

- **Phase 4 (audit):** Local Work CRUD; lifecycle transitions; contextual permission cases; no person mutation; Rukn action surface in BATCH-04C  
- **Phase 5:** See [Phase 4 certification](./kc-phase4-certification.md)  
- **Phase 6:** N/A until production deploy authorised  

---

## Task status

| Task | Status |
|------|--------|
| TASK-032 — Work | **COMPLETE** (this batch) |
| TASK-033 — Work lifecycle | **COMPLETE** (this batch) |
| TASK-034 — Contextual permissions | **COMPLETE** (this batch) |
| TASK-035 — Rukn Action Dashboard | **COMPLETE** (BATCH-04C) |
| TASK-036 — Phase 4 certification | **COMPLETE** (BATCH-04C) |
