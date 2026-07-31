# KC-037C–F — Reporting & Business Intelligence Platform

**Status:** Implemented (extends frozen KC-037A Composer + KC-037B Report Center)  
**Gate:** [KC-037C-F ARCH-009](./kc-037c-f-arch009-gate.md)

## What this release adds

| Capability | Mechanism |
|------------|-----------|
| Full report suite | Active Composer sections + report-type blueprints |
| Dashboard mode | Same `ReportDocument` → `ReportDashboardView` |
| Excel / CSV / JSON / ZIP snapshot | `exportReportDocument` / `exportReportZipSnapshot` |
| Templates | Built-in catalog + localStorage custom saves |
| Localization | `reportLabel` Urdu / English |
| Scoring | Configurable weights (`scoringConfig`) |
| Rafeeq insights | `buildProviderInsights` (KC-033 + adviseRole) |
| Audit appendix | `data_quality` section metadata |
| Historical | Snapshot-safe `trend_analysis` (no invented history) |

## Hard rules preserved

Config → Composer → Registry → KC-033 → Models → Renderer  
No section calculates alternate campaign KPIs or queries Firestore.

## Verify

```bash
npm run verify:kc-037cf
npm run verify:kc-037a
npm run verify:kc-037b
```
