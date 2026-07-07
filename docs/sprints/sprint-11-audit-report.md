# Sprint 11 Audit Report — Execution Module Workflow & UX

**Sprint theme:** Simplify Execution. Reduce Effort. Eliminate Unnecessary Complexity.

**Phase:** 0 — Workflow & UX Audit (analysis only, no application changes)

**Date:** July 2026

**Status:** Ready for review and approval before Phase 1 implementation

---

## 1. Executive Summary

The Execution Module is a **functional in-memory MVP** centered on Annexure-1. A Rukn or Administrator can assign a Karkun, open Annexure-1, submit visit outcomes, optionally create a follow-up, and view results across admin dashboards and a Rukn campaign record. Core business logic exists and works end-to-end within a browser session.

However, the module carries **execution friction** that will slow the Basavakalyan pilot:

| Category | Finding |
| -------- | ------- |
| **Form speed** | Annexure-1 has 11 editable fields across 7 sections; 4 require free-text input. Worker info duplicates the header. |
| **Workflow gaps** | Execution and Follow-up lists are read-only — no deep links to open Annexure-1 or complete follow-ups. Draft save exists but cannot be resumed. |
| **Status confusion** | Five karkun visit statuses, two follow-up statuses, and two form statuses with no unified execution model. |
| **Reports scope creep** | Review & Reports bundles compliance tables (JIH Portal, Bait-ul-Maal, Ijtema) unrelated to daily execution. |
| **Mobile readiness** | Form has large radio targets and sticky actions, but 7 stacked cards require heavy scrolling. |
| **Technical debt** | Mock timeline data, stub export buttons, unused helpers, duplicate list rendering across 4 pages. |

**Recommendation:** Proceed with Sprint 11 Phases 1–9 sequentially. Prioritize **form simplification (Phase 1)**, **workflow connectivity (Phase 2)**, and **follow-up actions (Phase 3)** as Must Do for pilot readiness. Defer analytics, compliance report sections, export, and backend persistence to Version 2.

**Estimated impact:** Annexure-1 completion time can be reduced by ~40% by removing duplicate sections, converting text fields to dropdowns, and defaulting follow-up to "No."

---

## 2. Screen Inventory

### Primary Execution Screens

| Screen | Route | Keep | Simplify | Remove | Remarks |
| ------ | ----- | ---- | -------- | ------ | ------- |
| **Annexure-1 Form** | `/rukn/visit/:karkunId`, `/admin/annexure-1/:karkunId` | ✓ | ✓ | — | Core execution screen. Merge duplicate karkun info; reduce sections. |
| **Submission Success** | Inline after submit | ✓ | ✓ | — | Useful confirmation. Trim summary fields; admin context needs different back link. |
| **Execution Dashboard** | `/admin/execution` | ✓ | ✓ | — | 4 tab sections. Merge Today's Meetings + Pending Annexure-1; add action links. |
| **Follow-up Workspace** | `/admin/follow-up` | ✓ | ✓ | — | 3 tab sections. Add "Open Annexure-1" and "Mark Complete" actions. |
| **Review & Reports** | `/admin/review` | ✓ | ✓ | Partial | Keep execution metrics + Annexure-1 list. Move compliance tables out of execution scope. |
| **Campaign Record (Rukn)** | `/rukn/campaign-record` | ✓ | ✓ | — | 5 sections with heavy duplication. Collapse to 2 sections: Recent Submissions + Pending Follow-ups. |
| **Today's Work widget** | Admin Command Center | ✓ | — | — | Good entry point. Links to Execution/Follow-up sections work. |

### Entry Points (not standalone screens)

| Entry Point | Location | Keep | Simplify | Remove | Remarks |
| ----------- | -------- | ---- | -------- | ------ | ------- |
| **My Karkun Card** | `/rukn/my-karkun` | ✓ | ✓ | — | Primary Rukn entry. Surface next follow-up date. |
| **Assignment Management** | `/admin/assignments` | ✓ | — | — | "Open Annexure-1" link works. Out of sprint scope unless dependency found. |
| **Rukn Mission Panels** | `/rukn` home | ✓ | ✓ | — | Links to visit form. Mission queue is mock-driven. |

### Placeholder / Not Built

| Screen | Route | Keep | Simplify | Remove | Remarks |
| ------ | ----- | ---- | -------- | ------ | ------- |
| Rukn Tasks | `/rukn/tasks` | — | — | ✓ (V2) | Placeholder only. |
| Rukn Visits | `/rukn/visits` | — | — | ✓ (V2) | Placeholder only. |
| Rukn Reports | `/rukn/reports` | — | — | ✓ (V2) | Placeholder only. |
| Daily Progress Timeline | Execution tab | — | — | ✓ (V1) | Uses `MOCK_DAILY_PROGRESS_TIMELINE` — not real data. Remove or replace in Phase 8. |

### Merge Opportunities

1. **Execution Dashboard:** "Today's Meetings" and "Pending Annexure-1" overlap significantly — both list active assignments without today's/all-time submission. Merge into a single **Pending Execution** view with status badges.
2. **Campaign Record:** "Annexure-1 Submissions" and "Execution History" are derived from the same data — merge into one list.
3. **Review & Reports:** JIH Portal, Bait-ul-Maal, and Ijtema compliance tables belong in Compliance module, not Execution Reports.

---

## 3. Field Inventory — Annexure-1

Source: `Annexure1FormState` in `src/types/annexure1.types.ts`

### Editable Fields

| Field | Current Control | Recommended Control | Classification | Reason |
| ----- | --------------- | ------------------- | -------------- | ------ |
| `visitDate` | Date input | Date input (default today) | **Essential** | Required for every submission. Auto-fill today. |
| `visitConducted` | Large radio (Yes/No) | Large radio (Yes/No) | **Essential** | Primary workflow gate. Already optimal. |
| `notConductedReason` | Free text | **Dropdown** + optional "Other" text | **Essential (when No)** | Common reasons are predictable (Absent, Refused, Rescheduled, Wrong Address). Dropdown is faster. |
| `discussionSummary` | Textarea (4 rows) | Textarea (2 rows) or structured checklist + short text | **Essential (when Yes)** | Required for conducted visits. Keep but reduce rows; consider preset topics in V2. |
| `commitmentMade` | Checkbox (52px touch) | Checkbox | **Optional** | Not every visit has a commitment. Keep collapsed by default. |
| `commitmentDetails` | Free text | Free text (conditional) | **Optional** | Only when commitment checked. Keep. |
| `jihAppRegistrationStatus` | Dropdown (3 options) | Dropdown or radio pills | **Essential** | Campaign compliance field. Already optimal control type. Default to existing karkun status. |
| `followUpRequired` | Large radio (Yes/No) | Large radio; **default No** | **Essential (when Yes visit)** | Most visits need no follow-up. Default to No to reduce taps. |
| `followUpDate` | Date input | Date input (default tomorrow or +7 days) | **Essential (when follow-up yes)** | Required. Smart default reduces typing. |
| `followUpPurpose` | Free text | **Dropdown** + optional "Other" | **Essential (when follow-up yes)** | Purposes are predictable (Ijtema reminder, Commitment check, Registration follow-up, Revisit). |
| `followUpRemarks` | Textarea (3 rows) | — | **Remove from V1** | CRM-style notes. Purpose field is sufficient for execution. |

### Read-Only Context Fields (display only)

| Field | Shown In | Classification | Reason |
| ----- | -------- | -------------- | ------ |
| Karkun name | Header + WorkerInfoSection | **Essential** | Keep in header only — **remove WorkerInfoSection duplicate**. |
| Assignment number | Header | **Essential** | Execution reference. |
| Assigned area | Header + WorkerInfoSection | **Simplify** | Show once in header. Remove from WorkerInfoSection. |
| Assigned Rukn | Header | **Essential** | Context for admin review. |
| Campaign name | Header | **Optional** | Single campaign in V1 — can hide to save space. |
| Visit status (registry) | Header | **Optional** | Derived status — useful for admin, not for Rukn during form fill. |
| Mobile | WorkerInfoSection only | **Optional** | Useful for call-before-visit but not required on form. Move to header as tap-to-call link or remove. |
| Address | WorkerInfoSection only | **Remove from V1 form** | Not needed during meeting documentation. Available in People Management. |

### Field Count Summary

| Category | Current | Proposed V1 |
| -------- | ------- | ----------- |
| Essential editable | 8 | 7 |
| Optional editable | 2 | 2 |
| Remove | 1 | 1 (`followUpRemarks`) |
| Duplicate read-only sections | 1 (WorkerInfoSection) | 0 |
| **Max visible sections (conducted=Yes)** | 7 cards | 5 cards |

---

## 4. Workflow Analysis

### Current Execution Journey

```
Administrator assigns Karkun to Rukn
        ↓
Rukn sees Karkun on My Karkun / Mission queue
        ↓
Rukn opens Annexure-1 (/rukn/visit/:karkunId)
        ↓
Visit Conducted?
   ├─ No  → Enter reason → Submit (no draft option)
   └─ Yes → Worker Info (duplicate) → Summary → Commitment → JIH → Follow-up → Submit/Draft
        ↓
On submit:
   • Record stored (in-memory)
   • Karkun registry updated (visit, commitment, JIH status)
   • Pending follow-ups auto-completed for assignment
   • New follow-up created if required
   • Audit log + activity log
   • Mission queue advanced (mock)
        ↓
Success card → Return to Mission / Campaign Record
        ↓
Administrator views Execution Dashboard (read-only lists)
        ↓
Follow-up appears in Follow-up workspace (read-only)
        ↓
Follow-up completes only when new Annexure-1 submitted for same assignment
        ↓
Reports updated on Review & Reports + Campaign Record
```

### Admin Parallel Path

```
Administrator → Assignments → Open Annexure-1 (/admin/annexure-1/:karkunId)
Same form, back link goes to Assignments instead of Rukn home.
```

### Proposed Simplified Workflow

```
Assign Karkun (existing — no change)
        ↓
Open Annexure-1 (from My Karkun, Execution list, or Follow-up list)
        ↓
Visit Conducted? [default: unset]
   ├─ No  → Reason dropdown → Submit
   └─ Yes → Summary → JIH status → Commitment (optional) → Follow-up [default: No]
        ↓
Submit → Success → Next Karkun (optional) or Return
        ↓
If follow-up required → appears in Follow-up list with action to reopen Annexure-1
        ↓
Mark follow-up complete OR submit new Annexure-1
        ↓
Status: Completed
```

### Workflow Issues Identified

| Issue | Severity | Phase |
| ----- | -------- | ----- |
| Execution lists have no action buttons | **High** | Phase 2 |
| Follow-up lists have no complete/open actions | **High** | Phase 2–3 |
| Draft saved but never loaded on return | **Medium** | Phase 5 |
| Duplicate submission not prevented (`hasSubmittedAnnexureForAssignment` unused) | **Medium** | Phase 2 |
| `getNextFollowUpForKarkun` built but not shown on My Karkun card | **Medium** | Phase 3 |
| WorkerInfoSection duplicates header | **Low** | Phase 1 |
| Success card always links to Rukn routes (broken for admin context) | **Medium** | Phase 2 |
| JIH Portal sync flag passed but not implemented in registry update | **Low** | Phase 5 (if in scope) |
| No "next pending karkun" after submit | **Low** | Phase 2 (Should Do) |

---

## 5. Mobile UX Findings

Reviewed: Annexure-1 form, Execution Dashboard, Follow-up page, Campaign Record, Submission Success.

| Screen | Issue | Recommendation | Priority |
| ------ | ----- | -------------- | -------- |
| **Annexure-1** | 7 stacked section cards = excessive scroll | Remove WorkerInfoSection; collapse Commitment behind checkbox (already done); merge JIH into summary section | Must Do |
| **Annexure-1** | Sticky action bar at `bottom-20` may conflict with mobile nav | Test against Rukn layout bottom nav; adjust to `bottom-0` with safe-area padding | Should Do |
| **Annexure-1** | Large radio options (52px) | Good — preserve | Keep |
| **Annexure-1** | Date inputs small on iOS | Ensure `text-base` (16px) on all inputs to prevent zoom | Should Do |
| **Annexure-1** | Textarea discussion summary 4 rows | Reduce to 2 rows; expand on focus | Should Do |
| **Execution Dashboard** | List items not tappable | Make entire row a link to Annexure-1 | Must Do |
| **Follow-up** | List items not tappable | Add actions: Open Annexure-1, Mark Complete | Must Do |
| **Campaign Record** | 5 sections, long scroll | Collapse to accordion or 2 sections | Should Do |
| **Review & Reports** | Wide compliance tables overflow | Move out of execution scope; remaining lists are mobile-friendly | Can Wait |
| **Submission Success** | Full-width buttons good | Admin back link missing | Should Do |

### Mobile Field Order (Recommended)

1. Visit Date + Conducted? (gate)
2. If No → Reason dropdown → Submit
3. If Yes → Discussion Summary
4. JIH Registration (dropdown)
5. Commitment (checkbox, collapsed)
6. Follow-up (default No)
7. Submit / Save Draft

---

## 6. UI Simplification Recommendations

| Location | Issue | Recommendation | Priority |
| -------- | ----- | -------------- | -------- |
| `VisitFormHeader` | Shows 5 metadata fields including campaign name | Show name, assignment #, Rukn only. Hide campaign name in V1. | Should Do |
| `WorkerInfoSection` | Duplicates header + adds mobile/address | Remove entire section | Must Do |
| `FormSectionCard` | Each section is a full card with shadow | Consider flat sections with dividers for shorter form | Should Do |
| `ExecutionModulePage` | 4 tabs, 2 overlap | Merge meetings + reports tabs | Should Do |
| `ExecutionModulePage` | Daily Progress Timeline is mock | Remove tab in V1 | Must Do |
| `FollowUpDevelopmentModulePage` | Page title "Follow-up & Development" | Rename nav to "Follow-up" (drop "& Development") | Should Do |
| `CampaignRecordPage` | 5 near-identical list sections | Merge submissions + history; show commitments inline | Should Do |
| `ReviewReportsModulePage` | Campaign Health score + 5 performance metrics | Reduce to 3 counts: Pending, Completed, Follow-up Required | Must Do |
| `ReviewReportsModulePage` | 3 compliance tables | Remove from execution reports (Compliance module) | Must Do |
| `ReviewReportsModulePage` | Export PDF/Excel stubs | Hide until implemented | Must Do |
| `SubmissionSuccessCard` | 7-field summary after submit | Show assignment #, karkun, follow-up status only | Should Do |

---

## 7. Smart Default Opportunities

| Field / Context | Current Default | Recommended Default | Phase |
| --------------- | --------------- | ------------------- | ----- |
| `visitDate` | Today | Today (keep) | 5 |
| `jihAppRegistrationStatus` | `'Not Discussed'` | Existing karkun registry value (partial — already passed as initial) | 5 |
| `followUpRequired` | Empty (must select) | `'no'` | 1 + 5 |
| `followUpDate` | Empty | Tomorrow or +7 days when follow-up toggled to Yes | 5 |
| `followUpPurpose` | Empty | Pre-select most common purpose when dropdown added | 1 + 5 |
| Karkun name, Rukn, assignment # | Shown in header | Keep read-only (already done) | 5 |
| Draft resume | Not implemented | Load latest draft for karkun+assignment on form open | 5 |
| `notConductedReason` | Empty | No default (user must pick from dropdown) | 1 |

---

## 8. Execution Status Proposal

### Current Status Models (fragmented)

| Domain | Values | Location |
| ------ | ------ | -------- |
| Karkun visit | `scheduled`, `completed`, `pending`, `overdue`, `none` | `KarkunVisitStatus` |
| Follow-up | `Pending`, `Completed` | `FollowUpStatus` |
| Form submission | `draft`, `submitted` | `SubmittedMeetingForm.status` |
| Assignment | `Active`, `Replaced`, `Unassigned`, `Completed`, `Suspended` | Assignment module |

### Proposed Unified Execution Status (display layer)

Map derived status for lists and badges — **no store migration required**:

| Status | Meaning | Derived From |
| ------ | ------- | ------------ |
| **Pending** | Assigned, no Annexure-1 submitted | Active assignment + no submission |
| **In Progress** | Draft saved or visit started today | Draft exists OR submitted today |
| **Follow-up Required** | Pending follow-up exists | `getActiveFollowUpForKarkun` |
| **Completed** | Annexure-1 submitted, no pending follow-up | Submission exists + no pending follow-up |

### Deviations from Preferred Model

| Current | Recommendation |
| ------- | -------------- |
| `KarkunVisitStatus.overdue` | Map to **Pending** with visual urgency (red badge) — keep internally, simplify display |
| `KarkunVisitStatus.scheduled` | Map to **Pending** — rarely set in current flow |
| Form `draft` status | Map to **In Progress** |
| Follow-up `Completed` | Maps to **Completed** (follow-up dimension) |

### Implementation Approach

Create a display helper `getExecutionStatus(karkunId, assignmentId)` in Phase 4. Do not change underlying enums to avoid breaking People Management and assignment engine.

---

## 9. Reports Review

### Reports Required for Daily Execution (Must Do — V1)

| Report | Audience | Current Location | Action |
| ------ | -------- | ---------------- | ------ |
| Pending Annexure-1 count + list | Administrator | Execution Dashboard | Add action links |
| Today's pending meetings | Administrator | Execution Dashboard | Merge with above |
| Pending follow-ups | Administrator, Rukn | Follow-up page, Command Center | Add actions |
| Today's follow-ups | Administrator, Rukn | Follow-up page | Add actions |
| Submitted Annexure-1 list | Administrator | Execution + Review pages | Dedupe between pages |
| Rukn campaign record | Rukn | Campaign Record page | Simplify sections |

### Reports Useful but Simplifiable (Should Do — V1)

| Report | Action |
| ------ | ------ |
| Campaign Health overall score | Replace with 3 execution counts |
| Performance metrics (5 cards) | Reduce to: Submitted Today, Pending, Follow-up Required |
| Completed Annexure-1 list | Keep on Execution Dashboard only; remove duplicate from Review |

### Reports to Defer (Can Wait — V2)

| Report | Reason |
| ------ | ------ |
| JIH Web Portal Compliance table | Compliance module, not execution |
| Bait-ul-Maal Compliance table | Compliance module |
| Ijtema Attendance table | Compliance module |
| Export PDF / Excel | Stub buttons, no handler |
| Daily Progress Timeline | Mock data |
| Visit/Report/Meeting completion rate percentages | Analytics beyond execution needs |
| Campaign Health composite score | Derived analytics |

---

## 10. Technical Cleanup Recommendations

### Mock Data Still in Use

| Item | File | Action |
| ---- | ---- | ------ |
| `MOCK_DAILY_PROGRESS_TIMELINE` | `constants/mockCommandCenter.ts` | Remove from Execution page (Phase 7/8) |
| `completeVisitReportSubmission()` | `lib/mockMissionEngine.ts` | Keep for Rukn UX; document as mock |
| `DEMO_RUKN_PORTAL_ID` fallback | `WorkerMeetingFormPage.tsx` | Keep for demo; document |

### Dead / Unused Code

| Item | File | Action |
| ---- | ---- | ------ |
| `hasSubmittedAnnexureForAssignment()` | `stores/annexure1Store.ts` | Wire into validation (Phase 2) |
| `getNextFollowUpForKarkun()` | `services/followUpService.ts` | Surface on My Karkun card (Phase 3) |
| `updateFollowUpStatus()` | `stores/followUpStore.ts` | Wire to Follow-up UI (Phase 3) |
| `getLatestSubmissionForKarkun()` | `stores/annexure1Store.ts` | Use for draft resume (Phase 5) |
| `syncJihPortal: true` flag | `annexure1Service.ts` | Implement or remove flag (Phase 5) |

### Duplicate Components / Logic

| Duplication | Locations | Action |
| ----------- | --------- | ------ |
| Annexure-1 list rendering | ExecutionModulePage, ReviewReportsModulePage, CampaignRecordPage | Extract shared `Annexure1SubmissionList` component (Phase 7) |
| Follow-up list rendering | FollowUpDevelopmentModulePage, CampaignRecordPage | Extract shared `FollowUpList` with actions (Phase 3) |
| Section nav pattern | ExecutionModulePage, FollowUpDevelopmentModulePage | Extract shared `SectionTabNav` (Phase 7) |
| Campaign record aggregation | `getCampaignRecordData()` builds visitHistory identical to meetingForms | Remove visitHistory derivation (Phase 7) |

### Placeholder Implementations

| Item | Location | Action |
| ---- | -------- | ------ |
| Export PDF/Excel buttons | ReviewReportsModulePage | Hide in V1 |
| Empty module barrels | `src/modules/visits/`, `src/modules/reporting/` | No action in Sprint 11 |
| Rukn placeholder routes | AppRouter | No action in Sprint 11 |

### In-Memory Store Limitation

Annexure-1 and Follow-up data resets on page refresh. **Out of Sprint 11 scope** (no Firebase/backend per constraints). Document for pilot operators.

---

## 11. Prioritized Implementation Plan — Phases 1–9

### Phase 1 — Annexure-1 Simplification
**Commit:** `Sprint 11 Phase 1: Simplify Annexure-1 workflow`

| Priority | Task |
| -------- | ---- |
| Must Do | Remove `WorkerInfoSection` (duplicate info) |
| Must Do | Remove `followUpRemarks` field from form, types, validation, service |
| Must Do | Convert `notConductedReason` to dropdown with "Other" text fallback |
| Must Do | Convert `followUpPurpose` to dropdown with "Other" text fallback |
| Must Do | Default `followUpRequired` to `'no'` |
| Should Do | Reduce discussion summary textarea to 2 rows |
| Should Do | Hide campaign name from form header |

### Phase 2 — Execution Workflow Connectivity
**Commit:** `Sprint 11 Phase 2: Connect execution workflow actions`

| Priority | Task |
| -------- | ---- |
| Must Do | Add "Open Annexure-1" link on Execution Dashboard list rows |
| Must Do | Enforce duplicate submission guard via `hasSubmittedAnnexureForAssignment` |
| Must Do | Fix SubmissionSuccessCard back navigation for admin context |
| Should Do | Merge Execution Dashboard "Today's Meetings" + "Pending Annexure-1" tabs |
| Should Do | Add execution status badge per list row |

### Phase 3 — Follow-up Simplification
**Commit:** `Sprint 11 Phase 3: Simplify follow-up workflow`

| Priority | Task |
| -------- | ---- |
| Must Do | Add "Mark Complete" action on Follow-up list items |
| Must Do | Add "Open Annexure-1" link on Follow-up list items |
| Must Do | Show next follow-up on My Karkun card via `getNextFollowUpForKarkun` |
| Should Do | Rename nav label from "Follow-up & Development" to "Follow-up" |
| Should Do | Remove remarks display from follow-up lists |

### Phase 4 — Execution Status Simplification
**Commit:** `Sprint 11 Phase 4: Simplify execution status display`

| Priority | Task |
| -------- | ---- |
| Must Do | Create `getExecutionStatus()` display helper |
| Must Do | Show simplified status badges (Pending / In Progress / Follow-up Required / Completed) on lists |
| Should Do | Simplify `VisitFormHeader` visit status to match display model |

### Phase 5 — Smart Defaults
**Commit:** `Sprint 11 Phase 5: Add execution smart defaults`

| Priority | Task |
| -------- | ---- |
| Must Do | Default follow-up date when toggled to Yes |
| Must Do | Pre-fill JIH status from karkun registry (extend existing initial) |
| Should Do | Load existing draft on form open |
| Should Do | Default follow-up purpose when dropdown selection made |

### Phase 6 — Mobile Optimization
**Commit:** `Sprint 11 Phase 6: Optimize execution screens for mobile`

| Priority | Task |
| -------- | ---- |
| Must Do | Fix sticky action bar positioning for mobile nav |
| Must Do | Ensure 16px minimum input font size |
| Should Do | Reorder fields per mobile field order (Section 5) |
| Should Do | Make Execution/Follow-up list rows full-width tappable |

### Phase 7 — UI Simplification
**Commit:** `Sprint 11 Phase 7: Simplify execution UI`

| Priority | Task |
| -------- | ---- |
| Must Do | Remove Daily Progress Timeline tab |
| Must Do | Simplify Campaign Record to 2 sections |
| Must Do | Extract shared list components (reduce duplication) |
| Should Do | Flatten FormSectionCard styling for shorter form |
| Should Do | Trim SubmissionSuccessCard summary fields |

### Phase 8 — Reports Review
**Commit:** `Sprint 11 Phase 8: Simplify execution reports`

| Priority | Task |
| -------- | ---- |
| Must Do | Remove compliance tables from Review & Reports (JIH Portal, Bait-ul-Maal, Ijtema) |
| Must Do | Replace Campaign Health / Performance sections with 3 execution counts |
| Must Do | Hide Export PDF/Excel stub buttons |
| Should Do | Deduplicate Annexure-1 list between Execution and Review pages |

### Phase 9 — End-to-End Workflow Testing
**Commit:** `Sprint 11 Phase 9: Verify execution end-to-end workflow`

| Priority | Task |
| -------- | ---- |
| Must Do | Manual test: Assign → Annexure-1 → Submit → Follow-up → Complete → Reports |
| Must Do | Manual test: Admin path + Rukn path |
| Must Do | Manual test: Visit not conducted path |
| Must Do | Manual test: Mobile viewport (375px) |
| Must Do | Verify no regression in People Management |
| Must Do | Production build + lint pass |

---

## Priority Summary

| Tier | Items |
| ---- | ----- |
| **Must Do (V1)** | Annexure-1 field reduction, dropdown conversions, workflow action links, follow-up completion UI, unified status display, reports scope reduction, mock timeline removal |
| **Should Do (V1)** | Smart defaults, draft resume, merged dashboard tabs, mobile polish, shared components |
| **Can Wait (V2)** | Export PDF/Excel, Daily Progress Timeline (real data), compliance tables on Review page, Rukn placeholder pages, backend persistence, analytics/scoring |

---

## Appendix A — File Reference

### Pages
- `src/pages/rukn/WorkerMeetingFormPage.tsx`
- `src/pages/rukn/CampaignRecordPage.tsx`
- `src/pages/admin/ExecutionModulePage.tsx`
- `src/pages/admin/FollowUpDevelopmentModulePage.tsx`
- `src/pages/admin/ReviewReportsModulePage.tsx`

### Form Components
- `src/components/forms/annexure1/` (9 components)

### Services & Stores
- `src/services/annexure1Service.ts`
- `src/services/followUpService.ts`
- `src/stores/annexure1Store.ts`
- `src/stores/followUpStore.ts`

### Types & Validation
- `src/types/annexure1.types.ts`
- `src/types/followUp.ts`
- `src/types/karkun-registry.types.ts` (visit status)
- `src/validation/annexure1Validation.ts`
- `src/validation/followUpValidation.ts`

### Entry Points
- `src/components/forms/rukn/MyKarkunCard.tsx`
- `src/components/dashboard/CommandCenterTodaysWork.tsx`
- `src/pages/admin/AssignmentManagementPage.tsx`

---

*This document was produced as part of Sprint 11 Phase 0. No application code was modified.*
