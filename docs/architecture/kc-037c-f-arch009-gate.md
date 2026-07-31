# KC-037C–F — KC-ARCH-009 Gate (Complete Reporting & BI Platform)

**Classification:** New Feature (multi-phase: C sections · D dashboard/exports · E templates/visuals/i18n · F insights/trends/scoring)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · [KC-037](./kc-037-executive-report-framework-v2.md) · [KC-037A](./kc-037a-arch009-gate.md) · [KC-037B](./kc-037b-arch009-gate.md)  
**Constraint:** KC-037A Composer and KC-037B Report Center are **frozen**. Extend only — no pipeline redesign, no duplicate KPI math, no direct Firestore from report sections.

## Phase 0 — Root cause & impact

**Need:** Report Center can configure reports, but only Executive PDF is functional. Leadership needs a full BI suite (Men/Women/Rukn/Karkun/domains/dashboard/exports/templates/insights) on the same Composer + KC-033 stack.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/lib/reporting/v2/**` | Y | Active section builders, exporters, scoring, insights, i18n, templates |
| Report Center UI | Y | Unlock types/outputs; dashboard pane; templates |
| KC-034 Executive HTML | Y | Additive content blocks only when executive sections enabled — default path preserved |
| Firestore / auth / bootstrap | N | — |
| KC-033 providers | N | Read-only consumption; optional thin aliases only |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Executive PDF | **HIGH** | Keep `kc034_executive_campaign` as default body; `verify:kc-037a` + `verify:kc-bug-0126` |
| Composer contracts | **HIGH** | All types compose via registry; validate before export |
| Dashboard / exports | MEDIUM | Same `ReportDocument` models |
| Scoring / insights | MEDIUM | Configurable weights; Rafeeq advise-only; no invented KPIs |

## Phase 2 — Plan

1. Shared presentation model kinds + active section builders (providers only)  
2. Activate report-type catalog + blueprints  
3. Exporters: PDF (multi-section), Dashboard, Excel, CSV, JSON, ZIP  
4. Templates (built-in + saved), i18n, scoring config, Rafeeq insights, audit appendix  
5. Report Center: generate any available type; dashboard mode  
6. `verify:kc-037cf` + docs · deploy · cert  

## Phase 3 — Verification

- `verify:kc-037cf` — all types compose; exports; templates; insights from providers  
- `verify:kc-037a`, `verify:kc-037b`, `verify:kc-bug-0126`, typecheck  
- Prod smoke: Report Center + new markers  

## Go / No-Go

| Question | Answer |
|----------|--------|
| Bypass Composer / KC-033? | NO |
| Redesign 037A/B? | NO |
| Duplicate KPI math? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:

- `verify:kc-037cf` 6/6 — all available types compose; pdf/dashboard/excel/csv/json validate; templates + scoring; provider insights; executive KC-034 compose; visit ≠ connection
- `verify:kc-037a` 6/6 — Composer foundation; planned stubs still non-composable (`future_whatsapp_cards`)
- `verify:kc-037b` 6/6 — Report Center catalogs, validation, UI wiring, no KPI calc in UI
- `verify:kc-bug-0126` — Urdu PDF typography / Connection≠Visit
- `typecheck` clean

No Firestore bypass from sections; no duplicate campaign KPI engines; default Executive path remains `kc034_executive_campaign`.

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

Known limitations (documented, not blocking):

- Historical comparison is snapshot-safe (`available: false` / no invented trends) until durable period snapshots exist
- Non–KC-034 PDF export is Composer-model JSON rendered in Urdu HTML (functional, not full editorial redesign)
- ZIP snapshot is a JSON package download (not a binary `.zip` container)
- Individual Karkun visit status uses journey/provider aggregates — no new person-visit KPI engine

## Phase 6 — Post-deploy

*(after deploy)*
