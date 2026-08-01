# KC-037C2 — Individual Rukn Performance Report (ARCH-009 Gate)

**Classification:** Enhancement (presentation / export for existing `individual_rukn` type)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · KC-033 · KC-037A/B/C1 frozen  
**Scope:** Individual Rukn Performance Report only. No Karkun/Men/Women reports, dashboard, Excel, or CSV work.

## Phase 0 — Root cause & impact

**Need:** Administrators need a daily operational PDF for one selected Rukn. Catalog and section stub exist; PDF path still dumps JSON for non–KC-034 types.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `individual_rukn_performance` section model | Y | Rich presentation from CampaignReportModel + KC-033 person views |
| Individual Rukn PDF exporter | Y | New HTML→PDF presentation |
| `exportReportDocument` | Y | Route `individual_rukn` PDF to dedicated renderer |
| `validateReportConfig` | Y | Require `scopeTarget.ruknId` |
| Report Center UI | Y | Minor: clear title / selection already present |
| Composer / Registry / Providers / Executive PDF | N | Unchanged contracts |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Executive PDF | **HIGH** | Keep KC-034 path first; do not alter `downloadCampaignReportPdf` content |
| Composer | **HIGH** | No `composeReport` edits |
| KPI integrity | **HIGH** | Rukn row + CanonicalMetricProviders views only |
| Report Center | LOW | Validation for missing Rukn |

## Phase 2 — Plan

1. Presentation model builder (cover → profile → summary → activities → karkun list → performance → recommendations → closing → appendix)  
2. Urdu/English labels; PDF via existing `downloadUrduHtmlReportPdf`  
3. Wire exporter + require Rukn selection  
4. `verify:kc-037c2` + regression  

## Phase 3 — Verification

- `verify:kc-037c2` — compose with ruknId; PDF path markers; executive unaffected  
- `verify:kc-037a`, `verify:kc-037c1`, `verify:kc-037b`, `verify:kc-bug-0126`, typecheck  

## Go / No-Go

| Question | Answer |
|----------|--------|
| Bypass Composer / KC-033? | NO |
| Change Composer/Registry architecture? | NO |
| Invent KPI calculations? | NO |
| Implement other report types? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:

- `verify:kc-037c2` 4/4 — Rukn required; Composer model; executive unaffected; exporter/UI/KC-033 path
- `verify:kc-037c1` · `verify:kc-037a` · `verify:kc-037b` · `verify:kc-037cf` · `verify:kc-bug-0126`
- `typecheck` clean

## Phase 5 — Certification

**READY** — Individual Rukn Performance Report via Composer + KC-033; Executive PDF path unchanged.

## Phase 6 — Post-deploy

*(after deploy)*
