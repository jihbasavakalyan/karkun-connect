# KC-0110 — Weekly Ijtema Track Consolidation (Phase 1 Inventory)

**Type:** Operations analysis (documentation; no behavioural change)  
**Status:** Complete — inventory & refactor plan  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Baselines:** [KC-0104](./campaign-operating-system-product-architecture.md) · [KC-0109](./operations-model-consolidation.md) · [KC-0103C](./kc-0103c-operations-capability-audit.md)  

**Nature of this document**

Phase 1 of Weekly Ijtema consolidation. It **inventories** every execution path, confirms the **canonical** event/cycle flow, classifies **legacy / adapter / dead** code, maps dependencies, and recommends an **incremental** implementation sequence.

It does **not** remove legacy code, rewrite services, change repositories, modify Firestore, rename routes, or change Campaign Health calculations.

---

## Executive summary

Weekly Ijtema has **two live Systems of Record** and **no runtime adapter** that synchronizes them.

| Track | Stack | Role today |
|-------|-------|------------|
| **Canonical (KC-0107 event/cycle)** | `weeklyIjtemaService` → `weeklyIjtemaStore` → `compliance/weeklyIjtemaEvent_*` + `weeklyIjtemaSubmission_*` | Admin open → Rukn submit → Admin report; **Campaign Health / Mission / Top Priority** |
| **Legacy (per-Karkun)** | `ijtemaAttendanceService` → `ijtemaAttendanceStore` → `compliance/ijtema_{karkunId}_{week}` | Compliance module, Campaign Execution Matrix, Connection Journey, People filters/profile, Cos, automation |

**Critical fact:** An operator can mark Ijtema on the Matrix/Journey/Compliance (legacy) without affecting Campaign Health, and can submit on `/rukn/weekly-ijtema` (canonical) without updating Matrix “Ijtema recorded.”

**Phase 1 outcome:** Documented inventory + deployable follow-on steps (KC-0110.1+). No code behaviour change in this ticket.

---

## 1. Inventory table

Status legend: **Canonical** · **Adapter** · **Legacy** · **Dead code**

### 1.1 Canonical event/cycle path

| Component | Route | Service | Validation | Repository / SoR | Consumer | Status |
|-----------|-------|---------|------------|------------------|----------|--------|
| `AdminWeeklyIjtemaPage.tsx` | `/admin/weekly-ijtema` | `createWeeklyIjtemaEvent`, `open/close/reopenWeeklyIjtemaAttendance`, `listWeeklyIjtemaEvents` | `validateCreateWeeklyIjtemaEvent` | `weeklyIjtemaStore` → ComplianceRepository `saveWeeklyIjtemaEvents` → `weeklyIjtemaEvent_*` | Admin nav; Mission deep-links | **Canonical** |
| `AdminWeeklyIjtemaReportPage.tsx` | `/admin/weekly-ijtema/:eventId/report` | `getWeeklyIjtemaReport`, `listWeeklyIjtemaEvents` | read-only | event + submission docs | Admin WI links | **Canonical** |
| `WeeklyIjtemaRegisterPage.tsx` | `/rukn/weekly-ijtema` | `getCurrentWeeklyIjtemaEvent`, `getRuknWeeklyIjtemaWorkspace`, `saveWeeklyIjtemaSubmission` | `validateSaveWeeklyIjtemaSubmission` / `validateWeeklyIjtemaMarks` | `weeklyIjtemaSubmission_*` | Rukn bottom nav “Ijtema” | **Canonical** |
| `weeklyIjtemaService.ts` | — | *(SoR API)* | via validation module | store → repo | pages, Health, Mission | **Canonical** |
| `weeklyIjtemaStore.ts` | — | persistence façade | — | Firestore / local | service | **Canonical** |
| `weeklyIjtemaValidation.ts` | — | — | marks / create / save | — | service | **Canonical** |
| `types/weeklyIjtema.ts` | — | — | — | types only | stack | **Canonical** |
| `dashboardMetricsService.getDashboardHealthSlices` (`weekly-ijtema`) | — | `getWeeklyIjtemaDashboardKpi` | — | event track | Campaign Health | **Canonical** |
| `campaignOperationsCommandCenter` Health + Mission WI items | `/admin` (derived) | `getWeeklyIjtemaDashboardKpi`, `getWeeklyIjtemaReport` | — | event track | Health panel; Today’s Mission; Top Priority | **Canonical** |
| `CampaignHealthPanel` metric `weekly-ijtema` | deep-link → `/admin/weekly-ijtema` | via ops builders | — | event track | Admin Command Center | **Canonical** |
| `AdminCommandCenter` / Hero store subscribe | `/admin` | `subscribeToWeeklyIjtemaStore` | — | event store | refresh coalescing | **Canonical** |
| ComplianceRepository `load/save/clearWeeklyIjtema*` | — | — | — | Firestore + local | hydration | **Canonical** |
| `firestore.rules` WI event/submission rules | — | — | — | security | Admin events; Rukn own submissions | **Canonical** |

### 1.2 Legacy per-Karkun path

| Component | Route | Service | Validation | Repository / SoR | Consumer | Status |
|-----------|-------|---------|------------|------------------|----------|--------|
| `ComplianceModulePage` section `ijtema` | `/admin/compliance?section=ijtema` | `getAllIjtemaAttendanceSummaries`, `updateIjtemaAttendance`, `getIjtemaAttendanceDashboardMetrics` | `validateIjtemaAttendanceUpdate` | `ijtema_{karkunId}_{week}` | Compliance desk | **Legacy** |
| `ComplianceSummaryCards` | Compliance | `getIjtemaAttendanceDashboardMetrics` | — | legacy store | Compliance header | **Legacy** |
| `KarkunWeeklyIjtemaSection` + `WeeklyIjtemaAttendanceModal` | Journey (`/rukn/visit/:id`, `/admin/annexure-1/:id`) | `getCurrentIjtemaAttendance`, `updateIjtemaAttendance`, history | update validation | legacy | Connection Journey | **Legacy** |
| `ConnectionQuickActionsPanel` (cycle Ijtema) | Journey | `cycleIjtemaForKarkun` | — | legacy | Journey quick actions | **Legacy** |
| `campaignExecutionMatrix.ts` + `CampaignExecutionMatrix.tsx` | Rukn home | `getCurrentIjtemaAttendance`, `cycleIjtemaForKarkun`, checklist Present | update validation | legacy | Matrix chips / completed flag | **Legacy** |
| `RuknExecutionSummaryCards` / `RuknTodaysFocus` | `/rukn` | matrix summaries | — | legacy | Rukn home | **Legacy** |
| `KarkunProfilePage` Ijtema field | `/admin/karkun/:id` | get/update current attendance | update validation | legacy | Profile | **Legacy** |
| `KarkunanPage` + `IjtemaAttendanceBulkUpdateModal` | `/admin/karkun` | `bulkUpdateIjtemaAttendance`; filters | bulk validation | legacy | People bulk | **Legacy** |
| `useKarkunPeopleManagement` Ijtema filters | People | `matchesIjtemaAttendanceFilters` | — | legacy | People list | **Legacy** |
| `campaignAutomationEngine` Ijtema alerts | → Compliance ijtema | legacy metrics / summaries | — | legacy | Admin reminders | **Legacy** |
| `buildRuknMissionControl` attendance strip | `/rukn` | `getCurrentIjtemaAttendance` | — | legacy | Rukn mission badges | **Legacy** |
| `buildAdminMissionControl` attendanceCompliance | `/admin` model | `getIjtemaAttendanceDashboardMetrics` | — | legacy | Model still built; attendance ring UI largely unmounted | **Legacy** |
| `commandCenterPresentation.getCampaignProgressOverview` | — | uses legacy absent in compliance % | — | legacy | Daily report / probes | **Legacy** |
| Cos panels / relationship intel / `communicationContext` | Communication Cos | legacy current status | — | legacy | Cos / messages | **Legacy** |
| Digital Rafeeq `opsAnswers` | voice | legacy metrics | — | legacy | Rafeeq ops answers | **Legacy** |
| `peopleStore` / migration `ensureIjtemaAttendanceRecord` | — | ensure helpers | — | legacy | onboarding / migration | **Legacy** |
| `ijtemaAttendanceService` / `Store` / types / validation | — | *(SoR API)* | `ijtemaAttendanceValidation` | ComplianceRepository `load/save/clearIjtema` | all legacy consumers | **Legacy** |

### 1.3 Adapters (presentation / routing only — no SoR sync)

| Component | Route | Service | Validation | Repository | Consumer | Status |
|-----------|-------|---------|------------|------------|----------|--------|
| `complianceNavigation.ts` (`weekly-ijtema` → `ijtema`) | Compliance aliases | — | — | — | Compliance routing | **Adapter** (label/alias only) |
| `CampaignExecutionProgressCard.tsx` | `/rukn` | legacy summary counts; CTA → `/rukn/weekly-ijtema` | — | legacy read + canonical nav | Rukn home | **Adapter** (mixed presentation) |
| `ComplianceRepositoryAdapter` `loadIjtema` | runtime API | legacy repo only | — | legacy | Runtime summaries | **Adapter** (repo→API; **does not bridge tracks**) |

### 1.4 Dead / unmounted (still in tree)

| Component | Intended track | Why classified dead | Status |
|-----------|----------------|---------------------|--------|
| `WeeklyIjtemaDashboardKpiCard.tsx` | Canonical | Not mounted on live Command Center; verify scripts forbid duplicate | **Dead code** |
| `CommandCenterIjtemaAttendanceMetrics.tsx` | Legacy | Barrel export only; no page import | **Dead code** |
| `RuknIjtemaAttendancePanel.tsx` | Legacy | Not on `RuknHomePage` | **Dead code** |
| `AdminExecutionSummaryWidgets` / several unmounted home panels | Legacy | No page import | **Dead code** |
| `AdminMissionControlPanels` attendance rings | Legacy | Admin home uses `AdminCommandCenter` instead | **Dead code** (UI) |
| `buildAdminCampaignAchievementProgress` Ijtema portion | Legacy | Export live; Hero UI unused | **Dead code** (UI consumer) |
| `RuknExecutionWorkspace` | Legacy checklist | Not wired to live Execution routes | **Dead code** |

---

## 2. Canonical path

### 2.1 Confirmed flow (aligned with KC-0109)

```text
Connection (People — Active Connection roster)
        ↓
Weekly Ijtema Event (Operations — Admin create/open)
        ↓
Attendance submission (Operations — Rukn Present/Absent per Connected Karkun)
        ↓
Completion (event KPI: Present ÷ Assigned)
        ↓
Campaign Health · Weekly Ijtema slice (Dashboard presentation)
        ↓
Dashboard summary / Mission / Top Priority (derived launch surfaces)
```

### 2.2 Participating components (canonical only)

| Layer | Participants |
|-------|----------------|
| **Prerequisite** | Active Connections (`assignmentStore` / Connections SoR) — People |
| **UI — Admin** | `AdminWeeklyIjtemaPage`, `AdminWeeklyIjtemaReportPage` |
| **UI — Rukn** | `WeeklyIjtemaRegisterPage` |
| **Validation** | `weeklyIjtemaValidation` + shared `campaignCycle/validation` |
| **Service** | `weeklyIjtemaService` (`getWeeklyIjtemaDashboardKpi`, lifecycle, report) |
| **Store** | `weeklyIjtemaStore` |
| **Shared cycle helpers** | `lib/campaignCycle/lifecycle.ts`, `report.ts`, `activeRukns.ts` |
| **Repository** | `ComplianceRepository` weekly event/submission methods |
| **Persistence** | Firestore `compliance` docs `_docType: weeklyIjtemaEvent` / `weeklyIjtemaSubmission` |
| **Dashboard** | `dashboardMetricsService`, `campaignOperationsCommandCenter`, `CampaignHealthPanel`, Mission builders |
| **Rules** | Admin manages events; Rukn writes own submissions |

### 2.3 Canonical completion definition

| Audience | Definition | Source |
|----------|------------|--------|
| Executive Health | Present ÷ Assigned for current/relevant open or closed event | `getWeeklyIjtemaDashboardKpi` |
| Field event work | All Connected Karkuns marked Present or Absent on Rukn submission | `validateWeeklyIjtemaMarks` |
| Module report | Rukn-wise present/absent/completion | `getWeeklyIjtemaReport` |

**Not canonical:** Matrix “Ijtema recorded”, Compliance Present/Absent/Excused week records, Journey weekly section history.

---

## 3. Legacy identification

For each live legacy family: why it remains, and classification.

| Occurrence family | Why it still exists | Classification | Notes |
|-------------------|---------------------|----------------|-------|
| Compliance module Ijtema section | Pre–KC-0107 Admin attendance desk; still linked from automation & nav | **Legacy** | Excused status exists only here (event track is Present/Absent) |
| Connection Journey weekly section + modal | Per-Karkun field capture beside visit | **Legacy** | Parallel UX to `/rukn/weekly-ijtema` |
| Campaign Execution Matrix Ijtema cell | Multi-signal “completed” needs IJ recorded | **Legacy** | Largest behavioural coupler to dual truth |
| People profile + bulk + filters | Registry operators mark attendance without opening WI module | **Legacy** | Migration/support for campaign ops on People surfaces |
| Cos / relationship / communication context | Copy and next-objective heuristics | **Legacy** | Read-only consumers of legacy SoR |
| Automation engine alerts → Compliance | Historical alert routing | **Legacy** | Should later deep-link to `/admin/weekly-ijtema` |
| Rukn mission attendance strip | Home badges from legacy current week | **Legacy** | Diverges from Health |
| `ensureIjtemaAttendanceRecord` | Seed/migration convenience | **Migration support (Legacy)** | Keep until cutover; do not extend |
| Unmounted KPI/panels | Superseded by Command Center Health | **Dead code** | Safe quarantine candidates in later cleanup |
| `CampaignExecutionProgressCard` CTA | Points Rukn to canonical register while showing legacy counts | **Adapter** | Intentional dual presentation; temporary |

**Explicit:** There is **no** sync service between `weeklyIjtemaSubmission` marks and `ijtema_*` week docs. Dual write remains possible.

---

## 4. Dependency map

### 4.1 Canonical track

```text
Weekly Ijtema UI
  AdminWeeklyIjtemaPage / WeeklyIjtemaRegisterPage / AdminWeeklyIjtemaReportPage
        ↓
Validation
  weeklyIjtemaValidation (+ campaignCycle helpers)
        ↓
Service
  weeklyIjtemaService
        ↓
Store
  weeklyIjtemaStore
        ↓
Repository
  ComplianceRepository (weeklyIjtemaEvents / Submissions)
  → Firestore compliance/{weeklyIjtemaEvent_*|weeklyIjtemaSubmission_*}
        ↓
Dashboard consumers
  dashboardMetricsService.getDashboardHealthSlices
  campaignOperationsCommandCenter (Health, Mission, Top Priority)
  CampaignHealthPanel / AdminCommandCenter
        ↓
Reporting consumers
  AdminWeeklyIjtemaReportPage (module report)
  (Mission pending WI items launch back to Admin WI)
```

### 4.2 Legacy track (parallel — not feeding Health)

```text
Legacy Ijtema UI
  Compliance / Journey / Matrix / People / Cos
        ↓
Validation
  ijtemaAttendanceValidation
        ↓
Service
  ijtemaAttendanceService
        ↓
Store
  ijtemaAttendanceStore
        ↓
Repository
  ComplianceRepository (ijtema)
  → Firestore compliance/ijtema_{karkunId}_{week}
        ↓
Non-Health consumers
  Matrix completed flag, Journey section, Compliance cards,
  automation alerts, Cos/relationship copy, Rukn attendance badges,
  getCampaignProgressOverview (indirect)
```

### 4.3 Cross-track (presentation only)

```text
CampaignExecutionProgressCard
  ├─ reads Legacy matrix/summary counts
  └─ navigates to Canonical /rukn/weekly-ijtema

complianceNavigation
  └─ aliases "weekly-ijtema" section id → Legacy Compliance "ijtema"
```

---

## 5. Refactor plan (incremental, independently deployable)

Each step must preserve current behaviour until its cutover flag/adapter is ready. **No breaking changes.**

### KC-0110.1 — Annotate & freeze (docs + comments only)

- Mark canonical entrypoints in code comments (`KC-0110 canonical`)  
- Mark legacy writers with `KC-0110 legacy — do not extend`  
- Add this inventory to architecture index  

**Deployable alone. Zero behaviour change.**

### KC-0110.2 — Read alignment for Matrix (adapter)

- Introduce a **read adapter** so Matrix Ijtema cell displays status derived from the **open event submission** when an open event exists; fallback to legacy if no open event  
- Keep legacy writes unchanged initially  

**Independently deployable behind feature flag.** Health unchanged.

### KC-0110.3 — Journey / Quick actions read alignment

- Same read adapter for Journey weekly section + quick-action display  
- Writes still legacy (or no-op write with guidance CTA to `/rukn/weekly-ijtema`)  

### KC-0110.4 — Write cutover (Matrix / Journey)

- New marks from Matrix/Journey go to **canonical submission** when event is open  
- Optional dual-write to legacy for one release (rollback safety)  
- Then write-legacy-off flag  

### KC-0110.5 — Compliance & People redirect / quarantine

- Compliance Ijtema section: banner + deep-link to Admin WI; eventually read-only legacy archive  
- People bulk/profile: prefer launch to WI or disable writes when event open  

### KC-0110.6 — Consumer rewiring

- Automation alerts → `/admin/weekly-ijtema`  
- Rukn mission attendance strip → event KPI / submission state  
- Quarantine dead UI (`WeeklyIjtemaDashboardKpiCard`, old panels) in a cleanup PR  

### KC-0110.7 — Legacy SoR retirement (later; KC-ARCH-001)

- Stop writing `ijtema_*` docs  
- Retain historical reads or export  
- **Not** in Phase 1; requires persistence plan  

### Ordering

```text
0110.1 (annotate)
   ↓
0110.2 (Matrix read adapter) ──► 0110.3 (Journey read)
   ↓
0110.4 (write cutover)
   ↓
0110.5 (Compliance/People) ──► 0110.6 (consumers / dead UI)
   ↓
0110.7 (retire legacy SoR)   [separate durability ticket]
```

**Out of scope for all 0110.* steps:** Monthly Baitul Maal, Follow-up, JIH, Health formula changes, Communication, People Connections ownership.

---

## 5.1 Migration tracker (KC-0110.2+)

| Consumer | Previous Source | Current Source | Status |
|----------|-----------------|----------------|--------|
| Dashboard / Campaign Health | Event/Cycle | Event/Cycle | ✅ Canonical |
| Mission / Top Priority | Event/Cycle | Event/Cycle | ✅ Canonical |
| Matrix (`buildCampaignMatrixRows`) | Legacy `getCurrentIjtemaAttendance` | Canonical read adapter | ✅ KC-0110.2 |
| Journey (`KarkunWeeklyIjtemaSection`) | Legacy | Canonical read adapter (+ legacy fallback) | ✅ KC-0110.2 |
| Journey modal / Matrix cell **writes** | Legacy `updateIjtemaAttendance` | Canonical write adapter (+ legacy dual-write) | ✅ KC-0110.6 |
| Compliance (`ComplianceModulePage` ijtema + `ComplianceSummaryCards`) | Legacy | Canonical read adapter | ✅ KC-0110.3 |
| Compliance Ijtema **writes** | Legacy `updateIjtemaAttendance` | Canonical write adapter (+ legacy dual-write) | ✅ KC-0110.6 |
| People (profile + list filters via `useKarkunPeopleManagement`) | Legacy | Canonical read adapter | ✅ KC-0110.4 |
| People profile / bulk **writes** | Legacy | Canonical write adapter (+ legacy dual-write) | ✅ KC-0110.6 |
| Cos / automation / Rafeeq ops | Legacy | Legacy | Deferred (read rewiring later) |
| Writes (Matrix / Journey / Compliance / People / checklist / home panel) | Legacy | Canonical write adapter | ✅ KC-0110.6 |

**Read adapter:** `src/lib/operations/weeklyIjtemaReadAdapter.ts`  
**Write adapter:** `src/lib/operations/weeklyIjtemaWriteAdapter.ts`  
- `markWeeklyIjtemaAttendance` / `bulkMarkWeeklyIjtemaAttendance` — single write entry  
- Canonical: `upsertWeeklyIjtemaKarkunMark` / `removeWeeklyIjtemaKarkunMark` on open event  
- Full Rukn register submit: `saveWeeklyIjtemaSubmission` (unchanged)  
- Legacy `updateIjtemaAttendance` / `bulkUpdateIjtemaAttendance` — compatibility only (Excused, no open event, dual-write)

### 5.2 Read / write status (KC-0110.5–.6)

| Area | Status |
|------|--------|
| Reads | ✅ |
| Writes | ✅ |
| Legacy Service | Compatibility Only |
| Retirement | Pending |

### Canonical Source of Truth

**Event/Cycle (`weeklyIjtema*`) is the sole operational source of truth for Weekly Ijtema attendance** after KC-0110.6.  
Presentation reads go through `weeklyIjtemaReadAdapter`. Operator writes go through `weeklyIjtemaWriteAdapter` (Present/Absent on the open event). Legacy `ijtemaAttendance*` remains compatibility-only (Excused, historical weeks without a matching open event, dual-write sync for deferred Cos readers) until retirement (KC-0110.7).

### Write Cutover Readiness (superseded by KC-0110.6)

- Single canonical **read** path: Matrix / Journey / Compliance / People.  
- Single canonical **write** path: `markWeeklyIjtemaAttendance` / `bulkMarkWeeklyIjtemaAttendance`.  
- Legacy write APIs retained only as compatibility / dual-write helpers — no new product callers.

---

## 6. Verification (this ticket)

| Check | Result |
|-------|--------|
| Current WI event workflow remains the canonical model | **Confirmed** — Health already uses `getWeeklyIjtemaDashboardKpi` |
| No behavioural code changes required for inventory | **Yes** — documentation (+ optional annotations only if added) |
| Campaign Health calculations unchanged | **Yes** — not modified |
| Firestore / repositories / routes unchanged | **Yes** |
| Legacy code not removed | **Yes** |

---

## 7. Explicit non-actions (KC-0110 Phase 1)

- No removal of legacy Ijtema code  
- No service rewrite  
- No repository redesign  
- No Firestore schema changes  
- No route renames  
- No Campaign Health / Dashboard KPI formula changes  
- No Monthly Baitul Maal work (KC-0111)  

**Stop after KC-0110 Phase 1 inventory.**

---

## 8. KC-0110.2 notes

Read-only adapter alignment shipped for Matrix + Journey presentation. Write paths remain on legacy until KC-0110.4.

## 8.1 KC-0110.3 notes

Compliance Ijtema list and summary cards read through the canonical adapter. Mark Present/Absent/Excused on Compliance still writes legacy `ijtema_*` until write cutover.

## 8.2 KC-0110.4 notes

People profile Weekly Ijtema display and People list Ijtema filters read through the canonical adapter. Profile save and bulk mark actions still write legacy until write cutover.

## 8.3 KC-0110.5 notes

Read validation complete for Matrix / Journey / Compliance / People. Adapter adds DEV-only source logging and a bulk mark index for Compliance summaries. No write, Firestore, or KPI changes.
## 8.4 KC-0110.6 notes

Write cutover: Matrix / Journey modal / Compliance / People profile+bulk / checklist / Rukn home Ijtema panel use `weeklyIjtemaWriteAdapter`. Present/Absent upsert into the open event submission; Excused and no-open-event paths remain on legacy compatibility. Dual-write keeps legacy in sync for deferred Cos readers. `saveWeeklyIjtemaSubmission` (full Rukn register) unchanged.
