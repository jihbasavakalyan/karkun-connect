# KC-0129 — KC-ARCH-009 Gate (Rukn Workspace Simplification & Communication-First Experience)

**Classification:** Enhancement (UX / workflow / presentation)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Scope:** Admin Rukn Connections cards + Connected Karkun Review entry-point consolidation. No campaign logic, repositories, Firestore schema, communication generation, or request-approval logic changes.

## Phase 0 — Root cause & impact

**Request type:** Enhancement  

**Problem (proven):**  
1. Connections overview previously emphasized capacity/completed stats (addressed in prior KC-0129 card redesign).  
2. Connected Karkun cards expose a standalone **To Muttafiq** button competing with **Review**; conversion should be one Review reason that reuses the same request dialog / Inbox / approval path.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | Y | `RuknAssignmentCard` polish; `ConnectedKarkunCard` remove To Muttafiq; `RequestReviewModal` add Convert to Muttafiq option |
| Pages | N | Existing hosts unchanged |
| Lib / presentation | Y (minor) | Unavailable last-communication shows `-` |
| Services / approval | N | Still call `submitAssignmentReviewRequest` / `submitKarkunToMuttafiqConversionRequest` — entry point only |
| Repositories / Firestore / APIs | N | Forbidden |
| Campaign / assignment logic | N | Forbidden |
| Auth / Bootstrap / Dashboard math | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Persistence / approval | LOW | Same conversion + review services; no new paths |
| AssignmentReviewReason type | LOW | Convert to Muttafiq is modal UI action — not added to assignment-review reason enum / persistence |
| UI discoverability | MEDIUM | Muttafiq under Review; verify option visible when category is Karkun |
| Campaign / capacity | N/A | Overview already capacity-free |

### HIGH items

None.

## Phase 2 — Implementation plan

1. `RequestReviewModal`: optional `allowConvertToMuttafiq`; reason list adds **Convert to Muttafiq**; confirm callback union routes parent.
2. `ConnectedKarkunCard`: remove To Muttafiq button; on Confirm, if Convert → existing `submitKarkunToMuttafiqConversionRequest`, else existing review submit.
3. `RuknAssignmentCard`: show `-` when last communication unavailable; keep operational pending rows + Communicate primary.
4. Verify script asserts no standalone To Muttafiq; Convert option in Review modal; capacity/completed absent from overview card.
5. No schema / repo / approval-logic changes.

**Rollback:** Revert the three component files + verify/gate updates.

## Phase 3 — Verification

- `npm run lint` / `typecheck` / `build` / `verify:kc-0129`
- Manual: Review → Convert to Muttafiq opens same conversion submit → Admin Inbox
- Regression: other Review reasons still create assignment review requests

## Go / No-Go

| # | Answer |
|---|--------|
| Root cause proven? | YES |
| Software / UX problem? | YES |
| Config/ops only? | NO |
| Bootstrap / auth / repos / Firestore / campaign math / approval logic? | NO |
| Proceed? | **GO** |

---

## Phase 4–6

Filled after implementation and production verification.

---

## Phase 4 — Regression audit

- `npm run verify:kc-0129` exit 0 (capacity/completed absent; To Muttafiq removed; Convert under Review; briefing/modal intact)
- `npm run lint` / `typecheck` / `build` pass
- Conversion still calls `submitKarkunToMuttafiqConversionRequest`; review reasons still call `submitAssignmentReviewRequest`

## Phase 5 — Certification

**READY**

## Phase 6 — Post-deploy

Pending production deploy + verification.
