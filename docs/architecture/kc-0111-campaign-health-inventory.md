# KC-0111 — Campaign Health Canonicalization (Inventory)

**Type:** Architecture inventory (documentation + light annotations only)  
**Status:** Complete — ready for phased migration tickets  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Baselines:** [KC-0104](./campaign-operating-system-product-architecture.md) · [KC-0109](./operations-model-consolidation.md) · [KC-0110](./kc-0110-weekly-ijtema-inventory.md) · [KC-0103E](./kc-0103e-reporting-executive-audit.md)  

**Nature of this document**

This inventory maps every Campaign Health (and closely related “health / progress / score”) calculation in the product. It does **not** authorize formula changes, Firestore changes, or repository redesign. Follow-on tickets must each pass KC-ARCH-009.

---

## Executive summary

**Canonical executive Campaign Health** is the **four independent slices** on Admin Command Center:

1. **Visits**  
2. **Weekly Ijtema**  
3. **Monthly Baitul Maal**  
4. **App Registration**

**Authoritative aggregation path:**

```text
Operations SoRs (visit / WI event / BM cycle / JIH registration)
        │
        ▼
dashboardMetricsService.getDashboardHealthSlices
        │
        ▼
buildCampaignOperationsHealthMetrics
        │
        ▼
CampaignHealthPanel  (+ Mission / Top Priority consumers of the same facade)
```

Campaign Health is **derived presentation** (KC-0104 Rule 7.1.9) — never a System of Record.

**Critical debt:** Several **legacy** calculators still produce overlapping “health / overall / progress / attendance %” numbers from annexure averages, legacy per-Karkun IJ/BM tracks, or unmounted panels. Those must not be treated as executive truth.

---

## Status legend

| Class | Meaning |
|-------|---------|
| **Canonical** | Authoritative for executive Campaign Health (or named sibling contract) |
| **Adapter** | Presentation / routing over canonical data; no alternate formula |
| **Legacy** | Live or probe calculation from a non-Health SoR or obsolete engine |
| **Duplicate** | Same product noun computed by more than one engine |
| **Dead** | Unreachable UI or zero product callers (may still compute for probes) |

---

## 1. Health Metric Inventory

### 1.1 Canonical four slices (Campaign Health panel)

| Metric | Component | Service / lib | Current calculation | Current data source | Canonical source | Status |
|--------|-----------|---------------|---------------------|---------------------|------------------|--------|
| **Visits** | `CampaignHealthPanel` | `getDashboardVisitMetrics` → `getDashboardHealthSlices` | `completed ÷ planned` among Connected assignments (≥1 annexure submission = completed) | Connected assignments + `annexure1Store` submissions | Same | **Canonical** |
| **Weekly Ijtema** | `CampaignHealthPanel` | `getWeeklyIjtemaDashboardKpi` → Health **recomputes** `present ÷ totalAssigned` | Present ÷ Assigned on current event (Open preferred); no event → **0%** | `weeklyIjtemaStore` events + submissions | Event/cycle track (KC-0104 / KC-0110) | **Canonical** |
| **Monthly Baitul Maal** | `CampaignHealthPanel` | `getMonthlyBaitulMaalDashboardKpi` → Health `contributed ÷ totalAssigned` | Contributed ÷ Assigned on current cycle; no cycle → **0%** | `monthlyBaitulMaalStore` | Cycle track (KC-0109 / future KC-0111 BM) | **Canonical** |
| **App Registration** | `CampaignHealthPanel` | `getDashboardAppRegistrationMetrics` | `registered ÷ eligible` (`isJihRegistered` among campaign-eligible Karkuns) | People + JIH portal registration | Same | **Canonical** |

**Presentation plumbing**

| Piece | Path | Role | Status |
|-------|------|------|--------|
| Facade | `src/services/dashboardMetricsService.ts` | Single Admin aggregation contract (KC-0101.B) | **Canonical** |
| Builder | `buildCampaignOperationsHealthMetrics` in `campaignOperationsCommandCenter.ts` | Labels, routes, slice packaging | **Adapter** |
| Panel | `CampaignHealthPanel.tsx` | % display + readiness gates | **Canonical** UI |
| Readiness | `CAMPAIGN_HEALTH_METRIC_READINESS` in `dashboardMetricReadiness.ts` | Visits = critical; others = background | **Canonical** UX |
| Mount | `AdminCommandCenter` ← `AdminHomePage` | Live `/admin` | **Canonical** consumer |

**Denominator nuance (WI / BM):** Module KPI `attendancePct` / `completionPct` from `buildBinaryCycleReport` use **marked-only** denominators. Campaign Health intentionally uses **assigned** denominators (`present ÷ totalAssigned`, `contributed ÷ totalAssigned`). Same services, two meanings — treat as documented dual presentation, not accidental drift, until a later ticket unifies product language.

---

### 1.2 Canonical siblings (same facade; not the Health panel)

| Metric / surface | Component | Calculator | Formula / source | Status |
|------------------|-----------|------------|------------------|--------|
| Today’s Mission ops items | Admin Command Center | `buildTodaysMissionOperationalItems` | Counts from same WI/BM/visit/app facade sources | **Canonical** (Mission) |
| Top Priority Rukns + score | Admin Command Center | `buildTopPriorityRukns` | Equal-weight mean of four per-Rukn module %; lower = higher priority; inactive WI/BM → 0% | **Canonical** |
| Performance badges | `dashboardPerformanceBadge` | Thresholds 80 / 60 / 40 / 20 | Excellent → Immediate Action | **Canonical** for Priority (≠ leaderboard thresholds) |
| Progress Trends (visits / connection) | Admin Command Center | `buildAdminCampaignTrends` | Visit periods + `getDashboardConnectionProgressPct` | **Canonical-ish** |
| Connection / Campaign Progress ring | `AdminMissionControlHero` | `getCampaignConnectionMetrics().progressPct` | Connected ÷ (connected + remaining) | **Canonical for Connections** — **not** Campaign Health overall |

---

### 1.3 Legacy / duplicate / dead “health” engines

| Metric | Component / consumer | Service | Current calculation | Current source | Canonical should be | Status |
|--------|----------------------|---------|---------------------|----------------|---------------------|--------|
| Annexure overall “campaign health” | Automation hero `healthScore`; `getCampaignProgress`; overview | `getCampaignHealthFromAnnexure1` | Avg(visitCompletionRate, reportSubmissionRate, followUpCompletionRate) | Active assignments + annexure + follow-ups | Four-slice facade (or retire noun) | **Legacy** · **Duplicate** |
| Campaign Progress Overview bars | `CommandCenterProgressOverview` (unmounted); probes | `getCampaignProgressOverview` | Mix of annexure overall + assignment + legacy IJ/BM compliance | Mixed | Four-slice facade | **Legacy** · **Duplicate** · mostly **Dead** UI |
| Six Admin Health KPI cards | `buildAdminCampaignHealthKpis` / `AdminHealthKpiCard` | Legacy mission model | Overall/connections/visits/FU/dev | Overview + annexure | Four-slice panel | **Legacy** · **Dead** UI (probe wiring retained) |
| Mission Control “Campaign Health” rings | `AdminMissionControlPanels` | Inline + legacy IJ/BM metrics | Visits ring = f(criticalFollowUps); Attendance = legacy present÷recorded; BM = Paid+Exempt÷all | Legacy tracks | Four-slice facade | **Legacy** · **Dead** UI |
| Operational Health panel | `AdminOperationalHealthPanel` | Legacy IJ/BM dashboard metrics | Attendance / BM compliance counts | Legacy `ijtemaAttendance*` / `baitulMaal*` | Event/cycle + facade | **Legacy** · **Dead** UI |
| Campaign Achievement Progress | `buildAdminCampaignAchievementProgress` | Mixed | Eligible denom; legacy IJ Present; matrix BM committed | Mixed | Four-slice / Connections | **Legacy** · **Duplicate** |
| Campaign Pulse Healthy/Critical | `buildAdminCampaignPulse` | Coaching + overview | Qualitative pulse | Mixed | Optional presentation over facade | **Legacy** · **Dead** UI on current home |
| Collective / gender “Average Progress” | `AdminCommandCenter` local summarize | Mean of Rukn `completionPct` | Execution Completed ÷ items | Execution desk | Do not call “Campaign Health” | **Duplicate** vocabulary |
| Legacy IJ dashboard metrics | Cos / automation / home widgets | `getIjtemaAttendanceDashboardMetrics` | Per-Karkun week Present/Absent/Excused | Legacy `ijtema_*` | Event KPI / read adapter | **Legacy** (KC-0110 deferred readers) |
| Legacy BM compliance % | Cos / unmounted panels | `getBaitulMaalDashboardMetrics` | (Paid+Exempt) ÷ all Karkuns | Legacy BM docs | Cycle KPI | **Legacy** |
| WI Report Attendance % | `AdminWeeklyIjtemaReportPage` | Event report | Marked-only attendancePct | Event track | Canonical **module** report (≠ Health %) | **Canonical** module |
| BM Report Completion % | `AdminMonthlyBaitulMaalReportPage` | Cycle report | Marked-only completion | Cycle track | Canonical **module** report | **Canonical** module |
| Relationship health badges | Rukn Priority Karkuns | `assessRelationshipHealth` | Contact gap / commitments | Journey | Out of Campaign Health | Separate |
| Registry Health score | Registry ops | `registryHealthService` | Data-quality integrity | Registry | Out of Campaign Health | Separate |

---

## 2. Dependency Graph

```text
People: Active Connections (Connected assignments)
        │
        ├── Visits SoR ──────── annexure1 submissions
        │
Operations:
        ├── Weekly Ijtema ──── weeklyIjtema events + submissions   (KC-0110)
        ├── Monthly Baitul Maal ── monthlyBaitulMaal cycles + submissions
        └── App Registration ── Person / JIH portal registration
                │
                ▼
        dashboardMetricsService.getDashboardHealthSlices
                │
                ├── CampaignHealthPanel          (executive Health)
                ├── Today's Mission items        (derived counts)
                └── Top Priority Rukns           (equal-weight module mean)
                │
                ▼
        Admin Dashboard / Command Center
```

**Non-canonical side path (debt):**

```text
Active assignments + annexure + follow-ups
        → getCampaignHealthFromAnnexure1 (overallScore)
        → getCampaignProgress / overview / automation healthScore
        → probes / unmounted panels / legacy intelligence
```

---

## 3. Duplicate Calculations

| Product noun | Engine A (canonical intent) | Engine B | Engine C | Risk |
|--------------|----------------------------|----------|----------|------|
| **Campaign Health** | Four slices (`getDashboardHealthSlices`) | Annexure avg (`getCampaignHealthFromAnnexure1`) | Unmounted rings (legacy IJ/BM) | **High** — different truth |
| **Weekly Ijtema %** | Health: Present ÷ Assigned (event) | KPI/report: Present ÷ marked | Legacy attendance metrics / Achievement “Agreed for WI” | **High** |
| **Baitul Maal %** | Health: Contributed ÷ Assigned (cycle) | KPI/report: marked-only completion | Legacy Paid+Exempt ÷ all Karkuns | **High** |
| **Visits %** | Completed ÷ Planned Connected | Annexure visitCompletionRate (Active) | Ring “Visits” = f(criticalFollowUps) | **High** |
| **App / JIH registration** | Eligible + `isJihRegistered` | Portal-only metrics | Model `jihPending` mixes portal pending reports | Medium |
| **Progress / Overall** | *(no single Health overall)* | Connection % (Hero) | Annexure overall / Achievement overallPct / Collective mean completionPct / Priority score | **High** vocabulary collision |
| **Badges** | `dashboardPerformanceBadge` (80/60/40/20) | `leaderboardStatus` (70/40) | Relationship health levels | Medium |

---

## 4. Recommended Migration Plan

Order **lowest risk → highest risk**. Each step is independently deployable and must not change Campaign Health formulas without an explicit product decision.

| Step | Ticket | Scope | Risk | Notes |
|------|--------|-------|------|-------|
| **0111.1** | Annotate & quarantine | Mark `getCampaignHealthFromAnnexure1`, overview, achievement, unmounted panels with `KC-0111 legacy — not executive Health` | Very low | Docs + comments only |
| **0111.2** | Remove dead Health UI wiring | Drop unused exports / confirm probe-only paths; do not delete probe retention without KC-0058.6 review | Low | UI cleanup |
| **0111.3** | Unify Cos / automation WI readers | Point deferred Cos/automation IJ metrics at event KPI or KC-0110 read adapter (completes KC-0110 deferred list for Health-adjacent surfaces) | Medium | Reads only |
| **0111.4** | Unify Cos / automation BM readers | Same for Monthly Baitul Maal cycle KPI (pairs with KC-0111 BM track work if split) | Medium | Reads only |
| **0111.5** | Quarantine annexure `overallScore` | Stop labeling annexure average as “Campaign Health”; rename consumers or derive from four slices if an overall is still required | Medium–High | Vocabulary + formula policy |
| **0111.6** | Denominator product decision | Confirm Health Assigned-denom vs Report Marked-denom language in UI copy | Medium | Product, not code-first |
| **0111.7** | Retire legacy IJ/BM Health inputs | After dual-write off and Cos rewired — remove legacy metrics from any remaining Health-adjacent panels | High | KC-ARCH-001 durability |

**Out of band (do not fold into Health formula tickets):** Registry Health, Relationship Health, execution desk `completionPct`, KC-020 objective evaluation.

---

## 5. Explicit non-actions (this ticket)

- No calculation / KPI formula changes  
- No Firestore / repository changes  
- No metric renames in UI  
- No removal of probe wiring required by prior certifications without dedicated review  
- No Monthly Baitul Maal SoR consolidation beyond inventory (may be a sibling ticket)

---

## 6. Verification (KC-0111)

| Check | Result |
|-------|--------|
| Inventory covers Health panel + Mission + Priority + legacy engines | Yes |
| Canonical path identified (`dashboardMetricsService` → panel) | Yes |
| Duplicate engines listed | Yes |
| Migration ordered low → high risk | Yes |
| Behaviour / Firestore / repos unchanged | Yes |

---

## 7. File index

### Canonical / live
- `src/services/dashboardMetricsService.ts`
- `src/services/weeklyIjtemaService.ts` (`getWeeklyIjtemaDashboardKpi`)
- `src/services/monthlyBaitulMaalService.ts` (`getMonthlyBaitulMaalDashboardKpi`)
- `src/lib/missionControl/campaignOperationsCommandCenter.ts`
- `src/components/mission-control/CampaignHealthPanel.tsx`
- `src/components/mission-control/dashboardMetricReadiness.ts`
- `src/components/mission-control/AdminCommandCenter.tsx`

### Legacy / probe / unmounted
- `src/services/annexure1Service.ts` (`getCampaignHealthFromAnnexure1`)
- `src/lib/commandCenterPresentation.ts` (`getCampaignProgressOverview`)
- `src/lib/missionControl/buildAdminMissionControl.ts`
- `src/lib/missionControl/adminMissionControlPresentation.ts`
- `src/components/mission-control/AdminHealthKpiCard.tsx`
- `src/components/mission-control/MissionControlPanels.tsx`
- `src/components/home/AdminOperationalHealthPanel.tsx`
- `src/services/campaignService.ts` (`getCampaignProgress`)
- `src/services/campaignAutomationEngine.ts` (`healthScore`)
- `src/services/ijtemaAttendanceService.ts` / `baitulMaalService.ts`

**Stop after KC-0111 inventory.**
