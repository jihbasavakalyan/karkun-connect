# KC-0103C — Operations Capability Audit

**Type:** Product audit (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Status:** Complete  
**Related:** [KC-0103A People](./kc-0103a-people-capability-audit.md) · [KC-0103B Ownership validation](./kc-0103b-people-ownership-validation.md)  
**Scope:** Operations / campaign execution only  
**Excluded:** People (except assignment dependency), Dashboard redesign, Communication, Lists, Reporting modules as primary audit targets

### Evidence labels

| Label | Meaning |
|-------|---------|
| **FACT** | Directly evidenced in source, rules, or architecture docs |
| **OBSERVATION** | Cross-surface pattern; interpretive but grounded |
| **HYPOTHESIS** | Plausible; not fully proven |
| **RECOMMENDATION** | Non-implementation finding (investigation / product decision only) |

---

## Phase 0–3 (KC-ARCH-009) — Audit gate

| Field | Value |
|-------|-------|
| Request type | **Audit / Investigation** |
| Change surface | Documentation only — this file |
| Application / UI / routing / repos / Firestore / business logic | **Not modified** |
| Go / No-Go | **GO** for documentation audit only |

---

## Executive summary

Operations is the domain of **campaign execution after a Karkun is Connected**: visit (Annexure-1), follow-up, compliance / ijtema / baitul maal / JIH, guidance/journey, and derived mission/progress signals.

**Highest-signal findings:**

1. **FACT:** Core visit execution is a **shared** Connection Journey + Annexure-1 form for Admin and Rukn.
2. **FACT:** Weekly Ijtema and Monthly Baitul Maal each exist as **two live tracks** — legacy per-Karkun compliance records **and** KC-0107/0108 event/cycle modules. Different surfaces query different tracks (matrix/journey vs Campaign Health KPIs).
3. **FACT:** Named **Dastoor** tracking does not exist in the codebase.
4. **FACT / OBSERVATION:** Campaign-setup “enabled objectives” and free-text campaign objective are **not** a unified Ops completion tracker; live progress uses Execution status, matrix completion, and Campaign Health slices.
5. **OBSERVATION:** Mission / “Today’s Mission” is **executive / derived visibility** over Operations signals, not the system of record for visits or compliance.

---

## 1. Capability inventory

Capabilities are business verbs. “Current owner page” is the primary surface today, not a redesign proposal.

### 1.1 Visit & execution status

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| O-01 | Record visit (Annexure-1) | Capture meeting outcome for a Connected Karkun | Rukn (primary); Admin | Open visit / annexure journey | Visit status, summary, commitment, optional follow-up & JIH | `executions` annexure doc; Karkun outcomes; guidance updates | Shared `ConnectionJourneyPage` (`/rukn/visit/:id`, `/admin/annexure-1/:id`) | Active connection; `annexure1Service` / store |
| O-02 | Save visit draft | Resume incomplete visit | Rukn / Admin | Save draft on form | Partial form | Draft annexure record | Same journey | `annexure1Store` |
| O-03 | Track execution status per assignment | Pending → In Progress → Follow-up Required → Completed | Admin (module); Rukn (implied via record/matrix) | Derived from store state | Assignment id, karkun id | Status display | Admin `/admin/execution`; Rukn campaign record / matrix | `executionStatus.ts`, annexure + follow-up stores |
| O-04 | Review execution queues / reports | Admin operational desk by status section | Admin | Open Execution module | Filters / section query | Lists + reports tab | `/admin/execution` | Execution panels; legacy `/admin/review` redirects here |

### 1.2 Follow-up

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| O-05 | Create follow-up from visit | Schedule post-visit follow-up when required | System on Annexure submit (actor Rukn/Admin) | Visit conducted + commitment + follow-up required | Follow-up fields on annexure | `followUps` record | Journey (side effect of O-01) | `followUpService`, annexure submit handler |
| O-06 | Complete / manage follow-ups | Close or edit pending follow-ups | Admin (module); Rukn (own pending) | Follow-up module / Campaign Record | Follow-up id, outcome | Updated follow-up status | `/admin/follow-up`; `/rukn/campaign-record` | `followUpStore` |

### 1.3 Compliance & cycles

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| O-07 | Manage legacy Weekly Ijtema attendance (per Karkun) | Record Present/Absent-style attendance on Person | Admin (Compliance); Rukn (matrix / journey section) | Compliance section or matrix action | Karkun, week, status | `compliance` doc `_docType: ijtema` | `/admin/compliance?…`; Rukn matrix / journey | `ijtemaAttendanceService` |
| O-08 | Run Weekly Ijtema **event** (KC-0107) | Admin opens event; Rukns submit roster | Admin create/open/close; Rukn submit | Weekly Ijtema module | Event + Present/Absent per assigned Karkun | Event + submission docs | `/admin/weekly-ijtema`; `/rukn/weekly-ijtema` | `weeklyIjtemaService` / store |
| O-09 | Manage legacy Monthly Baitul Maal (per Karkun) | Discussed / committed style campaign state | Admin Compliance; Rukn matrix | Compliance / matrix | Karkun, month, state | `compliance` `_docType: baitulMaal` | `/admin/compliance`; Rukn matrix | `baitulMaalService` |
| O-10 | Run Monthly Baitul Maal **cycle** (KC-0108) | Admin opens cycle; Rukns submit Contributed/Pending | Admin / Rukn | Baitul Maal module | Cycle + submission | Cycle + submission docs | `/admin/baitul-maal`; `/rukn/baitul-maal` | `monthlyBaitulMaalService` / store |
| O-11 | Track JIH App Registration | Recommend / register status for campaign | Admin Compliance; Rukn via Annexure / matrix | Compliance / visit / matrix | Registration status | Person field + optional `jihPortal` compliance doc | Compliance module; Annexure JIH section | `jihWebPortalService`; rules: jihPortal Admin-only |
| O-12 | Track JIH monthly reporting | Portal monthly reporting workflow | Admin (Compliance) | Compliance monthly reporting section | Reporting inputs | Compliance / portal state | `/admin/compliance` | Same family as O-11 |

### 1.4 Guidance, development, mission

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| O-13 | Guidance / journey progression | Show stage, next action, commitments after connect/visit | Rukn (primary); Admin on journey | Connection journey | Guidance state | Shared `executions/guidance` blob | Connection Journey panels | `guidanceService` / store |
| O-14 | Development assessment checklist | Study / development indicators during “development” stage | Rukn | Journey when stage = development | Checklist answers | **localStorage only** | Connection Journey | `developmentAssessmentStore` — not Firestore |
| O-15 | Mission / task queue (derived) | Surface overdue / pending operational actions | Admin (Today’s Mission / All Tasks); Rukn mission model | Dashboard / home builders | Derived from stores | Action items (presentation) | Surfaced on Admin dashboard / Rukn home builders | `campaignOperationsCommandCenter`, `AdminActionCenter`, automation engine |
| O-16 | Campaign execution matrix | Per-connection multi-signal progress (visit + JIH + ijtema + BM) | Rukn | Rukn Home | Connected assignments | Row completed flags using **legacy** Ijtema/BM | `RuknHomePage` matrix | `campaignExecutionMatrix.ts` |

### 1.5 Objectives & named gaps

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| O-17 | Campaign objective setup toggles | Select objectives at campaign setup | Admin (setup wizard) | Campaign setup | `enabledObjectives` | Wizard state | Campaign setup forms | `mockCampaignSetup` / wizard — **not** proven as live Ops scorer |
| O-18 | Free-text campaign objective | Display campaign theme/objective | Both (read) | Active campaign | `campaign.objective` | Display string | Various heroes | `campaignService` |
| O-19 | Framework objective evaluation | Policy helper for Rafeeq/execution policies | System | Policy evaluation | Objective kind + context | Evaluation result | Settings / Digital Rafeeq policies | `execution/objectiveEvaluation.ts` — **not** wired into `submitAnnexure1` |
| O-20 | Dastoor study tracking | Named Dastoor progress | — | — | — | — | **Does not exist** | No `dastoor` matches in repo |

### 1.6 Operational review (Operations-adjacent)

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| O-21 | Execution / cycle reports | Admin review of execution and Ijtema/BM reports | Admin | Reports tabs / report routes | Event or cycle id | Report views | Execution reports; Weekly/BM report pages | Respective services |
| O-22 | Assignment ownership review | Rukn requests Admin transfer/release/etc. | Rukn → Admin | Connected / journey | Review reason | In-memory review queue | **Connections** page (not Operations nav) | Documented in KC-0103A/B — People/Connections |

**Note:** O-22 is listed only because it is an “operational review” workflow; capability ownership is Connections, not Execution.

---

## 2. Campaign workflow (end-to-end operational journey)

### 2.1 How work is assigned (dependency only)

**FACT:** Operational work targets are **Active Connections** (People/Connections domain). Execution status helpers require an assignment id (`getExecutionStatusForAssignment`).

Operations does not create ownership; it executes against Connected Karkuns.

### 2.2 How work is executed

```text
Connected Karkun
  → Rukn opens Visit (/rukn/visit/:karkunId)
      or Admin opens Annexure (/admin/annexure-1/:karkunId)
  → Shared Connection Journey + Annexure-1 form
  → Draft (In Progress) or Submit (Completed for visit signal)
  → Side effects: guidance update, optional follow-up create, Karkun visit fields, optional JIH sync attempt
```

### 2.3 How progress is recorded

| Layer | What is recorded | Where |
|-------|------------------|-------|
| Visit | Annexure draft/submitted | `executions` (`annexure_*`) |
| Follow-up | Pending / complete | `followUps` |
| Legacy Ijtema / BM / JIH | Per-Karkun compliance docs | `compliance` (`ijtema`, `baitulMaal`, `jihPortal`) |
| Event Ijtema / Cycle BM | Event/cycle + Rukn submissions | `compliance` (`weeklyIjtema*`, `monthlyBaitulMaal*`) |
| Guidance | Journey/commitment blob | `executions/guidance` |
| Development checklist | Local only | `localStorage` |
| Derived mission items | Not persisted as tasks | Computed at render |

### 2.4 How follow-up is performed

**FACT:** Created from Annexure when visit conducted + commitment + follow-up required. Admin manages on Follow-up module; Rukn edits own pending on Campaign Record. Active follow-up forces Execution status **Follow-up Required**.

### 2.5 How compliance is measured

**FACT — Dual measurement:**

| Signal consumers | Ijtema / Baitul Maal source |
|------------------|----------------------------|
| Campaign Health / mission ops builders | **KC-0107/0108** `getWeeklyIjtemaDashboardKpi` / `getMonthlyBaitulMaalDashboardKpi` |
| Rukn Campaign Execution Matrix “completed” | **Legacy** `ijtemaAttendanceService` / `baitulMaalService` |
| Connection Journey weekly section | **Legacy** ijtema service (per explore evidence) |
| Rukn bottom nav Ijtema / Baitul Maal | **Event / cycle** modules |

### 2.6 How completion is determined

| Completion notion | Definition (FACT) |
|-------------------|-------------------|
| Assignment execution status Completed | Submitted annexure for that assignment (`executionStatus.ts`) — unless active follow-up overrides to Follow-up Required |
| Matrix row completed | Visit done **and** JIH Registered **and** legacy Ijtema not Pending **and** legacy BM committed |
| Campaign Health | Four slices: Visits, Weekly Ijtema (event KPI), Monthly Baitul Maal (cycle KPI), App Registration |
| Setup objective “complete” | **No unified Ops tracker found** tying `enabledObjectives` to live % |

### 2.7 Lifecycle sketch

```text
[People] Connect Karkun
    ↓
[Ops] Visit Annexure ──► Follow-up (optional)
    ↓
[Ops] Parallel compliance:
        Legacy per-Karkun (matrix / Compliance module)
        Event/Cycle modules (Rukn nav + Admin Ijtema/BM + Health KPIs)
    ↓
[Ops] Guidance / development checklist (local)
    ↓
[Visibility] Execution desks, reports, derived Mission items
```

---

## 3. Ownership analysis

Distinguish **capability ownership** (system of record / mutation home) vs **executive visibility** (summary / derived queue).

| Capability | Current surface owner | Logical capability owner | Supporting modules | Executive visibility? |
|------------|----------------------|--------------------------|--------------------|------------------------|
| Visit Annexure | Shared Journey (Rukn visit + Admin annexure) | **Execution (Visit)** | Annexure form, guidance | Health Visits KPI; Mission overdue visits |
| Execution status desk | Admin Execution module | **Execution** | Status helpers | Dashboard summaries |
| Follow-up | Admin Follow-up + Rukn Campaign Record | **Follow-up** | followUp service | Mission / Execution “Follow-up Required” |
| Legacy Ijtema/BM/JIH | Admin Compliance + Rukn matrix/journey | **Compliance (legacy)** | compliance collection typed docs | Matrix; Compliance UI |
| Weekly Ijtema events | Admin Weekly Ijtema + Rukn Ijtema | **Weekly Ijtema (KC-0107)** | weeklyIjtema* | Campaign Health |
| Monthly BM cycles | Admin Baitul Maal + Rukn Baitul Maal | **Monthly Baitul Maal (KC-0108)** | monthlyBaitulMaal* | Campaign Health |
| JIH registration | Compliance + Annexure + matrix | **Compliance / JIH** | Person field + jihPortal | App Registration health |
| Guidance | Connection Journey | **Guidance** (under Execution journey) | executions/guidance | Journey UI |
| Development assessment | Connection Journey | Unclear / incomplete | localStorage | Not in Health |
| Mission Action Center | Dashboard / home | **Visibility only** | Derived builders | **Yes — primary role** |
| Campaign objectives (setup) | Campaign setup | Setup / Campaign metadata | Wizard | Not Ops completion |
| Dastoor | — | — | Missing | — |
| Assignment review | Connections | Connections (People) | In-memory | — |

**OBSERVATION:** Admin nav lists Execution, Compliance, Weekly Ijtema, Baitul Maal, Follow-up as peer items — while Weekly Ijtema and Baitul Maal are also Compliance-adjacent and duplicated with legacy Compliance tabs.

---

## 4. Duplication analysis

Identify only — no merge recommendation.

| Area | Duplicate / parallel instances | Type | Class |
|------|-------------------------------|------|-------|
| Visit UI | Admin annexure path + Rukn visit path | **Shared** journey component (intentional dual entry) | **FACT** |
| Weekly Ijtema | Legacy per-Karkun attendance **and** KC-0107 events | Dual models, both live | **FACT** |
| Monthly Baitul Maal | Legacy per-Karkun **and** KC-0108 cycles | Dual models, both live | **FACT** |
| Ijtema / BM status entry | Compliance module, matrix quick actions, journey sections, dedicated event/cycle pages | Multiple data-entry surfaces | **FACT** / **OBSERVATION** |
| Progress notions | Execution status vs matrix “completed” vs Campaign Health KPIs | Multiple completion definitions | **FACT** |
| Follow-up management | Admin Follow-up module vs Rukn Campaign Record | Dual desks, same store | **FACT** |
| Mission builders | Admin Action Center vs Rukn mission control | Parallel derived queues | **OBSERVATION** |
| Objective language | Setup `enabledObjectives`, free-text `objective`, framework `evaluateCampaignObjective`, Health slices | Overlapping vocabulary, different engines | **OBSERVATION** |
| JIH updates | Compliance UI, Annexure sync, matrix | Multiple writers; portal rules Admin-only | **FACT** + open question on Rukn sync |

---

## 5. Dependency overview (high-level)

### 5.1 Repositories & Firestore

| Capability group | Primary persistence | Collection / doc pattern |
|------------------|---------------------|--------------------------|
| Visits | Execution repository / annexure cache | `executions` / `annexure_*` |
| Guidance | Shared execution guidance doc | `executions/guidance` |
| Follow-ups | Follow-up repository | `followUps` |
| Legacy + event compliance | Compliance repository | `compliance` with `_docType` discriminators |
| Campaign metadata | Campaign repository | `campaigns` |
| Development assessment | None (localStorage) | — |
| Derived mission items | None | Computed |

### 5.2 Shared services / stores

| Layer | Role |
|-------|------|
| `annexure1Store` / `annexure1Service` | Visit capture |
| `followUpStore` / `followUpService` | Follow-up lifecycle |
| `guidanceStore` / `guidanceService` | Journey guidance |
| `ijtemaAttendance*` / `baitulMaal*` / `jihWebPortal*` | Legacy compliance |
| `weeklyIjtema*` / `monthlyBaitulMaal*` | Event/cycle compliance |
| `executionStatus.ts` | Assignment-level status |
| `campaignExecutionMatrix.ts` | Rukn multi-signal matrix (**legacy** Ijtema/BM) |
| `campaignOperationsCommandCenter.ts` | Health + mission ops items (**event/cycle** KPIs) |
| `campaignAutomationEngine` | Derived alerts/interventions |
| `assignmentStore` | Prerequisite Connected set |

### 5.3 Core business rules (Operations)

| Rule | Evidence |
|------|----------|
| Execution status requires assignment context | `getExecutionStatusForAssignment` |
| Submitted annexure ⇒ Completed (unless follow-up active) | `executionStatus.ts` |
| Follow-up can override status to Follow-up Required | Same |
| Rukn may write own annexure / own follow-ups / own event-cycle submissions | `firestore.rules` |
| Weekly Ijtema **events** Admin-only create; Rukn submissions own `ruknId` | Rules comments + functions |
| `jihPortal` Admin-only | Rules comment |
| Matrix “completed” needs visit + JIH Registered + legacy Ijtema + legacy BM committed | `campaignExecutionMatrix.ts` |
| Campaign Health uses event/cycle KPI services | `campaignOperationsCommandCenter.ts` |

---

## 6. Findings

### 6.1 Correctly organized capabilities

**FACT / OBSERVATION:**

1. **Visit recording** has a clear shared form and durable `executions` persistence.
2. **Follow-up** has a dedicated Admin module and durable `followUps` collection.
3. **KC-0107 / KC-0108** provide explicit Admin open → Rukn submit → Admin report loops for Ijtema and Baitul Maal.
4. **Execution module** gives Admin a status-section desk over assignment execution.
5. **Role split** generally matches rules: Rukn executes field submissions; Admin opens cycles and reviews.

### 6.2 Confusing ownership

**OBSERVATION:**

1. **Compliance vs Weekly Ijtema vs Baitul Maal** appear as three Admin nav peers while also overlapping legacy Compliance tabs.
2. **Which Ijtema/BM is “canonical”?** Health uses event/cycle; matrix/journey still use legacy — operators can believe both are “the” compliance truth.
3. **Mission / Today’s Mission** looks like an Ops work queue but is **derived visibility**, not the system of record.
4. **Campaign “objectives”** mean different things in setup, free-text campaign field, policy evaluator, and Health KPIs.

### 6.3 Misplaced capabilities (surface vs domain)

| Capability | Why it appears misplaced | Class |
|------------|--------------------------|-------|
| Mission Action Center | Lives on Dashboard; capability is Ops-derived visibility | **OBSERVATION** (visibility host ≠ domain owner) |
| Assignment review | Operational review but owned by Connections | **FACT** (surface on Connections) |
| Legacy Ijtema section on Journey + event module in nav | Same business noun, two systems | **FACT** |

### 6.4 Operational gaps

| Gap | Evidence | Class |
|-----|----------|-------|
| No named **Dastoor** tracking | Zero repo matches | **FACT** |
| No unified **campaign objective completion** Ops tracker | Setup toggles + evaluator + Health are disconnected | **FACT** / **OBSERVATION** |
| Development assessment not durable | localStorage only | **FACT** |
| Dual Ijtema/BM risk of divergent metrics | Different services on different surfaces | **FACT** |
| JIH portal write path for Rukn Annexure sync vs Admin-only rules | Side effect vs rules comment | **Open question** |

### 6.5 Open questions requiring future validation

1. Are legacy Ijtema/Baitul Maal **intentionally retained** alongside KC-0107/0108, or is one track meant to supersede the other?
2. Does Annexure `syncJihPortal` succeed for Rukn under Admin-only `jihPortal` rules?
3. Do campaign-setup `enabledObjectives` persist onto the launched campaign and gate any Ops UI?
4. Is `evaluateCampaignObjective` / execution `AutomationEngine` used in live visit/compliance flows, or mainly Rafeeq/settings?
5. Should development assessment be durable campaign data or remain device-local?
6. Is Rukn Campaign Record the intended Rukn “Execution desk,” or is the Home matrix the primary work surface?
7. Should Mission items ever become persisted tasks, or remain forever derived?

---

## 7. Explicit non-actions (this ticket)

- No application code, UI, routing, repository, Firestore, or business-logic changes  
- No navigation redesign  
- No page merges  
- No implementation recommendations beyond labeling gaps for future validation  

**Stop after KC-0103C.**
