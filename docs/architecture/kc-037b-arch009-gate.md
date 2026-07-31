# KC-037B — KC-ARCH-009 Gate (Report Configuration & Multi-Report Framework)

**Classification:** New Feature (configuration UI + report-type catalog)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · [KC-037](./kc-037-executive-report-framework-v2.md) · [KC-037A](./kc-037a-arch009-gate.md)  
**Constraint:** Do **not** alter the KC-037A pipeline (Config → Composer → Registry → KC-033 → Models → Renderer). Extend metadata, validation, presets, and Admin UI only.

## Phase 0 — Root cause & impact

**Need:** Administrators can only one-click the fixed KC-034 PDF. KC-037 Phase 2 requires a Report Center with configurable type / scope / period / sections / output — still composed exclusively via Report Composer + KC-033.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/lib/reporting/v2/**` | Y | Additive: report types, presets, validation, section metadata |
| Report Center UI / route | Y | New Admin page + button wiring |
| `GenerateCampaignReportButton` | Y | Opens Report Center workflow (not direct PDF) |
| KC-034 HTML / KPI math | N | Same composer path for Executive PDF |
| Firestore / auth / bootstrap | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Executive PDF generation | **HIGH** | Still `composeKc034` / `downloadCampaignReportPdf`; `verify:kc-037a` + `verify:kc-bug-0126` |
| Routing / Admin nav | MEDIUM | Additive route; smoke nav |
| Composer contracts | MEDIUM | Validation additive; default config still composes |

## Phase 2 — Plan

1. Extend section/report-type/preset metadata (additive; 037A section remains active builder)  
2. Composer validation with diagnostics  
3. Report Center page UI (types, scope, dates, sections, detail, output, options, presets, preview)  
4. Wire Generate Report → Report Center → PDF via Composer  
5. `verify:kc-037b` + docs · deploy · cert  

## Phase 3 — Verification

- `verify:kc-037b` — catalog, presets, validation, UI wiring markers, composer path  
- `verify:kc-037a`, `verify:kc-bug-0126`, `verify:kc0125`, typecheck  
- Prod smoke: Report Center route + Composer markers in bundle  

## Go / No-Go

| # | Answer |
|---|--------|
| Bypass Composer / KC-033? | NO |
| Modify 037A pipeline? | NO (additive only) |
| Duplicate KPI math? | NO |
| Existing Executive PDF still via Composer? | YES |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:

- `verify:kc-037b` 6/6 — catalogs, validation, compose reject, preview, UI wiring, no KPI calc in UI
- `verify:kc-037a` 6/6 — Composer foundation regression
- `verify:kc-bug-0126` — Urdu PDF typography / Connection≠Visit
- `typecheck` clean

## Phase 5 — Certification

**READY** — Report Center + multi-report catalog; Executive PDF still via Composer + KC-033.

## Phase 6 — Post-deploy

*(after deploy)*
