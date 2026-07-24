# KC-0103E — Reporting & Executive Visibility Audit

**Type:** Product audit (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Status:** Complete  
**Related:** [KC-0103A](./kc-0103a-people-capability-audit.md) · [KC-0103B](./kc-0103b-people-ownership-validation.md) · [KC-0103C](./kc-0103c-operations-capability-audit.md) · [KC-0103D](./kc-0103d-engagement-capability-audit.md)  
**Scope:** Admin Dashboard / Command Center executive visibility and module-scoped reporting  
**Excluded:** Deep People / Operations / Engagement capability audits (cited only as data sources)

### Evidence labels

| Label | Meaning |
|-------|---------|
| **FACT** | Directly evidenced in source |
| **OBSERVATION** | Cross-surface pattern; interpretive but grounded |
| **HYPOTHESIS** | Plausible; not fully proven |
| **RECOMMENDATION** | Non-implementation finding (product decision / investigation only) |

### Visibility taxonomy (used throughout)

| Role | Definition |
|------|------------|
| **System of Record (SoR)** | Durable store/service that owns the underlying facts |
| **Executive Summary** | Aggregated totals / % for scanning |
| **Derived Analytics** | Trends, timelines, rankings computed for insight |
| **Launch Point** | Navigates into an owning module |
| **Operational Queue** | Actionable worklist (may mutate or launch) |

A widget may combine roles; primary role is called out first.

---

## Phase 0–3 (KC-ARCH-009) — Audit gate

| Field | Value |
|-------|-------|
| Request type | **Audit / Investigation** |
| Change surface | Documentation only — this file |
| Application / UI / routing / repos / Firestore / business logic | **Not modified** |
| Go / No-Go | **GO** for documentation audit only |

---

## Executive Summary

Admin executive visibility is concentrated on **`/admin`** (Hero + Command Center). There is **no** dedicated `/admin/reports` hub.

**Highest-signal findings:**

1. **FACT:** Live Campaign Health KPIs (Visits, Weekly Ijtema, Monthly Baitul Maal, App Registration) are built by `dashboardMetricsService` / event-cycle services — not by a separate Reporting module.
2. **FACT:** Hero shows **two progress signals**: connection completeness (`MetricsService`) and “Momentum” (`getCampaignProgressOverview`) — different calculations on the same surface.
3. **FACT:** Module-scoped **reporting pages** exist under Execution, Weekly Ijtema, and Monthly Baitul Maal; Communication “Daily Reports” is engagement distribution, not executive analytics.
4. **FACT:** Dashboard hosts both **executive summaries** and **operational queues** (Today’s Mission, Pending Karkun Requests, Top Priority with notify).
5. **OBSERVATION:** Parallel legacy Ijtema/BM metrics still exist on the Mission Control model and Rukn home, while Admin Health uses event/cycle KPIs — same nouns, different sources (also noted in KC-0103C).

---

## 1. Reporting Capability Inventory

### 1.1 Admin home / Command Center

| ID | Capability | Purpose | Primary user | Data source | Update mechanism | Current owner | Dependencies |
|----|------------|---------|--------------|-------------|------------------|---------------|--------------|
| R-01 | Executive Hero | Campaign name, window, status, Connected/Remaining/Days Left, Momentum, quick actions | Admin | `buildAdminMissionControl` ← MetricsService + campaign timeline + progress overview | Hydration + assignment version + coalesced store ticks | `/admin` Hero | Campaign, connections, stores |
| R-02 | Collective Overview | Campaign-wide Rukn KPI cards | Admin | `buildAllActiveRuknPerformance` + connection override | `moduleTick` / background ready | Command Center | Team performance rows |
| R-03 | Male / Female Rukn summaries | Wing-level connection & progress | Admin | Same performance builder filtered by gender | Same | Command Center | Same |
| R-04 | Campaign Health | Four live completion slices + links | Admin | `buildCampaignOperationsHealthMetrics` ← DashboardMetricsService + WI/BM KPIs | Coalesced module stores; readiness gates | Command Center panel | Visits, events, cycles, JIH |
| R-05 | Today’s Mission | Top operational tasks requiring attention | Admin | `buildTodaysMissionOperationalItems` | Module tick + background | `AdminActionCenter` | Ops pending signals |
| R-06 | All Tasks | Full mission list | Admin | Same builder, full variant | Query `?view=all-tasks` | `/admin?view=all-tasks` | Same |
| R-07 | Pending Karkun Requests | Approve/reject intake queue | Admin | `karkunRequestStore` / `settings/karkunRequests` | Store subscribe + hydrate | Dashboard widget | People intake (SoR elsewhere) |
| R-08 | Top Priority Rukns | Rank Rukns by equal-weight module score; notify | Admin | `buildTopPriorityRukns` | Module tick | Command Center | Visit/WI/BM/App metrics per Rukn |
| R-09 | Progress Trends | Daily/weekly visit + connection trend lines (list) | Admin | `buildCampaignOperationsTrends` / visit metrics + intelligence | Module tick | `ProgressTrendsPanel` | Annexure periods |
| R-10 | Activity Timeline | Recent activity feed | Admin | Activity log store | Own subscribe + 60s tick | `ActivityTimeline` | `activityLogs` |
| R-11 | Command Center snapshot | Shared automation snapshot for admin tree | Admin | `campaignAutomationEngine` | Coalesced multi-store subscribe | `AdminCommandCenterProvider` | Many stores |
| R-12 | Digital Rafeeq ask card | Assistant launch on home | Admin | Launcher | Click | Home footer card | Engagement/assistant |

### 1.2 Module-scoped reporting (not Dashboard)

| ID | Capability | Purpose | Primary user | Data source | Update mechanism | Current owner | Dependencies |
|----|------------|---------|--------------|-------------|------------------|---------------|--------------|
| R-13 | Execution visit reports | List submitted visit records | Admin | Annexure / execution store | Module UI | `/admin/execution?section=reports` | Operations SoR |
| R-14 | Weekly Ijtema event report | Event roster / submission report | Admin | Weekly Ijtema event SoR | Event report page | `/admin/weekly-ijtema/:id/report` | KC-0107 |
| R-15 | Monthly Baitul Maal cycle report | Cycle submission report | Admin | Monthly BM cycle SoR | Cycle report page | `/admin/baitul-maal/:id/report` | KC-0108 |
| R-16 | Communication Daily Reports | Generate/copy/export/send report text to Arkaan | Admin | Daily report service + Arkaan recipients | Compose UI | Communication section | **Engagement** (distribution) |
| R-17 | COS Communication Reports | Intended delivery reports | Admin | — | Placeholder | Communication `reports` section | Not implemented |
| R-18 | Data integrity report | Settings integrity scan UI | Admin | Integrity tooling | Settings | Data integrity panel | Ops/admin, not executive campaign KPI |

### 1.3 Present but not mounted on live Dashboard

| Item | Evidence | Class |
|------|----------|-------|
| `buildAdminCampaignAchievementProgress` | Defined; not on live Hero | **FACT** |
| `WeeklyIjtemaDashboardKpiCard` / `MonthlyBaitulMaalDashboardKpiCard` | Not imported by Command Center | **FACT** |
| `AdminOpsThreeColumnLayout` + Intervention UI | Behind experiment flag = false path; flag is `true` | **FACT** |
| `buildAdminCampaignHealthKpis` (legacy KPI set) | Computed for probes; not primary Health JSX | **FACT** |

---

## 2. Executive Workflow

How an Admin typically uses reporting during a campaign (derived from live surfaces — not a UX redesign).

```text
Morning open → /admin
  1. Hero scan: campaign window, Connected/Remaining, Days Left, Momentum
  2. Collective / Male / Female overview: registry & connection load
  3. Campaign Health: Visits / Weekly Ijtema / Monthly BM / App Registration %
       → click card → drill into Execution / Weekly Ijtema / Baitul Maal / Compliance
  4. Today's Mission: pick top exceptions (overdue visits, pending submissions…)
       → CTA into owning module  OR  View All Tasks
  5. Pending Karkun Requests: approve/reject field intake (mutate on Dashboard)
  6. Top Priority Rukns: who needs attention; optional Notify/Appreciate/Remind
  7. Progress Trends + Activity Timeline: context / recent events
  8. Module-scoped reports when deep review needed:
       Execution Reports · WI event report · BM cycle report
```

**OBSERVATION:** The Dashboard is both **morning briefing** (summaries) and **exception desk** (queues + one People mutation queue). Module report pages are for deeper SoR inspection, not the daily scan.

---

## 3. Ownership Matrix

| Surface / widget | System of Record? | Executive Summary? | Derived Analytics? | Launch Point? | Operational Queue? |
|------------------|-------------------|--------------------|--------------------|---------------|---------------------|
| Hero Connected/Remaining/Days | No (reads MetricsService / timeline) | **Yes** | Partial (momentum) | **Yes** (quick actions) | No |
| Collective / Male / Female | No | **Yes** | Partial | No | No |
| Campaign Health | No | **Yes** | No | **Yes** (module links) | No |
| Today’s Mission / All Tasks | No | No | Derived task list | **Yes** | **Yes** |
| Pending Karkun Requests | **Hosts mutations**; SoR is `settings/karkunRequests` | Count | No | Link on duplicate | **Yes** (mutate) |
| Top Priority Rukns | No | Ranking summary | **Yes** | View Rukn | **Yes** (+ message mutate) |
| Progress Trends | No | No | **Yes** | No | No |
| Activity Timeline | Reads activity SoR | No | **Yes** (feed) | Optional links | No |
| Execution / WI / BM report pages | **Yes** (module SoR views) | No | Tabular report | — | — |
| Daily Reports (Communication) | Compose/send tool | No | Generated text | Send | Engagement queue |
| Automation snapshot / interventions | Derived | — | Alerts model | Dead UI while experiment on | Hidden |

---

## 4. Data Source Matrix

### 4.1 Major KPIs on Admin home

| KPI (UI) | Source function(s) | Repository / collection (high level) | Derived calculation | Refresh |
|----------|-------------------|--------------------------------------|---------------------|---------|
| Connected / Remaining / % | `getCampaignConnectionMetrics` | Connections + Karkun assignment fields | Unique connected vs remaining | Hydration + assignment + hero ticks |
| Days Left / day label | `getCampaignTimeline` | Active campaign dates | Calendar math | Model rebuild |
| Momentum % | `getCampaignProgressOverview().overall` | Campaign progress service | Distinct from connection % | Model rebuild |
| Visits % (Health) | `getDashboardVisitMetrics` | Connected assignments + annexure submissions | Completed ÷ Planned | Module tick; unlocks on critical hydrate |
| Weekly Ijtema % (Health) | `getWeeklyIjtemaDashboardKpi` | Compliance weeklyIjtema event/submissions | Present ÷ Assigned (event) | Module tick; background gate |
| Monthly BM % (Health) | `getMonthlyBaitulMaalDashboardKpi` | Compliance monthlyBM cycle/submissions | Contributed ÷ Assigned (cycle) | Same |
| App Registration % | `getDashboardAppRegistrationMetrics` | Eligible Karkuns + JIH registered | Registered ÷ Eligible | Background gate |
| Collective Connected | Prefer Hero connection count when ready | MetricsService override | Else sum Rukn assigned | Overview memo |
| Average Progress (Collective/Gender) | Mean `completionPct` from team rows | Execution performance aggregation | Mean % | Overview memo |
| Top Priority score | Equal weight Visits/WI/BM/App per Rukn | Dashboard metrics for Rukn + event KPIs | Mean of four module % | Priority memo |
| Trends visits today/week | `getDashboardVisitMetrics` periods | Annexure by day/week | Counts | Trends memo |
| Timeline | Activity log | `activityLogs` | Chronological list | Own subscribe |

### 4.2 Same noun, different sources (conflicts)

| Concept | Dashboard / Health source | Other live or latent source | Class |
|---------|---------------------------|----------------------------|-------|
| Weekly Ijtema | **Event** KPI (`weeklyIjtemaService`) | Legacy week-ending attendance on Mission Control model / Rukn matrix | **FACT** (dual tracks; KC-0103C) |
| Monthly Baitul Maal | **Cycle** KPI | Legacy month-key baitulMaal store | **FACT** |
| “Progress” | Hero ring = connection %; Momentum = campaign progress overview; Collective average = execution `completionPct`; Priority = module equal-weight | Multiple | **FACT** |
| Visits | Health = Completed÷Planned Connected; Trends = submitted today/week | Different math | **FACT** |
| Connected | Hero MetricsService | Automation snapshot may use assignment active count | **OBSERVATION** / possible divergence |

---

## 5. Duplication Matrix

| Area | Instances | Inconsistency? | Class |
|------|-----------|----------------|-------|
| Connection progress | Hero ring, Trends connection %, Collective Connected | Mostly same MetricsService; momentum differs | **FACT** |
| Progress vocabulary | Momentum vs Connected % vs Average Progress vs Priority score | **Yes** — four meanings | **FACT** |
| Health WI/BM | Live Health event/cycle vs legacy model fields vs unmounted KPI cards | Parallel calculations | **FACT** |
| Urgency queues | Today’s Mission vs Top Priority vs (hidden) Intervention queue | Different ranking models; Intervention not shown | **FACT** / **OBSERVATION** |
| Visit reporting | Health Visits % vs Execution Reports tab vs Trends visit counts | Summary vs SoR list vs period counts | **OBSERVATION** |
| “Reports” | Execution Reports, WI/BM report pages, Communication Daily Reports, COS Reports placeholder | Same word, different products | **FACT** |
| Rukn home parallel | Rukn hero/mission shape vs Admin Command Center | Parallel executive pattern; Rukn still uses legacy attendance strip | **FACT** |

---

## 6. Findings

### 6.1 Correctly organized reporting capabilities

**FACT / OBSERVATION:**

1. Admin home correctly acts as an **executive scan + exception desk**, not a SoR for visits/compliance.
2. Campaign Health links into owning Operations modules — good Launch Point pattern.
3. Module report pages (Execution, WI, BM) sit next to their SoRs.
4. Snapshot coalescing + readiness gates (KC-0102A/B) keep executive widgets from fabricating empty critical metrics.
5. Separation of Daily Reports (Engagement send) from campaign Health KPIs is architecturally sensible even if naming overlaps.

### 6.2 Confusing ownership

**OBSERVATION:**

1. Dashboard **owns** New Karkun approval UI (People intake) while summarizing Operations/Engagement — mixed domain host.
2. “Reports” appears in Execution, WI, BM, and Communication with different meanings.
3. Dual progress signals on Hero (Connected % vs Momentum) without distinct operator labeling in this audit’s product copy analysis.
4. Top Priority “progress” ≠ Collective “Average Progress” for the same Rukns.

### 6.3 Conflicting data sources

**FACT:**

1. Admin Campaign Health WI/BM = event/cycle; legacy compliance metrics remain elsewhere (model fields, Rukn matrix).
2. Multiple “progress” calculations on executive surfaces.
3. Visit completeness (Health) vs visit submission counts (Trends) share vocabulary.

### 6.4 Executive-only surfaces

Surfaces that are **not** Systems of Record:

- Hero, Collective/Male/Female overviews, Campaign Health panel, Progress Trends, Activity Timeline (display), Today’s Mission (derived), Top Priority ranking (derived).

Surfaces that **mutate** on the executive home:

- Pending Karkun Requests (approve/reject)
- Top Priority messaging (WhatsApp composer)

### 6.5 Open architectural questions

1. Should Hero expose one progress story (connection) or keep Momentum as a separately labeled campaign-time metric?
2. Is `buildAdminCampaignAchievementProgress` retired permanently from UI?
3. Should Collective/Male/Female averages align with Top Priority’s equal-weight module score?
4. With Action Center experiment on, is the Intervention / three-column path obsolete or pending merge into Mission?
5. Are legacy Ijtema/BM dashboard metric functions still required for non-Dashboard consumers, or only latent weight on Mission Control model?
6. Is module-scoped reporting the permanent end state, or is a future `/admin/reports` hub expected?
7. Should People intake queues remain on the executive Dashboard, or is that an intentional “morning desk” product decision? (ownership question — no move recommended here)

---

## 7. Explicit non-actions (this ticket)

- No application code, UI, routing, repository, Firestore, or business-logic changes  
- No dashboard or navigation redesign  
- No implementation recommendations beyond labeling conflicts for future validation  

**Stop after KC-0103E.**
