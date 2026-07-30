# KC-034 — KC-ARCH-009 Gate (Executive Report Final Polish)

**Classification:** Enhancement (presentation / editorial / IA)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Request type:** Enhancement (no calculation / schema / automation changes)

## Phase 0 — Root cause & impact

**Problem:** Executive PDF is operationally dense but ranks selectively, repeats metrics, and needs Urdu editorial + Men/Women terminology consistency for leadership presentation.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Report model / PDF / Urdu copy | Y | Hero IA, performance bands, exception lists, recommendations, terminology |
| Dashboard (non-report) | N unless shared Urdu terms already in report-only files |
| Canonical metrics / Health / repos / Firestore | N | Forbidden — reuse existing getters |
| Automation / Rafeeq / Communication | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Campaign Health formulas | N/A | Unchanged |
| Connection vs Visit | LOW | Keep separate metrics/labels |
| Verify contracts (kc-bug-0126, kc0125) | MEDIUM | Update asserts for Top-5 → bands |
| PDF page count | LOW | Shorter by design |

No HIGH items. Proceed.

## Phase 2 — Plan

1. Polish `campaignReportUrdu.ts` (Men/Women, section titles, exception labels, band labels).
2. Extend model: performance bands + exception name lists; tighten recommendations from pending data.
3. Rebuild PDF page 1 hero (org → campaign summary → overall); page 2 bands + exceptions + recs; compact individual table.
4. Refresh verify scripts; typecheck.

## Phase 3 — Verification

- `npm run verify:kc-bug-0126`, `verify:kc0125`
- `npm run typecheck`
- Manual: Connection ≠ Visit labels; Men/Women; bands; exception lists

## Go / No-Go

| # | Answer |
|---|--------|
| Root cause proven? | YES — editorial/IA debt on presentation layer |
| Schema / canonical metrics changed? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows exercised via verify scripts + typecheck:

- Executive PDF HTML pipeline (RTL, Nastaliq, paged capture)
- Connection vs Visit separate labels/columns
- Progress bands + exception lists replace Top-5
- Recommendations derived from pending metrics
- No Firestore / canonical metric / automation changes

## Phase 5 — Certification

**READY** — presentation-only; verifies green; typecheck green.

## Phase 6 — Post-deploy

Generate PDF from Admin Campaigns / Weekly Ijtema → confirm hero org stats, bands, follow-up lists, Men/Women (مرد/خواتین), Connection ≠ Visit.
