# KC-029.1 — Executive Report Optimization — KC-ARCH-009 Gate

**Ticket:** KC-029.1  
**Type:** Enhancement (presentation / ranking selection / copy)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · builds on KC-029  
**Date:** 2026-07-31  
**Constraint:** No Firestore schema · no repository · no metric provider · no PDF pipeline rewrite · no weighted-score formula change (30/20/20/20/10). Layout, ranking selection, wording, pagination only.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Remove awkward coverage terminology | Enhancement (copy) |
| Category leaders ignore zero scores | Bug Fix (selection logic) |
| Compress PDF whitespace / cards / pagination | Enhancement (layout) |
| Simplify individual Rukn cards | Enhancement (presentation) |

**Primary request type:** Enhancement (with selection Bug Fix)

### 0.2 Root cause

| Issue | Classification | Evidence |
|-------|----------------|----------|
| Category leaders at 0% | Implementation | `pickCategoryLeader` sorts by pct and takes `[0]` with no `> 0` / `completed > 0` guard (`campaignReportModel.ts`) |
| `زیرِ کوریج` / کوریج wording | Implementation | `URDU_REPORT.kpi.peopleCovered`; recommendation copy uses `کوریج` |
| ~30-page PDF | Implementation | Heavy card padding + gender mini-grids + `chunkSize = 4` over ~active Rukns |
| Operational dump feel | Implementation | Individual cards repeat Male/Female stats already on executive KPI grid |

**STOP rule:** Not Configuration / Infrastructure / Data / Ops — presentation + in-memory selection only.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | N | Button API unchanged |
| Pages / Hooks | N | |
| Services / Repositories / Firestore | N | No schema, no getters rewrite |
| Auth / Session / Bootstrap | N | |
| Dashboard / Metrics engines | N | Read-only; weights unchanged |
| Campaign / Automation / API | N | |
| Caching / Persistence / Routing | N | |
| Performance | LOW | Fewer/taller pages → usually faster capture |
| Reporting module | Y | `campaignReportModel` · `campaignReportPdf` · `campaignReportUrdu` · `urduHtmlToPdf` CSS · verify scripts |
| Security / Dependencies | N | |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Persistence / Auth / Bootstrap / Firestore | N/A | No writes |
| Weighted score formula | LOW | Untouched (`computePerformanceScore`) |
| Category leader fairness | MEDIUM | Must not crown zero; empty-state copy required |
| PDF pagination / overflow | MEDIUM | Denser cards + chunk 6 |
| Urdu RTL / verify contracts | LOW–MEDIUM | Label assertions may need updates for removed coverage KPI |
| Metric APIs | N | Unchanged |

### HIGH items

None in durability domains.

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Zero leaders | Sort without floor | Misleading recognition | Require `pct > 0` and `completed > 0` | Assert empty message when all zero; verify script | Revert model commit |
| Page density | Too aggressive shrink | Unreadable | Keep font sizes ≥ current body; shrink padding/margins only | Visual PDF smoke | Revert CSS |

### Operational classification

Engineering — proceed.

---

## Phase 2 — Implementation plan

### Strategy

1. Remove coverage terminology and the redundant people-covered KPI (totals already shown).  
2. Gate category leaders (and legacy `pickTop`) on metric/completion > 0; always render all five categories with empty copy when none qualify.  
3. Compact CSS + simplify individual cards (name, totals, five activities, overall — no gender grids).  
4. Raise Rukn chunk to 6; tighten executive page spacing; preserve HTML→PDF pipeline.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-029-1-arch009-gate.md` |
| Edit | `src/lib/reporting/campaignReportModel.ts` |
| Edit | `src/lib/reporting/campaignReportPdf.ts` |
| Edit | `src/lib/reporting/campaignReportUrdu.ts` |
| Edit | `src/lib/reporting/urduHtmlToPdf.ts` |
| Edit | `scripts/verify-kc0125-editorial-approval.ts` (if labels asserted) |
| Edit | `scripts/verify-kc-bug-0126-urdu-pdf-typography.ts` (add zero-leader / no-coverage asserts) |

### Order / commit

1. `refactor(report): optimize executive PDF layout and ranking logic (KC-029.1)`

### Rollback

Revert that commit.

### Success criteria

- No `زیرِ کوریج` / Coverage-style report wording  
- No zero-performance category leaders  
- Compact individual cards; ~4–6 per page  
- Executive answers stand / attention / best / follow-up in first pages  
- Schema, repos, metric APIs, PDF pipeline, weights unchanged  

---

## Phase 3 — Verification plan

| Check | Method | Evidence |
|-------|--------|----------|
| No coverage terms | Grep report sources + verify script | Zero matches in reporting module |
| Zero leaders | Model logic + verify asserts `noCategoryLeader` copy wired | PASS |
| Compact cards | Source review: no gender mini-grid on rukn cards; chunkSize ≥ 5 | PASS |
| Contracts | `npm run verify:kc0125` · `npm run verify:kc-bug-0126` | PASS |
| Typecheck | `npx tsc -b --pretty false` (scoped if full fails env) | Clean for reporting |
| RTL / pagination | Preserve `pdf-page` + `dir=rtl` | Existing verify |

Reject: “looks shorter” without verify PASS + source evidence of density changes.

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Firestore schema change? | NO |
| Repository / metric API change? | NO |
| Weighted formula change? | NO |
| PDF generation pipeline rewrite? | NO |
| Presentation + selection only? | YES |
| Impact / mitigation / regression for YES? | YES — ranking + pagination medium risk mitigated by empty-state + verify |
| Proceed to code? | **GO** |

---

## Phase 4 — Post-implementation audit

| Area | Result |
|------|--------|
| Workflows (Campaigns PDF button) | Unchanged API |
| Dashboard / bootstrap / auth / Firestore / repos / metric APIs | Untouched |
| Weighted score 30/20/20/20/10 | Untouched |
| PDF pipeline (html2canvas + jsPDF + `.pdf-page`) | Preserved; denser CSS only |
| Terminology | `زیرِ کوریج` / Coverage removed from report copy |
| Category leaders | Require metric > 0 and completion > 0; empty Urdu state otherwise |
| Individual cards | Compact; totals + activities only; no gender mini-grid |
| Pagination | `chunkSize = 6`; reduced padding; pages 1–2 carry stand / attention / best |

**Workflows tested:** `verify:kc0125` PASS · `verify:kc-bug-0126` PASS · `tsc -b` clean

---

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

Known limitations (carry from KC-029):
1. Muttafiqeen remain outside campaign execution metrics on activity cards (executive KPIs still show counts).
2. “Most Improved” remains a proxy without historical snapshots.
3. Absolute page count still scales with active Rukn count; density targets ≤8 for typical campaigns when cards fit A4 without overflow splits.

Deploy not banned (presentation-only). Prefer one Admin PDF smoke after deploy.

---

## Phase 6 — Post-deploy verification (record after deploy)

| Check | Expected | Actual |
|-------|----------|--------|
| Admin → Campaigns → PDF | Downloads; ≤ ~8 pages for typical roster | _pending_ |
| No `زیرِ کوریج` | Absent | _pending_ |
| Zero category leaders | Empty Urdu message, not 0% winner | _pending_ |
| Compact individual cards | Name, totals, 5 activities, overall | _pending_ |
| Hard refresh / logout-login | Button still works | _pending_ |

---

## Permanent rules compliance

Think → Prove → Reuse → Measure → Verify → Certify  
Evidence-driven; no speculative engine rewrite; operational issues ≠ code fixes.
