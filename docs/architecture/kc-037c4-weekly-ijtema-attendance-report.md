# KC-037C4 — Weekly Ijtema Attendance Report

**Status:** Implemented  
**Gate:** [kc-037c4-arch009-gate.md](./kc-037c4-arch009-gate.md)  
**Brief label:** Product prompt used “KC-037C2”; repository id is **KC-037C4** (C2 = Individual Rukn).

## What changed

Operational Weekly Ijtema Attendance Report from Report Center:

1. Cover · 2. Executive Summary · 3. Attendance Overview · 4. Rukn Performance · 5. Attendance Register · 6. Absent Register · 7. Analytics · 8. Operational Insights · 9. Recommendations · 10. Appendix

Built through Composer section `weekly_ijtema_attendance` using KC-033 providers + CampaignReportModel. PDF via existing Urdu HTML pipeline (Executive V2 visual language).

## Pipeline

```
Report Center → Report Composer → Section Registry → KC-033 → Presentation Model → PDF Renderer
```

## Registration

| Item | Value |
|------|-------|
| Report type | `weekly_ijtema` |
| Section id | `weekly_ijtema_attendance` |
| Blueprint | `['weekly_ijtema_attendance']` |
| Model kind | `weekly_ijtema_attendance_report_v1` |
| Thin `weekly_ijtema` domain section | Preserved for executive_campaign |

## Provider usage

| KPI / block | Provider |
|-------------|----------|
| Present / Assigned / Attendance % | `weeklyIjtema.getHealthSlice()` (+ `getKpi()` absent / event meta) |
| Rukn table | `weeklyIjtema.getActiveRuknRows()` |
| Register / Absent | `weeklyIjtema.getSummariesView()` (+ assignment identity) |
| Connected totals | `connections.get()` |
| Male / Female % | CampaignReportModel `maleRukns` / `femaleRukns` weeklyIjtema pairs |

## Unchanged

Composer · Registry architecture · KPI formulas · Firestore · repositories · Individual Rukn/Karkun / Executive PDF paths · Rukn access (Admin-only V1)

## Verify

```bash
npm run verify:kc-037c4
```
