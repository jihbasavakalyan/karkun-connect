# KC-037A — KC-ARCH-009 Gate (Executive Report Framework Foundation)

**Classification:** New Feature (architecture foundation) + Migration (PDF data path)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · [KC-037](./kc-037-executive-report-framework-v2.md) · [KC-033](./kc-033-canonical-metric-registry.md)  
**Request type:** Report Composer + Section Registry; migrate KC-034 PDF to Composer — **no UI · no visual redesign · no alternate KPI math**

## Phase 0 — Root cause & impact

**Problem:** Executive PDF builds via `buildCampaignReportModel` calling dashboard/metrics services directly; KC-033 facade unused; no section registry or versioned report config for future exporters (Excel / dashboard / CSV).

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/lib/reporting/v2/**` (new) | Y | Composer, registry, config, context, provider binding |
| `canonicalCampaignMetrics.ts` | Y | Thin ForRukn / report-row aliases (KC-033 documented) |
| `campaignReportModel.ts` | Y | KPI reads via CanonicalMetricProviders only |
| `campaignReportPdf.ts` | Y | compose → extract model → same HTML |
| PDF HTML / Urdu / CSS | N | Forbidden redesign |
| UI / Firestore / auth / bootstrap / repos | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| PDF visual / editorial (KC-034) | **HIGH** | Same `buildCampaignReportHtml`; model shape unchanged; `verify:kc-bug-0126`, `verify:kc0125` |
| KPI values | **HIGH** | Provider methods = existing getters; no new formulas |
| Presentation bands / rankings | LOW | Keep existing presentation aggregations |
| Startup / auth / Firestore | LOW | Client-only |

For every HIGH: Why = PDF is leadership deliverable; Impact = wrong numbers or layout; Verification = verify scripts + smoke; Rollback = revert commit / redeploy prior.

## Phase 2 — Implementation plan

1. Gate + architecture docs  
2. `src/lib/reporting/v2/` — types, config, binding, registry, compose  
3. Extend `CanonicalMetricProviders` (aliases only)  
4. Section `kc034_executive_campaign` + planned stubs  
5. PDF via Composer; model uses providers  
6. `verify:kc-037a` + regression verifies  
7. Commit · push · deploy · Phase 5–6

## Phase 3 — Verification plan

| Check | Method |
|-------|--------|
| Composer assembles default PDF | `verify:kc-037a` |
| Extensibility (register section) | ephemeral section in verify |
| KPIs via providers | model has no direct dashboard/metrics imports |
| PDF regression | `verify:kc-bug-0126`, `verify:kc0125` |
| Types | `npm run typecheck` |
| Production | Admin Generate Campaign Report PDF smoke |

## Go / No-Go

| # | Answer |
|---|--------|
| 1 Root cause proven? | YES — architecture gap vs KC-037 Phase 1 |
| 2 Objective evidence? | YES — KC-037 gap map; model imports services |
| 3 Software problem? | YES |
| 4–5 Config / ops only? | NO |
| 6–10 Bootstrap/auth/authz/repos/Firestore? | NO |
| 11 Dashboard? | YES — Impact: facade aliases; Mitigation: same getters; Tests: verify:kc-033 / 037a |
| 12–14 Persistence/routing/cache? | NO |
| 15–16 Async/races? | NO |
| 17 Startup? | NO |
| 18 Existing workflows? | YES — PDF generate — Mitigation: identical HTML; Tests: kc-bug-0126 / kc0125 |

**Proceed: GO**

---

## Phase 4 — Regression audit

Workflows tested:

- `npm run verify:kc-037a` — 6/6 (compose, extensibility, planned stubs, provider imports, PDF→Composer, facade extensions)
- `npm run verify:kc-bug-0126` — Urdu PDF typography / bands / Connection≠Visit
- `npm run verify:kc0125` — editorial Urdu labels
- `npm run verify:kc-033` — operations truth / CanonicalMetricProviders
- `npm run typecheck` — clean

No dashboard UI, bootstrap, auth, Firestore, or repository behaviour changes.

## Phase 5 — Certification

**READY** — architecture foundation + PDF data-path migration; HTML/visual unchanged; verifies green.

## Phase 6 — Post-deploy verification

| Check | Result |
|-------|--------|
| GitHub HEAD | `6127320` on `origin/main` |
| Vercel | `dpl_FsCwGGNe4n1rczyowiPMBri6YjWZ` READY |
| Production URL | https://jihbasavakalyan.org |
| Bundle smoke | `GenerateCampaignReportButton-DvDHubaf.js` contains `kc034_executive_campaign`, `campaign_report_v1`, `getActiveRuknRows`, `getCountForRukn` |
| Local verifies | `verify:kc-037a` 6/6 · `verify:kc-bug-0126` · `verify:kc0125` · `verify:kc-033` · typecheck |

**Closure:** KC-037A complete — Report Composer foundation live; KC-034 PDF path migrated without visual redesign.
