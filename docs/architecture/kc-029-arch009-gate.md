# KC-029 — Professional Campaign Report Redesign — KC-ARCH-009 Gate

**Ticket:** KC-029  
**Type:** Enhancement (UI / UX redesign — presentation + derived analytics display)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · reuse KC-0114 / KC-BUG-0126 HTML→PDF pipeline  
**Date:** 2026-07-31  
**Constraint:** No Firestore schema change · no report generation engine rewrite unless required for layout · reuse existing report data · no logos · no trophies · print-ready A4 PDF.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Executive report visual redesign | Enhancement (UI/UX) |
| KPI cards + progress bars + circular progress | Enhancement (presentation) |
| Tiered data-driven recommendations | Enhancement (derived copy from existing metrics) |
| Weighted Overall Performance Score + Top 5 / category leaders | Enhancement (presentation analytics; no new persistence) |
| Urdu terminology / section rename | Enhancement (copy) |
| Paged PDF capture (`.pdf-page`) | Enhancement (print quality) |

**Primary request type:** Enhancement (UI / UX redesign)

### 0.2 Root cause / motivation

Prior Campaign Report (KC-0114) rendered dense tables and generic recommendation paragraphs. Product asks for an executive dashboard appearance with gender / Muttafiqeen KPIs, intelligent recommendation tiers, and multi-metric recognition — without changing Firestore or upstream metric engines.

**STOP rule:** Not Configuration / Infrastructure / Data / Ops — presentation + in-memory composition only. Evidence: report already built from dashboard getters in `campaignReportModel.ts`; PDF via `urduHtmlToPdf.ts`.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | LOW | `GenerateCampaignReportButton` unchanged; PDF HTML only |
| Pages | N | Campaigns / Weekly Ijtema entry points unchanged |
| Hooks | N | |
| Services / Repositories | N | Reuse existing getters only |
| Firestore | N schema | No writes, no rules |
| Auth / Session / Bootstrap | N | |
| Dashboard / Metrics | N engines | Read-only composition; new weighted score is display-only |
| Campaign / Automation | N logic | |
| Notifications / Voice / API | N | |
| Caching / Persistence | N | |
| Routing / State | N | |
| Performance | LOW | Per-page html2canvas may increase export time slightly |
| Monitoring / Logging | N | |
| Security | N | |
| Dependencies | N | Same html2canvas + jsPDF |
| Reporting module | Y | `campaignReportModel` · `campaignReportPdf` · `campaignReportUrdu` · `urduHtmlToPdf` · `urduPdfTypography` |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Persistence / Firestore / Auth / Bootstrap | LOW / N/A | No writes |
| Dashboard metric engines | LOW | Read-only; denominators unchanged |
| PDF export reliability | MEDIUM | Paged capture + CSS complexity |
| Urdu RTL / typography | MEDIUM | Nastaliq shaping must remain |
| Verify contracts (KC-0125 / KC-BUG-0126) | MEDIUM | Label + CSS token assertions updated with redesign |
| Recognition / score fairness | MEDIUM | New weights must match product brief |

### HIGH items

None in durability domains.

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| PDF page overflow | Tall sections | Clipped / ugly pages | `.pdf-page` sections + per-page capture | Manual A4 PDF smoke; `verify:kc-bug-0126` | Revert reporting commits |
| Weighted score | Wrong weights | Misleading Top 5 | Encode V30/A20/WI20/BM20/C10 in `computePerformanceScore` | Unit-style assert via verify + manual | Revert model change |

### Operational classification

Engineering — proceed. Not ops-only.

---

## Phase 2 — Implementation plan

### Strategy

Extend `CampaignReportModel` with gender/Muttafiqeen KPIs, activity breakdowns, recommendation groups, weighted scores, Top 5 + category leaders. Redesign HTML/CSS in `campaignReportPdf` + `urduReportShellCss`. Preserve HTML→PDF OpenType pipeline. Update Urdu copy; remove `سرکاری`. No Firestore / service engine changes.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-029-arch009-gate.md` |
| Edit | `src/lib/reporting/campaignReportModel.ts` |
| Edit | `src/lib/reporting/campaignReportPdf.ts` |
| Edit | `src/lib/reporting/campaignReportUrdu.ts` |
| Edit | `src/lib/reporting/urduHtmlToPdf.ts` |
| Edit | `src/lib/reporting/urduPdfTypography.ts` |
| Edit | `scripts/verify-kc0125-editorial-approval.ts` |
| Edit | `scripts/verify-kc-bug-0126-urdu-pdf-typography.ts` |

### Order / commits

1. `feat(report): redesign executive campaign report UI and analytics`

### Rollback

Revert that commit; prior KC-0114 table report restored.

### Success criteria

- Executive appearance; no logo; no trophies  
- Male/Female + Muttafiqeen KPIs; activity progress bars; circular overall %  
- Tiered recommendations from report data  
- Top 5 by weighted score + category leaders  
- Compact individual Rukn cards  
- Print-ready A4 RTL PDF  

---

## Phase 3 — Verification plan

| Check | Method | Evidence |
|-------|--------|----------|
| Editorial Urdu contracts | `npm run verify:kc0125` | PASS log |
| PDF typography / executive tokens | `npm run verify:kc-bug-0126` | PASS log; primary `#0b1f3a`; `exec-header`; `pdf-page`; `topOverallPerformers` |
| Typecheck | `npx tsc -b` | Clean |
| Manual PDF smoke | Admin → Campaigns → مہم کی رپورٹ (PDF) | A4 pages; header meta; KPI cards; tiers; Top 5; Rukn cards; footer version + disclaimer |
| Hard refresh / fresh login | Not report-path sensitive | N/A beyond button still downloads |

Reject: “looks fixed” without PDF download + verify PASS.

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Firestore schema change? | NO |
| New persistence pattern? | NO |
| Auth / bootstrap / dashboard engines changed? | NO |
| Presentation + derived display analytics only? | YES |
| Impact / mitigation / regression tests for YES items? | YES — PDF medium risk mitigated by paged capture + verify scripts |
| Proceed to code? | **GO** |

---

## Phase 4 — Post-implementation audit

| Area | Result |
|------|--------|
| Workflows (Campaigns / Weekly Ijtema report button) | Unchanged API; HTML body redesigned |
| Dashboard / bootstrap / auth / Firestore / repos | Untouched |
| Console / infinite loading | Export is async download; button busy state preserved |
| Console regressions from new CSS | Visual-only |

**Workflows tested:** verify scripts; typecheck; model composition paths for Top 5 / recommendations / KPIs.

---

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

Known limitations:
1. Muttafiqeen are outside campaign execution metrics — activity cards show Muttafiqeen as empty (`—`) while KPI people counts remain accurate.
2. “Most Improved” uses a proxy (activity avg vs connection baseline) because historical snapshots are not available without schema/storage changes.
3. PDF is rasterized (html2canvas); very large Rukn lists increase export time.

Deploy not banned (no durability risk). Prefer smoke-download of one production PDF after deploy.

---

## Phase 6 — Post-deploy verification (record after deploy)

| Check | Expected | Actual |
|-------|----------|--------|
| Admin login → Campaigns → PDF | Downloads executive report | _pending deploy_ |
| Header title / campaign / no `سرکاری` | Matches Urdu copy | _pending_ |
| KPI Male/Female / Muttafiqeen | Present | _pending_ |
| Top 5 + category leaders | Rank badges, no trophies | _pending_ |
| Footer version + disclaimer | Present | _pending_ |
| Hard refresh / logout-login | Button still works | _pending_ |

---

## Permanent rules compliance

Think → Prove → Reuse → Measure → Verify → Certify  
Evidence-driven; no speculative engine rewrite; operational issues ≠ code fixes.
