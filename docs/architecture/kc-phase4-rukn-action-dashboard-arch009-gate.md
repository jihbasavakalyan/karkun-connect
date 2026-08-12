# KC Phase 4 — Rukn Action Dashboard ARCH-009 Gate

**Ticket:** BATCH-04C / TASK-035 + TASK-036  
**Type:** Enhancement (Rukn-facing Work action surface) + Certification  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 4 Work design](./kc-phase4-work-product-data-design.md) · [Phase 4 Work gate](./kc-phase4-work-foundation-arch009-gate.md) · [Phase 4 Responsibility](./kc-phase4-responsibility-product-data-design.md) · [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 gate for the minimum Rukn Work action surface, then Phase 4 integration certification

Phase 0–3 of **prior** post-campaign work are already certified and are **not** re-analysed here.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Minimum Rukn-facing actionable Work on existing `/rukn` Home; reuse TASK-034 permissions; certify Phase 4 chain |
| Not | Admin dashboard redesign, new dashboard framework, Campaign/Programme/Occurrence/WI/BM, notifications, Calendar, Phase 5 |

**STOP checks (this batch):**

| Check | Result |
|-------|--------|
| Rukn dashboard requires a new permission architecture? | **NO** — reuse `canActOnWork` |
| Work authorization cannot safely reuse TASK-034? | **NO** — list + click-time guard both call `canActOnWork` |
| Dashboard requires changing Responsibility or Work model? | **NO** — read/update existing fields only |
| Genuine product decision required? | **NO** |
| Scope expanding into Phase 5? | **NO** |

---

## Impact (this batch only)

| Area | Impacted? | How |
|------|-----------|-----|
| Rukn Home | Y | New Work action section; existing Mission/Execution/Follow-up unchanged |
| Work helper | Y | `listRuknWorkActionItems` filters through `canActOnWork` |
| Lifecycle | Y | `nextWorkActionStatus` only (pending → in_progress → done) |
| Routing / nav | N | No new route; no new bottom-nav item |
| Admin dashboard | N | Out of scope |
| Campaign / Programme / Occurrence / WI / BM | N | Untouched |
| People schema | N | Untouched |
| Firestore rules / collections | N | Reuse BATCH-04B |

**Reuse-first:** `RuknHomePage` + `WidgetErrorBoundary` + card/list/`PrimaryButton`/`StatusBadge`/`useBusyAction`/`saveDurable`/`formatPersistFailureBanner`/`confirmExecutionSaveFeedback`/`canActOnWork`. No service layer. No new dashboard framework.

---

## Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Permissions | **HIGH** if UI grants by login/title/unit alone | Filter + click guard via `canActOnWork`; verify missing/expired/archived deny |
| Rukn Home | MEDIUM | Isolated widget; existing sections unchanged |
| Lifecycle | MEDIUM | Only `nextWorkActionStatus`; repository still rejects skip/reverse |
| Campaign / WI / BM | LOW | No file changes |

---

## Implementation plan

1. Presentation helper `listRuknWorkActionItems` (authorized pending / in-progress only)  
2. `RuknWorkActionPanel` on existing Rukn Home  
3. Durable `saveDurable` for Start / Mark done  
4. Focused verify + existing Phase 4 verifies + typecheck + build  
5. Phase 4 certification artifact  

**Rollback:** Remove panel + helper; Home returns to prior sections.

**Success criteria:** Rukn sees only authorized actionable Work; one-click pending → in_progress → done; invalid Responsibility hidden; people/Unit/Campaign/Occurrence unchanged.

---

## Verification

| Check | Evidence |
|-------|----------|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `verify:kc-phase4-responsibility-foundation` | still passes |
| `verify:kc-phase4-work-foundation` | still passes |
| `verify:kc-phase4-rukn-action-dashboard` | filter, overdue, lifecycle actions, Home wiring, no new nav/roles |

Reject “looks fixed.”

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| New permission architecture / Work roles? | NO |
| Change Responsibility or Work schema? | NO |
| Admin dashboard redesign? | NO |
| Campaign / Occurrence / WI / BM / notifications / Calendar? | NO |
| `unitId` on people? | NO |
| Production / Vercel? | NO |

**GO.**

---

## After coding — Phases 4–6 (ARCH-009)

See [Phase 4 certification](./kc-phase4-certification.md).
