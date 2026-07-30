# KC-033 — Canonical Campaign Metric Registry

**Status:** Authoritative (Operations Truth Convergence)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Code facade:** `src/lib/operations/canonicalCampaignMetrics.ts`  
**Gate:** [kc-033-arch009-gate.md](./kc-033-arch009-gate.md)

Each metric has **exactly one** authoritative provider for production decisions (Dashboard, Reports, Automation, Rafeeq, Secretary, Cos context).

---

## Registry

| Metric | Authoritative provider | Module path | Notes |
|--------|------------------------|-------------|-------|
| **Connections** | `metricsService.getCampaignConnectionMetrics` | `src/services/metricsService.ts` | Connected / remaining / progressPct |
| **Visits** | `dashboardMetricsService.getDashboardVisitMetrics` (+ ForRukn) | `src/services/dashboardMetricsService.ts` | Completed ÷ planned among Connected |
| **Weekly Ijtema (Health %)** | `getDashboardWeeklyIjtemaHealthSlice` | `dashboardMetricsService` ← `getWeeklyIjtemaDashboardKpi` | Present ÷ **Assigned** on current event |
| **Weekly Ijtema (module KPI)** | `weeklyIjtemaService.getWeeklyIjtemaDashboardKpi` | `src/services/weeklyIjtemaService.ts` | Marked-only `attendancePct` for module reports |
| **Weekly Ijtema (per-person / Cos cards)** | `weeklyIjtemaReadAdapter.*` | `src/lib/operations/weeklyIjtemaReadAdapter.ts` | Prefer event mark; legacy fallback for Excused/history |
| **Baitul Maal (Health %)** | `getDashboardMonthlyBaitulMaalHealthSlice` | `dashboardMetricsService` ← `getMonthlyBaitulMaalDashboardKpi` | Contributed ÷ **Assigned** on current cycle |
| **Baitul Maal (module KPI)** | `monthlyBaitulMaalService.getMonthlyBaitulMaalDashboardKpi` | `src/services/monthlyBaitulMaalService.ts` | Marked-only `completionPct` for module reports |
| **Baitul Maal (per-person / Cos cards)** | `monthlyBaitulMaalReadAdapter.*` | `src/lib/operations/monthlyBaitulMaalReadAdapter.ts` | Prefer cycle mark; legacy fallback for Exempt/history |
| **App Registration** | `getDashboardAppRegistrationMetrics` (+ ForRukn) | `dashboardMetricsService` | Registered ÷ eligible |
| **Campaign Health** | `getDashboardHealthSlices` / `getCanonicalCampaignHealthOverallPct` | `dashboardMetricsService` + `canonicalCampaignMetrics` | Four independent slices; overall = equal-weight mean |

**Typed access:** `CanonicalMetricProviders` in `canonicalCampaignMetrics.ts`.

---

## Consumer rules

| Surface | Must read |
|---------|-----------|
| Dashboard Campaign Health panel | `getDashboardHealthSlices` only |
| Today’s Mission / Top Priority | Same facade / WI·BM KPIs already used by Command Center builders |
| Executive / automation `healthScore` | `getCanonicalCampaignHealthOverallPct` |
| `getCampaignProgress()` | Same overall (aligned with Health — KC-033) |
| Automation pending IJ/BM | Adapter summaries / cycle·event KPIs |
| Rafeeq turn metrics | Health slices + adapter WI metrics view |
| Secretary / Cos context / relationship intel | Read adapters (per-person) |
| Module WI/BM report pages | Module KPIs (marked-only %) — **not** Health assigned % |

---

## Removed from production decision paths

| Legacy path | Replacement |
|-------------|-------------|
| `getIjtemaAttendanceDashboardMetrics` (product callers) | `getWeeklyIjtemaDashboardMetricsView` / Health slice / KPI |
| `getAllIjtemaAttendanceSummaries` (automation) | `getWeeklyIjtemaAttendanceSummariesView` |
| `getBaitulMaalDashboardMetrics` / `getRuknBaitulMaalMetrics` (product callers) | Adapter metrics view / `getCanonicalRuknBaitulMaalMetrics` / cycle KPI |
| `getAllBaitulMaalSummaries` (automation) | `getMonthlyBaitulMaalSummariesView` |
| `getCampaignHealthFromAnnexure1` for Health/progress | `getCanonicalCampaignHealthOverallPct` / Health slices |
| Direct `ijtemaAttendanceStore` / legacy status in journey participation | `getWeeklyIjtemaCurrentAttendanceView` |

Legacy **services remain** as dual-write / Excused / Exempt / historical fallback **inside adapters only**.

---

## Remaining compatibility shims

| Shim | Why retained | Future |
|------|--------------|--------|
| Dual-write on WI/BM write adapters | Excused/Exempt + deferred historical readers | Turn off after durability ticket retires `ijtema_*` / `baitulMaal_*` docs |
| Read-adapter legacy fallback | Weeks/months without event/cycle marks; Excused/Exempt | Keep until product maps Excused into event model |
| `getCampaignHealthFromAnnexure1` export | Probe / deprecated barrel | Quarantined — do not use for Health |
| Legacy dashboard metric functions | Adapter internals + any accidental import | Prefer adapters; no new callers |

---

## Verification

```bash
npm run verify:kc0107
npm run verify:kc0108
npm run verify:kc-033
npm run verify:automation
npm run typecheck
```

---

## Related

- [KC-0110](./kc-0110-weekly-ijtema-inventory.md) · [KC-0111](./kc-0111-campaign-health-inventory.md) · [KC-0112](./kc-0112-monthly-baitul-maal-inventory.md)
- [KC-032 capability audit](./kc-032-product-capability-audit.md)
