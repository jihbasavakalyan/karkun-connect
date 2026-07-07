# Sprint 12 Audit Report — Compliance Module Workflow & UX

**Sprint theme:** Simplify Compliance. Increase Participation. Reduce Administrative Effort.

**Phase:** 0 — Workflow & UX Audit (analysis only, no application changes)

**Date:** July 2026

**Governing document:** [Workflow Automation Constitution](../architecture/workflow-automation-constitution.md)

**Status:** Ready for review and approval before Phase 1 implementation

---

## 1. Executive Summary

The Compliance Module is **not a standalone routed product area**. It is implemented as three parallel in-memory domains—**Weekly Ijtema**, **JIH Web Portal** (registration + monthly reporting), and **Monthly Bait-ul-Maal**—surfaced primarily through:

- **Administrator Command Center** (`/admin`) — summary metric cards
- **Karkun Management** (`/admin/karkun`) — advanced filters and bulk actions
- **Karkun Profile** (`/admin/karkun/:karkunId`) — four boolean compliance toggles

There is **no dedicated Compliance route**, **no Rukn-facing compliance UI**, and **no unified answer** to the guiding question:

> **"What compliance action is pending today?"**

### Major Findings

| Category | Finding |
| -------- | ------- |
| **Navigation fragmentation** | Compliance is scattered across Dashboard cards, Karkun list filters, and profile toggles. No single compliance workspace. |
| **Constitution violations** | Dashboard cards link to generic pages without pre-filtering; JIH monthly reporting cards link to Annexure-1 execution reports (wrong domain); profile toggles collapse three-state Ijtema into a binary checkbox. |
| **Duplicate UI (dead code)** | Full Card + EditModal stacks exist for all three compliance areas but are **never mounted**. Profile toggles are the live UI. |
| **Dual JIH concepts** | **JIH App Registration** (Annexure-1 / karkun registry) vs **JIH Web Portal** (compliance service) share similar naming but different data sources. |
| **Missing next-action guidance** | Dashboard shows counts but not "open these 5 Karkuns." Karkun table has compliance filters but **no compliance columns**. |
| **Inconsistent metrics** | Ijtema dashboard undercounts (only Karkuns with existing records); Bait-ul-Maal defaults all Karkuns to Pending. |
| **Bulk action asymmetry** | Ijtema and Bait-ul-Maal have bulk updates; JIH Portal has none. |
| **Mobile friction** | Advanced filters require expanding a panel; bulk action bar wraps many small buttons; profile page mixes people + compliance in one long form. |

### Recommendation

Proceed with Sprint 12 as a **Compliance Optimization Sprint** in phased implementation:

1. **Phase 1** — Unified Compliance entry point and constitution-aligned navigation (Must Do)
2. **Phase 2** — Workflow automation: derived status, smart defaults, filtered deep links (Must Do)
3. **Phase 3** — UI consolidation: activate or remove dead Card/Modal components; fix Ijtema Informed bug (Must Do / Should Do)
4. **Phase 4** — Mobile UX and cognitive load reduction (Should Do)
5. **Phase 5** — Pilot validation (Must Do)

Defer Firebase persistence, notifications, schedulers, and analytics to **Version 2**.

**Estimated impact:** Administrative compliance updates can be reduced by ~50% through unified pending lists, pre-filtered navigation, bulk JIH actions, and removal of duplicate UI paths.

---

## 2. Screen Inventory

Compliance has **no dedicated module route**. The table below inventories every screen or surface where compliance information appears or is edited.

| Screen / Surface | Route | Keep | Simplify | Merge | Remove | Remarks |
| ---------------- | ----- | ---- | -------- | ----- | ------ | ------- |
| **Command Center — JIH Web Portal metrics** | `/admin` | ✓ | ✓ | — | — | 4 linked cards. Reporting links incorrectly go to Execution Reports. Registration links go to unfiltered Karkun list. |
| **Command Center — Bait-ul-Maal metrics** | `/admin` | ✓ | ✓ | ✓ | — | 2 cards (Paid/Pending). Merge into unified Compliance dashboard in Phase 1. Links lack filter context. |
| **Command Center — Weekly Ijtema metrics** | `/admin` | ✓ | ✓ | ✓ | — | 3 cards (Present/Absent/Informed). Same deep-link gap. Metrics undercount Karkuns without records. |
| **Karkun Management — compliance filters** | `/admin/karkun` | ✓ | ✓ | ✓ | — | 7 compliance filter dropdowns hidden in Advanced Filters. Essential but buried. Should merge into Compliance workspace or surface as quick filters. |
| **Karkun Management — bulk actions** | `/admin/karkun` | ✓ | ✓ | — | — | Ijtema (3 actions) + Bait-ul-Maal (2 actions). No JIH bulk. Bar becomes crowded on mobile. |
| **Karkun Profile — compliance toggles** | `/admin/karkun/:id` | ✓ | ✓ | ✓ | — | 4 checkboxes mixed with people fields. Loses Ijtema "Informed" on save. Should use tri-state control or link to focused compliance panel. |
| **JIH Web Portal Card + Edit Modal** | — | — | — | ✓ | ✓ | Built but **never mounted**. Duplicate of profile toggles with richer fields. Merge into profile or Compliance workspace; remove dead path. |
| **Bait-ul-Maal Card + Edit Modal** | — | — | — | ✓ | ✓ | Same — dead duplicate UI. |
| **Ijtema Card + Edit Modal** | — | — | — | ✓ | ✓ | Same — dead duplicate UI. Supports Informed status correctly (unlike profile). |
| **Ijtema Bulk Update Modal** | `/admin/karkun` | ✓ | ✓ | — | — | Live. Optional remarks field only. |
| **Bait-ul-Maal Bulk Update Modal** | `/admin/karkun` | ✓ | ✓ | — | — | Live. Payment date required for Paid; amount optional. |
| **ComplianceSection wrapper** | — | — | — | — | ✓ | Zero imports. Remove in technical cleanup. |
| **ComplianceProfileField** | — | — | — | — | ✓ | Only used by unused Cards. Remove with Cards or repurpose. |
| **NeedsAttentionPanel** | — | — | — | ✓ | ✓ | Exported but not on AdminHomePage. Mock data. Merge concept into Compliance pending list or remove. |
| **Execution Reports tab** | `/admin/execution?section=reports` | ✓ | — | — | — | **Not compliance.** Annexure-1 only. JIH reporting cards must not link here. |
| **Annexure-1 — JIH App Registration** | `/rukn/visit/:id`, `/admin/annexure-1/:id` | ✓ | — | — | — | **Out of Sprint 12 scope** (Execution). Separate from JIH Web Portal compliance. Document distinction only. |
| **Campaign Record — jihRegistrations data** | `/rukn/campaign-record` | — | ✓ | — | ✓ | Service returns JIH data; page does not render it. Dead surface. |

### Screen Inventory Summary

| Verdict | Count |
| ------- | ----- |
| Keep (live) | 8 surfaces |
| Simplify | 8 |
| Merge | 6 |
| Remove | 5 (dead UI) |

**Constitution gaps (all live surfaces):**

- **Principle 5 (Next Action Guidance):** Dashboard cards show counts, not actionable pending lists.
- **Principle 6 (Automatic Navigation):** Card clicks do not pre-apply filters or open filtered compliance views.
- **Principle 7 (Single Source of Truth):** Two JIH registration concepts; duplicate Card/Modal vs Profile implementations.
- **Principle 8 (Minimal Cognitive Load):** Compliance split across Dashboard, filters, profile, and unused modals.

---

## 3. Field Inventory

### 3.1 Weekly Ijtema

| Field | Current Control | Better Control | Classification | Reason |
| ----- | --------------- | -------------- | -------------- | ------ |
| Attendance Status | Checkbox on profile (Present/Absent only) | **Radio group** (Present / Absent / Informed) or tri-state segmented control | **Essential** | Three valid states; checkbox loses Informed |
| Attendance Status | Dropdown in Edit Modal (unused) | Radio group | **Essential** | Correct control; modal unused |
| Attendance Status | Bulk bar buttons | Keep buttons | **Essential** | Fast admin path; constitution-aligned |
| Week | Filter dropdown (current + 12 past) | Keep dropdown; default current week | **Essential** | Needed for historical review |
| Remarks | Textarea (modal/bulk) | Optional textarea | **Optional** | Rarely needed for pilot |
| Last Updated | Display only in Card (unused) | Remove from V1 or derive | **Remove** | Admin does not need audit trail in V1 |

### 3.2 JIH Web Portal Registration

| Field | Current Control | Better Control | Classification | Reason |
| ----- | --------------- | -------------- | -------------- | ------ |
| Registration Status | Checkbox on profile | **Checkbox or toggle** | **Essential** | Binary Registered / Not Registered is sufficient for V1 |
| Registration Status | Dropdown in Edit Modal (unused) | Checkbox | **Essential** | Modal over-engineered for V1 |
| Registration Number | Text input (modal only) | Remove from V1 or optional collapsed field | **Remove** | Not used in live UI; adds typing |
| Registration Date | Date input (modal) / auto today on profile | **Auto today** when marking Registered | **Essential** | Smart default already on profile save |
| Registration Remarks | Textarea (modal) | Remove from V1 | **Remove** | Optional admin note; low pilot value |

### 3.3 JIH Monthly Reporting

| Field | Current Control | Better Control | Classification | Reason |
| ----- | --------------- | -------------- | -------------- | ------ |
| Reporting Status | Checkbox on profile | **Checkbox** (only if Registered) | **Essential** | Progressive: hide until registered |
| Reporting Status | Dropdown in Edit Modal (unused) | Checkbox | **Essential** | |
| Submission Date | Date input (modal) / auto today on profile | **Auto today** when marking Submitted | **Essential** | Smart default on profile |
| Reporting Remarks | Textarea (modal) | Remove from V1 | **Remove** | |

### 3.4 Monthly Bait-ul-Maal

| Field | Current Control | Better Control | Classification | Reason |
| ----- | --------------- | -------------- | -------------- | ------ |
| Payment Status | Checkbox on profile | **Checkbox** | **Essential** | Paid / Pending sufficient for V1 |
| Payment Status | Dropdown in Edit Modal (unused) | Checkbox | **Essential** | |
| Payment Date | Date in bulk modal; auto today on profile | **Auto today** when Paid | **Essential** | Smart default exists |
| Amount | Number input (bulk/modal) | Optional number or remove | **Optional** | Useful for records; not required for compliance tracking |
| Month / Year | Filter dropdowns on Karkun list | Keep; default current month | **Essential** | Historical lookup |
| Remarks | Textarea (modal) | Remove from V1 | **Remove** | |

### 3.5 Annexure-1 — JIH App Registration (reference only, out of scope)

| Field | Current Control | Classification | Reason |
| ----- | --------------- | -------------- | ------ |
| `jihAppRegistrationStatus` | Dropdown (Not Discussed / Recommended / Registered) | **Essential** | Visit-level campaign field; separate from portal compliance |

---

## 4. Workflow Analysis

### 4.1 Weekly Ijtema

**Current Workflow**

```text
Admin opens Dashboard
        ↓
Sees Present / Absent / Informed counts
        ↓
Clicks card → /admin/karkun (no filter applied)
        ↓
Opens Advanced Filters → Attendance + Week
        ↓
Selects Karkuns → Bulk Mark Present / Absent / Informed
        OR
Opens Karkun Profile → toggles "Weekly Ijtema" checkbox → Save
```

**Pain Points**

1. Dashboard counts do not include Karkuns with no attendance record (undercount vs Bait-ul-Maal).
2. Card navigation does not pre-filter to the clicked status.
3. Profile checkbox maps Present+Informed → checked, but save writes only Present or Absent (**Informed lost**).
4. Rich Edit Modal with three-state dropdown exists but is unused.
5. No "pending attendance" concept — admin must know who lacks a record.

**Recommended Workflow**

```text
Admin opens Compliance (or Dashboard pending card)
        ↓
System shows: "12 Karkuns — attendance not recorded this week"
        ↓
Admin selects all → Mark Present / Absent / Informed (bulk)
        OR
Opens single Karkun → tri-state attendance → auto-save or return to list
        ↓
Dashboard counts update automatically (derived from actions)
```

**Expected User Experience**

- One tap from dashboard to **filtered pending list**.
- Three-state attendance without losing Informed.
- Current week pre-selected everywhere.
- "You're all caught up" when all Karkuns have attendance recorded.

---

### 4.2 JIH Portal Registration

**Current Workflow**

```text
Karkun created → default Not Registered (lazy ensureRegistration)
        ↓
Admin filters Karkun list by Portal Registration
        OR
Opens Profile → toggles "JIH Portal Registered" → Save
        ↓
Dashboard Registered / Not Registered counts update
```

**Pain Points**

1. No bulk registration update (unlike Ijtema and Bait-ul-Maal).
2. Dashboard links to unfiltered Karkun list.
3. Registration and monthly reporting toggles on same profile form as people data.
4. Unused Edit Modal supports registration number and remarks — dead complexity.

**Recommended Workflow**

```text
Admin opens Compliance → "8 Karkuns not registered on portal"
        ↓
Filtered list → bulk "Mark Registered" (date auto-filled)
        OR
Single Karkun toggle → immediate save
        ↓
If Registered → show monthly reporting status inline
```

**Expected User Experience**

- Registration is a one-click bulk action for common campaign drives.
- Monthly reporting section appears only after registration (progressive disclosure).
- No typing unless registration number becomes a Version 2 requirement.

---

### 4.3 Monthly Reporting (JIH Web Portal)

**Current Workflow**

```text
Admin marks Karkun Registered on profile
        ↓
Toggles "Monthly Report Submitted" → Save (auto-sets today)
        OR
Filters Karkun list by Reporting Status
        ↓
Dashboard Pending/Submitted counts (registered Karkuns only)
        ↓
Dashboard "Pending Reports" card links to /admin/execution?section=reports ← WRONG DOMAIN
```

**Pain Points**

1. **Critical:** Monthly reporting dashboard cards link to Annexure-1 execution reports, not JIH portal compliance.
2. No bulk "Mark Submitted" for registered Karkuns.
3. Conflation of "portal monthly report" with "Annexure-1 submission" in navigation.
4. Checking monthly report auto-checks registration (good); unchecking registration clears monthly (good).

**Recommended Workflow**

```text
Admin opens Compliance → "5 registered Karkuns — report pending this month"
        ↓
Filtered list → bulk "Mark Submitted" (date auto today)
        ↓
Dashboard links to same filtered Compliance view (not Execution)
```

**Expected User Experience**

- Clear separation: **Portal monthly report** ≠ **Annexure-1 visit report**.
- Pending list drives action; dashboard is entry point only.

---

### 4.4 Monthly Bait-ul-Maal

**Current Workflow**

```text
Default Pending for all Karkuns (implicit)
        ↓
Admin filters by Payment Status / Month / Year
        OR
Bulk Mark Paid (date required, amount optional) / Mark Pending
        OR
Profile checkbox "Bait-ul-Maal Paid" → Save
        ↓
Dashboard Paid / Pending counts update
```

**Pain Points**

1. Dashboard links to unfiltered Karkun list.
2. Bulk Paid requires payment date entry (could default today).
3. Profile + bulk + unused modal = three paths to same outcome.
4. Amount field optional but adds typing in bulk modal.

**Recommended Workflow**

```text
Admin opens Compliance → "20 Karkuns — payment pending this month"
        ↓
Bulk Mark Paid (date defaults today, amount hidden unless expanded)
        OR
Profile toggle for exceptions
```

**Expected User Experience**

- Fastest path: select all pending → Mark Paid → done.
- Month defaults to current; filters available for history.

---

## 5. Workflow Automation Findings

Evaluated against the [Workflow Automation Constitution](../architecture/workflow-automation-constitution.md).

| Principle | Compliance Status | Finding | Recommendation |
| --------- | ----------------- | ------- | -------------- |
| **1. Event-Driven Workflow** | Partial | Status updates on save/toggle are event-driven. No workflow engine needed. | Keep. Ensure all status changes flow through services only. |
| **2. Derived Status** | Violated (Ijtema) | Profile checkbox derives Present/Absent incorrectly from Informed. | Fix tri-state mapping. Default unrecorded → show as "Pending attendance" not absent. |
| **3. Progressive Workflow** | Partial | JIH monthly hidden until registered (profile logic). Edit Modal does this correctly but is unused. | Apply progressive pattern to live UI; hide monthly toggle until registered. |
| **4. Smart Defaults** | Partial | Today auto-filled for dates on profile save and bulk Bait-ul-Maal. Week/month default in services. | Extend: default payment date in bulk; default current week/month in all views. |
| **5. Next Action Guidance** | **Violated** | Dashboard shows counts without "what to do next." | Add pending compliance lists or actionable empty states per domain. |
| **6. Automatic Navigation** | **Violated** | Card links go to generic pages. JIH reporting links to Execution. | Deep-link with query params: `/admin/karkun?jihPortalReporting=Pending` or new Compliance route. |
| **7. Single Source of Truth** | **Violated** | Dual JIH concepts; duplicate Card/Modal vs Profile; unused summary APIs. | One compliance UI path; rename/clarify JIH App vs JIH Portal in UI labels. |
| **8. Minimal Cognitive Load** | **Violated** | 7 compliance filters buried; 3 dashboard sections + profile toggles + bulk bar. | Unified Compliance workspace; remove dead components. |
| **9. Version 1 Boundaries** | Compliant | In-memory stores, no Firebase/schedulers. | Maintain. |
| **10. Future Ready** | Good | Service/store separation supports Firebase later. | Keep service boundaries; add Compliance route shell for V2. |

### Automation Opportunities (V1-safe)

| Opportunity | Domain | Priority |
| ----------- | ------ | -------- |
| Pre-filtered navigation from dashboard cards | All | Must Do |
| Bulk JIH registration + monthly submit | JIH Portal | Must Do |
| Tri-state Ijtema on profile (or inline quick action) | Ijtema | Must Do |
| Default unrecorded Ijtema to "pending" in metrics | Ijtema | Must Do |
| Auto today for bulk Bait-ul-Maal payment date | Bait-ul-Maal | Should Do |
| Remove unused Edit Modals and Cards | All | Should Do |
| Sync JIH App registration from Annexure-1 to portal suggestion (read-only hint) | JIH | Version 2 |
| Compliance pending list on Dashboard | All | Must Do |

### Manual Patterns to Eliminate

| Pattern | Location | Replace With |
| ------- | -------- | -------------- |
| Manual filter setup after dashboard click | All metric cards | Query-param deep links |
| Binary Ijtema checkbox | Karkun Profile | Tri-state or bulk-only with profile read-only summary |
| Separate save for compliance on profile | Karkun Profile | Inline compliance save or dedicated compliance panel |
| Choosing Execution Reports for portal reporting | JIH dashboard cards | Compliance filtered list |

---

## 6. Mobile UX Findings

| Screen / Surface | Issue | Severity | Recommendation |
| ---------------- | ----- | -------- | -------------- |
| **PeopleFiltersBar** | 7 compliance filters inside collapsed Advanced Filters | High | Compliance quick-filter chips above table or dedicated Compliance mobile view |
| **BulkActionsBar** | Up to 10 buttons wrap on narrow screens | High | Group compliance bulk actions in overflow menu "Compliance ▼" |
| **Karkun Profile** | Single long form: people + 4 compliance toggles | Medium | Separate Compliance section with sticky save or auto-save per toggle |
| **Dashboard metric cards** | 9 compliance cards across 3 sections on Admin Home | Medium | Single "Compliance Today" collapsible panel with 3–4 actionable rows |
| **Bulk modals** | Payment date + amount typing on mobile | Low | Default date; hide amount behind "Add amount (optional)" |
| **Karkun table** | No compliance columns — must open profile to see status | High | Add compact status badges (Ijtema / JIH / Bait-ul-Maal) or swipe action |
| **Touch targets** | Secondary bulk buttons adequate size | Low | Keep; improve grouping not size |
| **Rukn portal** | No compliance screens | N/A | Out of scope for Sprint 12 admin compliance |

---

## 7. Dashboard Review

**Current state:** Admin Home (`AdminHomePage`) renders three separate compliance sections among 9+ total sections:

1. `CommandCenterJihWebPortalMetrics` — 4 cards
2. `CommandCenterBaitulMaalMetrics` — 2 cards
3. `CommandCenterIjtemaAttendanceMetrics` — 3 cards

**Total: 9 compliance metric cards** plus unrelated sections (People, Assignments, Execution, Quick Actions, Activity).

### Issues

| Issue | Detail |
| ----- | ------ |
| **Duplicate entry points** | Same Karkun list reachable from 6 different cards without filter context |
| **Non-actionable metrics** | Counts without pending lists or primary CTA |
| **Wrong domain link** | JIH Pending/Submitted Reports → Execution Reports (Annexure-1) |
| **Decorative grouping** | Three separate section headers for what is one compliance domain |
| **Mixed concerns** | Compliance cards interleaved with People stats and Execution summary |
| **Unused mock** | `MOCK_NEEDS_ATTENTION.pendingJihRegistrations` and `NeedsAttentionPanel` never rendered |

### Recommended Dashboard (Sprint 12)

Replace three sections with one **Compliance Today** panel:

```text
Compliance Today
├── Ijtema: 4 attendance not recorded        → filtered list
├── JIH Portal: 8 not registered             → filtered list
├── JIH Reports: 5 pending (registered)      → filtered list
└── Bait-ul-Maal: 12 payment pending         → filtered list
```

Keep detailed breakdown available inside unified Compliance workspace. Command Center should answer **"What compliance action is pending today?"** in one glance.

---

## 8. Technical Cleanup

### 8.1 Duplicate / Dead Components

| File | Status | Recommendation |
| ---- | ------ | -------------- |
| `components/forms/compliance/ComplianceSection.tsx` | Unused | Remove (Should Do) |
| `components/forms/compliance/ComplianceProfileField.tsx` | Unused (except dead Cards) | Remove with Cards (Should Do) |
| `components/forms/jih/JihWebPortalCard.tsx` | Unused | Remove or wire to Compliance workspace (Should Do) |
| `components/forms/jih/JihWebPortalEditModal.tsx` | Unused | Remove or merge fields into live UI (Should Do) |
| `components/forms/baitulMaal/BaitulMaalCard.tsx` | Unused | Remove (Should Do) |
| `components/forms/baitulMaal/BaitulMaalEditModal.tsx` | Unused | Remove (Should Do) |
| `components/forms/ijtema/IjtemaAttendanceCard.tsx` | Unused | Remove (Should Do) |
| `components/forms/ijtema/IjtemaAttendanceEditModal.tsx` | Unused | Remove (Should Do) |
| `components/dashboard/NeedsAttentionPanel.tsx` | Unused | Remove or replace with Compliance Today (Should Do) |
| `modules/jih/index.ts`, `workflows/jih/index.ts` | Empty stubs | Remove or document as V2 placeholders (Should Do) |

### 8.2 Dead API Surface

| Symbol | Location | Recommendation |
| ------ | -------- | -------------- |
| `getAllJihWebPortalSummaries()` | jihWebPortalService | Wire to Compliance list or remove |
| `getAllBaitulMaalSummaries()` | baitulMaalService | Wire to Compliance list or remove |
| `getAllIjtemaAttendanceSummaries()` | ijtemaAttendanceService | Wire to Compliance list or remove |
| `ensureIjtemaAttendanceRecord()` | ijtemaAttendanceService | Implement or rename (no-op is misleading) |
| `clear*Store`, `reset*ComplianceInitialization` | stores | Remove if unused |
| `adminDashboardStats`, `MOCK_NEEDS_ATTENTION` | constants | Remove if unused |
| `canMarkMonthlySubmitted`, `isRegisteredStatus` | validation | Remove if unused |

### 8.3 Service Architecture (keep)

| Domain | Service | Store | Status |
| ------ | ------- | ----- | ------ |
| Weekly Ijtema | `ijtemaAttendanceService.ts` | `ijtemaAttendanceStore.ts` | Keep — single source of truth |
| JIH Web Portal | `jihWebPortalService.ts` | `jihWebPortalStore.ts` | Keep |
| Bait-ul-Maal | `baitulMaalService.ts` | `baitulMaalStore.ts` | Keep |

**Recommendation:** Add thin `complianceDashboardService.ts` in Phase 1 that aggregates pending counts from the three services — do not duplicate business logic.

### 8.4 Known Bugs

| Bug | Severity | Phase |
| --- | -------- | ----- |
| Ijtema profile save loses "Informed" status | High | Phase 2 |
| JIH reporting dashboard links to Execution Reports | High | Phase 1 |
| Ijtema metrics exclude Karkuns without records | Medium | Phase 2 |
| `getCampaignRecordData().jihRegistrations` not rendered | Low | Phase 3 or Remove |

---

## 9. Pilot Readiness Assessment

### Must Do (Version 1)

| # | Item | Rationale |
| - | ---- | --------- |
| 1 | Fix JIH monthly reporting dashboard links (wrong domain) | Pilot-blocking confusion |
| 2 | Add pre-filtered deep links from dashboard cards to Karkun list (or Compliance view) | Constitution: automatic navigation |
| 3 | Fix Ijtema Informed status loss on profile save | Data integrity |
| 4 | Unified Compliance entry (route or dashboard panel) answering "pending today" | Core sprint theme |
| 5 | Add bulk JIH registration and monthly report actions | Reduce admin effort |
| 6 | Align Ijtema metrics with Bait-ul-Maal (include unrecorded as pending) | Accurate dashboard |
| 7 | Clarify UI labels: JIH App (Annexure-1) vs JIH Web Portal (compliance) | Prevent operator error |

### Should Do

| # | Item | Rationale |
| - | ---- | --------- |
| 8 | Remove dead Card/Modal/Compliance wrapper components | Technical debt |
| 9 | Progressive disclosure on profile: monthly report only if registered | Constitution |
| 10 | Compliance status badges on Karkun table | Next-action visibility |
| 11 | Group bulk compliance actions in mobile-friendly menu | Mobile UX |
| 12 | Replace three dashboard sections with one Compliance Today panel | Cognitive load |
| 13 | Default bulk Bait-ul-Maal payment date to today | Smart defaults |
| 14 | Tri-state Ijtema control on profile (radio, not checkbox) | Derived status |

### Version 2

| # | Item |
| - | ---- |
| 15 | Firebase persistence for compliance stores |
| 16 | Notifications / scheduled reminders for pending compliance |
| 17 | Registration number and remarks fields |
| 18 | Compliance export / PDF reports |
| 19 | Rukn-facing compliance (if ever required) |
| 20 | Auto-sync JIH App registration from Annexure-1 to portal compliance suggestion |
| 21 | Multi-month historical compliance analytics |
| 22 | `NeedsAttentionPanel` with live data and push-style alerts |

---

## 10. Recommended Sprint 12 Implementation Plan

**Prerequisite:** Phase 0 audit approved (this document).

| Phase | Name | Scope | Key Deliverables |
| ----- | ---- | ----- | ---------------- |
| **0** | Workflow & UX Audit | Analysis only | This document ✓ |
| **1** | Compliance Navigation & Domain Fix | Must Do | Unified Compliance Today panel; fix JIH reporting links; deep-link query params; optional `/admin/compliance` route shell |
| **2** | Workflow Automation | Must Do | Ijtema Informed fix; pending metrics; bulk JIH actions; smart defaults |
| **3** | UI Consolidation & Cleanup | Should Do | Remove dead Card/Modal components; compliance badges on Karkun table; progressive profile toggles |
| **4** | Mobile UX Polish | Should Do | Bulk action grouping; filter chips; reduced scrolling on compliance surfaces |
| **5** | Pilot Validation | Must Do | End-to-end compliance workflows; regression on Execution/People (unchanged); build/lint/deploy |

### Phase Dependencies

```text
Phase 0 (Audit) ──approved──► Phase 1 (Navigation)
                                      ↓
                               Phase 2 (Automation)
                                      ↓
                               Phase 3 (Cleanup) ── parallel ── Phase 4 (Mobile)
                                      ↓
                               Phase 5 (Validation)
```

### Out of Scope (unchanged from constraints)

- People Management, Assignment Engine, Execution Module, Campaign, Auth, Settings, Help
- Firebase, backend, notifications, new compliance modules

---

## Appendix A — Files Reviewed

### Services & Stores

- `src/services/ijtemaAttendanceService.ts`
- `src/services/jihWebPortalService.ts`
- `src/services/baitulMaalService.ts`
- `src/stores/ijtemaAttendanceStore.ts`
- `src/stores/jihWebPortalStore.ts`
- `src/stores/baitulMaalStore.ts`

### Pages

- `src/pages/admin/AdminHomePage.tsx`
- `src/pages/admin/KarkunanPage.tsx`
- `src/pages/admin/KarkunProfilePage.tsx`

### Dashboard Components

- `src/components/dashboard/CommandCenterJihWebPortalMetrics.tsx`
- `src/components/dashboard/CommandCenterBaitulMaalMetrics.tsx`
- `src/components/dashboard/CommandCenterIjtemaAttendanceMetrics.tsx`
- `src/components/dashboard/NeedsAttentionPanel.tsx`

### Forms & Compliance UI

- `src/components/forms/people/PeopleFiltersBar.tsx`
- `src/components/forms/people/BulkActionsBar.tsx`
- `src/components/forms/compliance/*`
- `src/components/forms/ijtema/*`
- `src/components/forms/jih/*`
- `src/components/forms/baitulMaal/*`

### Types & Validation

- `src/types/ijtemaAttendance.ts`
- `src/types/jihWebPortal.ts`
- `src/types/baitulMaal.ts`
- `src/types/people.types.ts`
- `src/validation/*`

---

## Appendix B — Constitution Compliance Checklist

| Screen | P1 Event | P2 Derived | P3 Progressive | P4 Defaults | P5 Next Action | P6 Nav | P7 SSOT | P8 Load |
| ------ | -------- | ---------- | -------------- | ----------- | -------------- | ------ | ------- | ------- |
| JIH Dashboard Cards | ✓ | ✓ | — | — | ✗ | ✗ | ✗ | ✗ |
| Bait-ul-Maal Dashboard | ✓ | ✓ | — | partial | ✗ | ✗ | ✓ | ✗ |
| Ijtema Dashboard | ✓ | ✗ | — | partial | ✗ | ✗ | ✓ | ✗ |
| Karkun Filters | — | — | — | partial | ✗ | — | ✓ | ✗ |
| Karkun Profile Toggles | ✓ | ✗ | partial | ✓ | ✗ | partial | ✗ | ✗ |
| Bulk Actions | ✓ | ✓ | — | partial | ✓ | — | ✓ | ✗ |

**Legend:** ✓ compliant · ✗ violation · partial · — not applicable

---

*End of Sprint 12 Phase 0 Audit Report*
