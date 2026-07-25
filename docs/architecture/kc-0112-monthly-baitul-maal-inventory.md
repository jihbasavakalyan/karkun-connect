# KC-0112.1 — Monthly Baitul Maal Architecture Inventory

**Type:** Architecture inventory (documentation + light annotations only)  
**Status:** Complete — ready for phased migration tickets  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Baselines:** [KC-0104](./campaign-operating-system-product-architecture.md) · [KC-0109](./operations-model-consolidation.md) · [KC-0110](./kc-0110-weekly-ijtema-inventory.md) · [KC-0111](./kc-0111-campaign-health-inventory.md)  

**Nature of this document**

This inventory maps every Monthly Baitul Maal execution path. It does **not** authorize formula changes, Firestore changes, repository redesign, or read/write migration. Follow-on tickets (KC-0112.2+) must each pass KC-ARCH-009.

**Naming note:** Ops consolidation (`operations-model-consolidation.md`) formerly labelled BM track work as “KC-0111”. Campaign Health inventory took **KC-0111**; Monthly Baitul Maal consolidation is **KC-0112**.

---

## Executive summary

Monthly Baitul Maal has **two live Systems of Record** — the same dual-track pattern as Weekly Ijtema:

| Track | Prefix | Status model | Executive SoR? |
|-------|--------|--------------|----------------|
| **Canonical (cycle)** | `monthlyBaitulMaal*` | `Contributed` / `Pending` (no amounts) | **Yes** — Campaign Health / Mission / module pages |
| **Legacy (per-Karkun)** | `baitulMaal*` | `Paid` / `Pending` / `Exempt` (+ optional amount) | **No** — supporting / debt |

**Critical fact:** An operator can mark Baitul Maal on Matrix / Compliance / People (legacy) without affecting Campaign Health, and can submit on `/rukn/baitul-maal` (canonical) without updating Matrix “committed” **until KC-0112.2** (Matrix / Journey presentation now prefer canonical Contributed). Writes still use legacy until KC-0112.5. **There is no sync.**

**KC-0112.2–0112.5:** Canonical read adapter serves Matrix / Journey / summaries, Compliance, and People. Read path validated with DEV diagnostics. Cos, Automation, and writes remain on **legacy**.

---

## Status legend

| Class | Meaning |
|-------|---------|
| **Canonical** | Authoritative cycle track (or Health presentation over it) |
| **Adapter** | Presentation / routing over data; does not bridge tracks |
| **Legacy** | Live per-Karkun compliance track |
| **Duplicate** | Same product noun, different engine / formula |
| **Dead** | Unreachable UI (may still compute in builders / probes) |

---

## 1. Track inventory

### 1.1 Canonical cycle track

| Layer | Path | Role | Status |
|-------|------|------|--------|
| Types | `src/types/monthlyBaitulMaal.ts` | Cycle, submission, KPI, report | **Canonical** |
| Validation | `src/validation/monthlyBaitulMaalValidation.ts` | Create cycle; save marks | **Canonical** |
| Store | `src/stores/monthlyBaitulMaalStore.ts` | In-memory + ComplianceRepository persist | **Canonical** |
| Service | `src/services/monthlyBaitulMaalService.ts` | Lifecycle, workspace, report, KPI | **Canonical** |
| Shared cycle | `src/lib/campaignCycle/{lifecycle,report,validation}.ts` | Open/Closed, deadline, binary report | **Canonical** |
| Repo | `ComplianceRepository` `load/save/clearMonthlyBaitulMaal*` | Firestore + local | **Canonical** |

**Firestore:** collection `compliance`  
- Cycle: `monthlyBaitulMaalCycle_{cycleId}` (`_docType: monthlyBaitulMaalCycle`)  
- Submission: `monthlyBaitulMaalSubmission_{cycleId}_{ruknId}` (`_docType: monthlyBaitulMaalSubmission`)

**Admin / Rukn pages**

| Component | Route | Service | Status |
|-----------|-------|---------|--------|
| `AdminMonthlyBaitulMaalPage` | `/admin/baitul-maal` | create / open / close / reopen | **Canonical** |
| `AdminMonthlyBaitulMaalReportPage` | `/admin/baitul-maal/:cycleId/report` | `getMonthlyBaitulMaalReport` | **Canonical** |
| `RuknMonthlyBaitulMaalPage` | `/rukn/baitul-maal` | workspace + `saveMonthlyBaitulMaalSubmission` | **Canonical** |

**Service API (canonical):** `listMonthlyBaitulMaalCycles`, `getCurrentMonthlyBaitulMaalCycle`, `createMonthlyBaitulMaalCycle`, `open/close/reopenMonthlyBaitulMaalCycle`, `getRuknMonthlyBaitulMaalWorkspace`, `saveMonthlyBaitulMaalSubmission`, `getMonthlyBaitulMaalReport`, `getMonthlyBaitulMaalDashboardKpi`.

---

### 1.2 Legacy per-Karkun track

| Layer | Path | Role | Status |
|-------|------|------|--------|
| Types | `src/types/baitulMaal.ts` | Paid / Pending / Exempt | **Legacy** |
| Validation | `src/validation/baitulMaalValidation.ts` | Paid requires paymentDate | **Legacy** |
| Store | `src/stores/baitulMaalStore.ts` | `karkunId:monthKey` map | **Legacy** |
| Service | `src/services/baitulMaalService.ts` | CRUD, metrics, filters | **Legacy** |
| Repo | `ComplianceRepository` `load/save/clearBaitulMaal` | Firestore + local | **Legacy** |

**Firestore:** `compliance/baitulMaal_{karkunId}_{monthKey}` (`_docType: baitulMaal`)

**Legacy live surfaces**

| Consumer | Route / surface | Service | Status |
|----------|-----------------|---------|--------|
| Compliance section `baitul-maal` | `/admin/compliance` | **Reads:** adapter summaries. **Writes:** `updateBaitulMaal` | **Adapter** (reads) · **Legacy** (writes) |
| `ComplianceSummaryCards` | Compliance | adapter dashboard metrics view | **Adapter** (KC-0112.3) |
| People profile | `/admin/karkunan/:id` | **Reads:** adapter status view. **Writes:** `updateBaitulMaal` | **Adapter** (reads) · **Legacy** (writes) |
| People bulk | `/admin/karkunan` | `bulkUpdateBaitulMaal` | **Legacy** (writes only — out of 0112.4) |
| People filters | `useKarkunPeopleManagement` | `matchesMonthlyBaitulMaalFiltersView` | **Adapter** (KC-0112.4) |
| Matrix + quick actions | Rukn home / Journey | **Reads:** adapter (`getMonthlyBaitulMaalCampaignStateView`). **Writes:** `cycleBaitulMaalCampaignForKarkun` → `updateBaitulMaal` | **Adapter** (reads) · **Legacy** (writes) |
| Cos progress capture | Cos panels | matrix discussed → legacy write | **Legacy** |
| Automation | Admin reminders | legacy metrics / summaries → Compliance | **Legacy** |
| Communication / Rafeeq | templates, ops answers | legacy status | **Legacy** |

**Matrix nuance:** Campaign states `not_discussed` / `discussed` / `committed` often use **remarks** while status stays `Pending`. Matrix “Committed” ≠ cycle “Contributed.”

---

### 1.3 Health / Dashboard consumers

| Metric | Component | Service | Calculation | Source | Status |
|--------|-----------|---------|-------------|--------|--------|
| Monthly Baitul Maal Health % | `CampaignHealthPanel` | `getDashboardMonthlyBaitulMaalHealthSlice` | **Contributed ÷ totalAssigned** | Cycle KPI counts | **Canonical** |
| Module report % | Admin report page | `getMonthlyBaitulMaalReport` | Marked-only `completionPct` | Cycle submissions | **Canonical** module |
| Mission pending BM | Today’s Mission | `getMonthlyBaitulMaalDashboardKpi().ruknsPending` | Rukns without submission | Cycle | **Canonical** |
| Top Priority BM % | Top Priority Rukns | cycle report row contributed÷assigned | Per-Rukn | Cycle | **Canonical** |
| Legacy compliance % | Unmounted / Cos / automation | `getBaitulMaalDashboardMetrics` | (Paid+Exempt) ÷ all Karkuns | Legacy | **Legacy** · **Duplicate** |

---

### 1.4 Adapters & dead UI

| Item | Role | Status |
|------|------|--------|
| `monthlyBaitulMaalReadAdapter` | Cycle preferred; legacy fallback for Matrix / Journey presentation | **Adapter** (KC-0112.2) |
| `ComplianceRepositoryAdapter` `loadBaitulMaal` | Runtime API over legacy repo only | **Adapter** (does **not** bridge tracks) |
| Admin nav “Baitul Maal” → `/admin/baitul-maal` | Points to cycle module | **Adapter** (routing) |
| `MonthlyBaitulMaalDashboardKpiCard` | Cycle KPI card | **Dead** (no page import) |
| `CommandCenterBaitulMaalMetrics` | Legacy metrics | **Dead** |
| `RuknBaitulMaalPanel` | Legacy Rukn panel | **Dead** |
| `AdminOperationalHealthPanel` BM | Legacy compliance | **Dead** UI |

---

## 2. Canonical flow (as implemented)

```text
People: Active Connection (assignment / Connected)
        │
        ▼
Admin creates / opens Monthly Baitul Maal cycle (monthKey, deadline)
        │  createMonthlyBaitulMaalCycle
        │  → compliance/monthlyBaitulMaalCycle_*
        ▼
Rukn records contributions on /rukn/baitul-maal
        │  marks Contributed | Pending for ALL assigned Karkuns
        │  saveMonthlyBaitulMaalSubmission
        │  → compliance/monthlyBaitulMaalSubmission_*
        ▼
Canonical service (monthlyBaitulMaalService)
        │  report + getMonthlyBaitulMaalDashboardKpi
        ▼
Campaign Health (derived)
        │  getDashboardMonthlyBaitulMaalHealthSlice
        │  contributed ÷ totalAssigned
        ▼
Dashboard / Mission / Top Priority
```

**Parallel legacy flow (still live; not Health SoR):**

```text
Compliance / Profile / People bulk / Matrix / Cos
        → updateBaitulMaal (Paid | Pending | Exempt [+ campaign remarks])
        → compliance/baitulMaal_{karkunId}_{monthKey}
        → legacy metrics, matrix “committed”, automation → Compliance
```

---

## 3. Dependency graph

```text
Admin UI (/admin/baitul-maal, report)
Rukn UI  (/rukn/baitul-maal)
        │
        ▼
monthlyBaitulMaalService  (canonical)
        │
        ▼
monthlyBaitulMaalStore
        │
        ▼
ComplianceRepository (monthlyBaitulMaalCycles / Submissions)
        │
        ▼
Firestore compliance/*
        │
        ▼
dashboardMetricsService.getDashboardMonthlyBaitulMaalHealthSlice
        │
        ▼
CampaignHealthPanel / Mission / Top Priority / Dashboard

─── parallel (legacy) ───

Admin Compliance / People / Matrix / Cos / Automation
        │
        ▼
baitulMaalService
        │
        ▼
baitulMaalStore → ComplianceRepository (baitulMaal) → Firestore
```

---

## 4. Duplicate logic inventory

| Product noun | Engine A (canonical intent) | Engine B | Engine C | Risk |
|--------------|----------------------------|----------|----------|------|
| **BM Health / completion %** | Health: Contributed ÷ Assigned | Module report: marked-only `completionPct` | Legacy: (Paid+Exempt) ÷ all Karkuns | **High** |
| **“Contributed / Completed”** | Cycle mark `Contributed` | Matrix `committed` (Paid/Exempt or remarks) | Summary cards “Contributed” over matrix | **High** |
| **Pending BM** | Mission: `ruknsPending` | Automation/Compliance: Karkun status Pending | Matrix: not `committed` | **High** |
| **Rukn BM progress** | Top Priority: cycle row % | `getRuknBaitulMaalMetrics` Paid count | Matrix committed count | **High** |
| **Overview / achievement** | — | Legacy BM folded into overview / achievement builders | — | **Legacy** · **Duplicate** |

**Documented dual presentation (not accidental drift):** Health uses **assigned** denominator; module report uses **marked-only** (same pattern as Weekly Ijtema — see KC-0111).

---

## 5. Migration roadmap

Mirror KC-0110. Do **not** change Health formulas without a product decision.

| Step | Focus | Risk |
|------|-------|------|
| **KC-0112.1** | This inventory (+ annotations) | None |
| **KC-0112.2** | Read adapter + Matrix / Journey / summary presentation reads | Low |
| **KC-0112.3** | Compliance read migration (list + summary cards) | Low |
| **KC-0112.4** | People read migration (filters + profile display) | Low |
| **KC-0112.5** | Read validation & observability | Low |
| **KC-0112.6** | Canonical write cutover (Matrix / Compliance / People when cycle open) | Medium–High |
| **KC-0112.7** | Legacy retirement (+ Cos / Automation redirect if still legacy) | Medium |
| **KC-0112.8** | Production certification | — |

**Vocabulary work (any phase):** Separate “Contributed (cycle)” vs “Committed (campaign conversation)” vs “Paid (legacy compliance).”

---

## 5.1 Migration tracker

| Consumer | Previous Source | Current Source | Status |
|----------|-----------------|----------------|--------|
| Health | Canonical | Canonical | ✅ |
| Mission | Canonical | Canonical | ✅ |
| Matrix | Legacy | Adapter | ✅ KC-0112.2 |
| Journey (Quick Actions) | Legacy | Adapter | ✅ KC-0112.2 |
| Read-only summaries (progress / focus / summary cards) | Legacy | Adapter | ✅ KC-0112.2 |
| Compliance | Legacy | Adapter | ✅ KC-0112.3 |
| People | Legacy | Adapter | ✅ KC-0112.4 |
| Cos / Automation | Legacy | Legacy | Pending (deferred) |
| Writes | Legacy | Legacy | Pending |
| Read validation | — | — | ✅ KC-0112.5 |

**Adapter rules**
- **Matrix / Journey (KC-0112.2):** Canonical `Contributed` → Matrix `committed`. Cycle `Pending` does not invent campaign “discussed”; falls through to legacy Paid/Exempt/remarks. Write seed (`getBaitulMaalCampaignState`) stays legacy-only until write cutover.
- **Compliance (KC-0112.3):** Cycle mark for the requested `monthKey` wins. `Contributed` → Compliance `Paid`; cycle `Pending` → `Pending`. `Exempt` remains legacy-only. List + summary cards share `getMonthlyBaitulMaalSummariesView` / `getMonthlyBaitulMaalDashboardMetricsView`. Writes still `updateBaitulMaal`.
- **People (KC-0112.4):** Filters via `matchesMonthlyBaitulMaalFiltersView`; profile Paid checkbox seeds from `getMonthlyBaitulMaalComplianceStatusView`. Bulk / profile writes still `updateBaitulMaal` / `bulkUpdateBaitulMaal`.

### KC-0112.3 notes

Compliance Baitul Maal list and summary cards read through the canonical adapter. Mark Paid/Pending/Exempt on Compliance still writes legacy `baitulMaal_*` until write cutover.

### KC-0112.4 notes

People list filters and profile contribution display read through the canonical adapter. Profile save and People bulk Mark Paid/Pending still write legacy until write cutover.

---

## 5.2 Read Validation (KC-0112.5)

| Surface | Status |
|---------|--------|
| Matrix | ✅ Adapter (`getMonthlyBaitulMaalCampaignStateView`) |
| Journey | ✅ Adapter (via matrix rows / Quick Actions) |
| Compliance | ✅ Adapter (summaries + metrics views) |
| People | ✅ Adapter (filters + profile status view) |
| Shared read adapter | ✅ `monthlyBaitulMaalReadAdapter` |
| Read Validation | ✅ |
| Write Migration | Pending |

**DEV observability:** `localStorage.setItem('kc.debug.monthlyBaitReads', '1')` (DEV only). Logs `Canonical Cycle` vs `Legacy Fallback`. Silent unless enabled; no telemetry.

**Performance:** Compliance summaries use a single cycle mark index (one submission pass). Metrics reuse that summaries view. Compliance status view fetches legacy once (no double read on fallback). Matrix/Journey keep per-Karkun mark lookup (same pattern as Weekly Ijtema).

**Approved legacy read exceptions (not presentation bugs):**

| Location | Reason |
|----------|--------|
| `getBaitulMaalCampaignState` / Matrix write seed | Write workflow seed until cutover |
| Cos panels / `relationshipIntelligencePresentation` | Deferred Cos integration |
| `campaignAutomationEngine` | Deferred automation |
| Dead home / command-center BM panels | Dead or non-migrated surfaces |
| `buildAdminMissionControl` legacy BM % | Deferred / duplicate vs Health |
| Adapter internals | Fallback implementation |

---

## 5.3 Write Cutover Readiness

- Canonical read path established for Matrix, Journey, Compliance, and People.
- Legacy retained only for writes and documented deferred integrations (Cos, Automation, write seed).
- Ready for KC-0112.6 write cutover without further presentation read migration in those modules.

---

## 6. Explicit non-actions (this ticket)

- No calculation / KPI formula changes  
- No Firestore / repository changes  
- No UI / route changes  
- No read or write migration  
- No Campaign Health / Dashboard behaviour changes  

---

## 7. Verification (KC-0112.1)

| Check | Result |
|-------|--------|
| Dual tracks identified (cycle vs per-Karkun) | Yes |
| Canonical flow matches implementation | Yes |
| Health already on cycle track | Yes |
| Duplicate engines listed | Yes |
| Migration ordered 0112.2–0112.7 | Yes |
| Behaviour / Firestore / repos unchanged | Yes |

---

## 8. File index

### Canonical
- `src/services/monthlyBaitulMaalService.ts`
- `src/stores/monthlyBaitulMaalStore.ts`
- `src/types/monthlyBaitulMaal.ts`
- `src/validation/monthlyBaitulMaalValidation.ts`
- `src/lib/operations/monthlyBaitulMaalReadAdapter.ts` (KC-0112.2–0112.5)
- `src/pages/admin/AdminMonthlyBaitulMaalPage.tsx`
- `src/pages/admin/AdminMonthlyBaitulMaalReportPage.tsx`
- `src/pages/rukn/RuknMonthlyBaitulMaalPage.tsx`
- `src/services/dashboardMetricsService.ts` (BM Health slice)
- `src/lib/missionControl/campaignOperationsCommandCenter.ts`

### Legacy
- `src/services/baitulMaalService.ts`
- `src/stores/baitulMaalStore.ts`
- `src/types/baitulMaal.ts`
- `src/lib/campaignExecutionMatrix.ts` (presentation reads via adapter; writes still legacy)
- `src/pages/admin/ComplianceModulePage.tsx`
- `src/services/campaignAutomationEngine.ts`
