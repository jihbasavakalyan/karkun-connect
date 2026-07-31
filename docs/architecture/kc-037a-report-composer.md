# KC-037A — Report Composer Architecture

**Status:** Foundation implemented  
**Parent:** [KC-037 Executive Report Framework V2](./kc-037-executive-report-framework-v2.md)  
**Gate:** [KC-037A ARCH-009](./kc-037a-arch009-gate.md)  
**Package:** `src/lib/reporting/v2/`

## Pipeline

```
ReportConfig → ReportComposer → SectionRegistry → KC-033 Providers
     → Section Models → Renderer (PDF today; Excel/Dashboard later)
```

## How to add a section (no Composer changes)

1. Implement `buildModel(ctx: ReportContext): SectionModel` using **only** `ctx.providers` for KPIs.
2. Call `registerSection({ id, displayName, description, requiredProviders, configurationSchema, renderPriority, supportedOutputs, featureFlag: true, status: 'active', buildModel })`.
3. Enable the section id in `ReportConfig.enabledSections`.
4. Add an exporter branch only if a new `model.kind` needs a new presentation path.

## Active section (037A)

| Id | Kind | Role |
|----|------|------|
| `kc034_executive_campaign` | `campaign_report_v1` | Full KC-034 `CampaignReportModel` for Urdu PDF |

PDF entry: `downloadCampaignReportPdf` → `composeKc034CampaignReportModel` → `buildCampaignReportHtml` (unchanged markup).

## Defaults

`defaultKc034Config()` — overall campaign · Urdu · snapshot · PDF · classic_urdu · executive detail · only `kc034_executive_campaign` enabled.

## Verify

```bash
npm run verify:kc-037a
```
