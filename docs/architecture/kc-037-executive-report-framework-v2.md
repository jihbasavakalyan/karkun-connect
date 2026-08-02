# KC-037 — Executive Report Framework (V2)

**Status:** Canonical product architecture (frozen contract for report evolution)  
**Supersedes as product vision:** Fixed one-click KC-034 PDF as the *only* executive report shape  
**Preserves:** KC-034 Urdu PDF pipeline as the **default exporter** until V2 exporters land  
**Standards:** [KC-ARCH-009](./kc-arch-009-feature-impact.md) · [KC-ARCH-001](./kc-arch-001-reliability-persistence.md) · [KC-033](./kc-033-canonical-metric-registry.md) · [KC-034 gate](./kc-034-arch009-gate.md)

> Implementation prompts for report work should **reference this document**. Do not redesign reporting ownership or invent alternate KPI math.

**Version 1 access lock:** Report Center remains **Administrator-only** for the current campaign. Do not implement Rukn report generation, viewing, or download. Policy: [KC-037 V1 Admin-Only Reporting](./kc-037-v1-admin-only-reporting-policy.md).

---

## Vision

Administrators must be able to **configure**, **generate**, and **reuse** executive reports that feel like an experienced Jamaat secretary’s briefing — not a static dump.

Every number on every report must come from **KC-033 Canonical Providers**.  
Report engines **select and present**; they **never recalculate** campaign truth.

---

## Relationship to current production (KC-034)

| Capability | KC-034 today | V2 target |
|------------|--------------|-----------|
| Generate Urdu PDF | ✅ One-click | ✅ Remains default exporter |
| Pre-generation config | ❌ | ✅ Scope · period · sections · template |
| Men / Women as scope | Partial (breakdown chips) | ✅ Dedicated sections + filter |
| Rukn / Karkun / Halqa scope | ❌ | ✅ |
| Time period filter | ❌ (snapshot “now”) | ✅ |
| Excel / CSV / Dashboard | ❌ | ✅ Phased |
| Saved templates | ❌ | ✅ |
| Rafeeq insights | ❌ (separate stack) | ✅ Bound via Recommendation / Dialogue advise |

**Hard rule:** V2 must not break the existing Generate Campaign Report PDF path until a template explicitly replaces it.

---

## Architecture

```
Report Configuration UI
        ↓
Report Config Model (scope · period · sections · visuals · template)
        ↓
Section Registry (sectionId → KC-033 providers only)
        ↓
Report Assembly Engine (compose typed ReportDocument)
        ↓
Exporters
  · PDF (reuse campaignReportPdf / urduHtmlToPdf)
  · Interactive Dashboard
  · Excel / CSV
  · Presentation / Mobile summary
        ↓
Optional: Digital Rafeeq (KC-035E) insights & recommended actions
```

### Package map (proposed)

```
src/lib/reporting/
  campaignReportModel.ts      # KC-034 (keep)
  campaignReportPdf.ts        # KC-034 (keep)
  v2/
    reportConfig.ts           # Scope | TimePeriod | SectionFlags | Visuals
    sectionRegistry.ts        # sectionId → CanonicalMetricProviders
    assembleReportDocument.ts # config → ReportDocument
    templates.ts              # saved presets
    exporters/                # pdf | csv | xlsx | dashboard adapters
```

Public orchestration may later re-export via `src/modules/reporting/` without moving ownership of math.

---

## 1. Report Configuration (before generation)

### Scope

| Scope ID | Description |
|----------|-------------|
| `overall_campaign` | Full active (or selected) campaign |
| `mens_wing` | Male Rukns / Karkuns only |
| `womens_wing` | Female Rukns / Karkuns only |
| `combined` | Men + Women side-by-side |
| `selected_rukn` | One or more Rukns |
| `selected_halqa` | Halqa / area filter (when master data supports it) |
| `individual_karkun` | Single Karkun dossier |
| `individual_rukn` | Single Rukn scorecard |
| `campaign_comparison` | Compare campaigns or periods |

### Time period

`today` · `yesterday` · `current_week` · `previous_week` · `current_month` · `campaign_duration` · `custom_range`

Period filters apply only where KC-033 / operational stores expose time-bounded facts. Where history is unavailable, the UI must state **“snapshot only”** rather than inventing trends.

### Performance categories (section toggles)

| Section ID | Label |
|------------|-------|
| `overall_campaign_performance` | Overall Campaign Performance |
| `mens_performance` | Men's Performance |
| `womens_performance` | Women's Performance |
| `individual_rukn_performance` | Individual Rukn Performance |
| `individual_karkun_performance` | Individual Karkun Performance |
| `weekly_ijtema` | Weekly Ijtema Attendance |
| `visits` | Visit Conducted |
| `app_registration` | App Registration |
| `baitul_maal` | Baitul Maal |
| `new_karkun_requests` | New Karkun Requests |
| `pending_tasks` | Pending Tasks |
| `communication_status` | Communication Status |
| `top_performers` | Top Performers |
| `lowest_performers` | Lowest Performers |
| `most_improved` | Most Improved |
| `trend_analysis` | Trend Analysis |
| `recommendations` | Recommendations |
| `annexure_summary` | Annexure Summary |
| `data_quality` | Data Quality & Exceptions |
| `executive_summary` | Executive Summary |
| `kpi_dashboard` | KPI Dashboard |
| `rafeeq_insights` | Digital Rafeeq Insights |

---

## 2–16. Content contracts (summary)

| # | Block | Contract |
|---|-------|----------|
| 2 | Executive Summary | Progress · overall score · status · achievements · critical risks · immediate priorities |
| 3 | KPI Dashboard | Totals, connected/pending, visits, ijtema, app, BM, completion %, growth, target, variance — **all via KC-033** |
| 4–5 | Men / Women Performance | Parallel layouts for comparison |
| 6 | Rukn Scorecard | Connected · WI% · Visit% · App% · BM% · overall · rank · prev rank · improvement · pending · risk · recommended action |
| 7 | Individual Karkun | Search mobile/ASN/name · profile · journey · pending · history |
| 8–11 | Domain analytics | WI · Visits · App · BM deep views (reuse module reports where possible) |
| 12 | Rankings | Top lists by metric; no alternate scoring formulas |
| 13 | Trends | Prior week/month/start · target · forecast — **only with historical evidence** |
| 14 | Exceptions | Duplicates · inactive · low attendance · missing visits · unregistered · DQ · pending requests |
| 15 | Rafeeq Insights | Actionable lines from Recommendation Engine (advise-only) |
| 16 | Recommended Actions | P1/P2/P3 with responsible person · due · expected impact |

---

## 17. Report formats

| Format | Priority |
|--------|----------|
| Interactive Dashboard | P1 (config + live sections) |
| Printable PDF (Urdu) | P0 (extend KC-034) |
| Excel / CSV | P1 |
| Presentation Mode | P2 |
| Mobile Summary | P2 |
| WhatsApp-ready image cards | P3 (optional) |

---

## 18. Visual customization

Show/hide charts & rankings · campaign branding · Urdu/English bilingual · theme · palette · logo · watermark · confidential/public · orientation · Executive vs Detailed density.

---

## 19. Saved report templates

Presets (seed catalog):

- Executive Weekly Review  
- Men's / Women's Weekly Report  
- Rukn Performance Report  
- Individual Karkun Report  
- Weekly Ijtema Review  
- Visit Monitoring Report  
- Baitul Maal Collection Report  
- Campaign Progress Review  
- End-of-Campaign Summary  

Administrators may save custom templates (config JSON; no duplicated metrics).

---

## Gap analysis vs production (at architecture freeze)

| Framework area | Status |
|----------------|--------|
| Pre-gen configuration UI | Missing |
| Scope / period selectors | Partial / Missing |
| Section toggles | Missing |
| Executive summary / KPI / exceptions / recs | Partial (fixed PDF) |
| Men/Women dedicated sections | Partial |
| Rukn scorecard depth (rank history, risk) | Partial |
| Individual Karkun report | Missing |
| Trends / forecast | Missing (no period store in report) |
| Excel/CSV/Dashboard exporters | Missing |
| Templates | Missing |
| Bind via `CanonicalMetricProviders` | Missing (aligned getters today; facade not used) |
| Rafeeq insights in report | Missing |

---

## Delivery roadmap (phased — do not ship V2 as one mega-sprint)

| Phase | Ticket suggestion | Outcome |
|-------|-------------------|---------|
| **0** | KC-037 (this doc) | Architecture freeze + gap map |
| **1** | KC-037A | Report Config model + section registry + CanonicalMetricProviders binding; keep PDF default — **done** ([gate](./kc-037a-arch009-gate.md) · [composer](./kc-037a-report-composer.md)) |
| **2** | KC-037B | Config UI (scope · period · sections) → PDF export — **done** ([gate](./kc-037b-arch009-gate.md) · [report center](./kc-037b-report-center.md)) |
| **3** | KC-037C | Men/Women + Rukn scorecard depth; rankings — **done** (part of [KC-037C–F](./kc-037c-f-reporting-platform.md)) |
| **4** | KC-037D | Interactive dashboard + Excel/CSV — **done** (part of KC-037C–F) |
| **5** | KC-037E | Templates + visuals + bilingual — **done** (part of KC-037C–F) |
| **6** | KC-037F | Trends (where history exists) + Rafeeq insights + recommended actions — **done** (snapshot-safe trends; part of KC-037C–F) |

Each phase requires its own **KC-ARCH-009 gate**, `verify:kc-037*`, and production certification. No phase may introduce alternate KPI math.

---

## Non-goals (explicit)

- LLM-generated metrics or invented percentages  
- Bypassing repositories / Matrix / write adapters  
- Replacing Mission Control / Operations module reports wholesale in Phase 1  
- Mandatory WhatsApp image cards in early phases  

---

## Acceptance (program)

An Administrator can select scope, period, and sections; generate a branded Urdu PDF (and later Excel/dashboard); reuse a saved template; and trust that every KPI matches KC-033 operational truth.
