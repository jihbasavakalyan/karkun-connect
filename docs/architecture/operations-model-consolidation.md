# KC-0109 — Operations Model Consolidation

**Type:** Architecture design (documentation only)  
**Status:** Proposal — ready for phased implementation tickets  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority baseline:** [Campaign Operating System Product Architecture (KC-0104)](./campaign-operating-system-product-architecture.md)  
**Primary evidence:** [KC-0103C — Operations Capability Audit](./kc-0103c-operations-capability-audit.md) · [KC-0103E — Reporting & Executive Visibility Audit](./kc-0103e-reporting-executive-audit.md)  

**Nature of this document**

This document defines the **canonical Operations execution model** for Karkun Connect and a migration plan to resolve operational inconsistencies identified in KC-0103C.

It does **not** authorize implementation, schema changes, route changes, or refactors. Each recommended phase requires its own KC-ARCH-009 gate and dedicated ticket.

---

## Executive summary

Operations is already defined in KC-0104 as the domain that **executes campaign work after a Karkun is Connected**. The product problem is not “missing ownership on paper” — it is **multiple live execution tracks and multiple completion calculators** that disagree in the UI.

**Canonical model (this proposal):**

1. **People** create Active Connections (prerequisite).  
2. **Operations** owns all post-Connect execution Systems of Record (visit, follow-up, Weekly Ijtema events, Monthly Baitul Maal cycles, JIH tracking, guidance).  
3. **Dashboard** summarizes and launches; **Today’s Mission** and **Campaign Health** remain derived presentation — never Systems of Record.  
4. For Weekly Ijtema and Monthly Baitul Maal, the **event/cycle track is canonical** (already true for Campaign Health per KC-0104 Rule 7.1.9). Legacy per-Karkun tracks become **supporting/debt** until retired or synchronized.  
5. **One primary completion vocabulary per audience:**  
   - Executive: Campaign Health (four slices)  
   - Per-Connection work: Assignment/connection **execution status** (visit + follow-up)  
   - Cycle compliance: event/cycle submission completion  

**Recommended next tickets:** KC-0110 (Ijtema track consolidation), KC-0111 (Baitul Maal track consolidation), KC-0112 (progress vocabulary / calculator quarantine).

---

## 1. Current state

### 1.1 What “Operations” is today

Per KC-0104 §2.3 and KC-0103C, Operations covers campaign execution **after** Connection:

| Capability group | Primary System of Record (today) | Primary operator surfaces |
|------------------|----------------------------------|---------------------------|
| Visit / Annexure-1 | `executions` / annexure records (`annexure1Store` / `annexure1Service`) | Shared `ConnectionJourneyPage` (`/rukn/visit/:id`, `/admin/annexure-1/:id`) |
| Follow-up | `followUps` (`followUpStore` / `followUpService`) | `/admin/follow-up`; Rukn `/rukn/campaign-record` |
| Execution status desk | Derived from visit + follow-up (`executionStatus.ts`) | `/admin/execution` |
| Weekly Ijtema (**event**) | Event + Rukn submissions (`weeklyIjtema*`) | `/admin/weekly-ijtema`, `/rukn/weekly-ijtema` |
| Weekly Ijtema (**legacy**) | Per-Karkun `compliance` ijtema docs (`ijtemaAttendance*`) | Compliance module; matrix; journey sections |
| Monthly Baitul Maal (**cycle**) | Cycle + submissions (`monthlyBaitulMaal*`) | `/admin/baitul-maal`, `/rukn/baitul-maal` |
| Monthly Baitul Maal (**legacy**) | Per-Karkun `compliance` baitulMaal docs (`baitulMaal*`) | Compliance module; matrix |
| JIH registration / reporting | Person fields + `jihPortal` compliance | Compliance; Annexure; matrix |
| Guidance / journey | `executions/guidance` | Connection Journey |
| Development assessment | **localStorage only** | Connection Journey |
| Mission / Today’s Mission | **None (derived)** | Dashboard / home builders |
| Campaign Health | **None (derived reads)** | Dashboard Health panel |

### 1.2 Execution entry points

| Role | Entry | Route / surface | Evidence |
|------|-------|-----------------|----------|
| Rukn | Visit | `/rukn/visit/:karkunId` → `ConnectionJourneyPage` | `AppRouter.tsx` |
| Admin | Annexure | `/admin/annexure-1/:karkunId` → same journey | `AppRouter.tsx` |
| Admin | Execution desk | `/admin/execution` | `ExecutionModulePage.tsx` |
| Admin | Follow-up desk | `/admin/follow-up` | `FollowUpDevelopmentModulePage.tsx` |
| Admin | Compliance (legacy + JIH) | `/admin/compliance` | `ComplianceModulePage.tsx` |
| Admin / Rukn | Weekly Ijtema event | `/admin/weekly-ijtema`, `/rukn/weekly-ijtema` | WI pages + services |
| Admin / Rukn | Monthly BM cycle | `/admin/baitul-maal`, `/rukn/baitul-maal` | BM pages + services |
| Rukn | Multi-signal matrix | Rukn Home matrix | `campaignExecutionMatrix.ts` |
| Admin | Mission / Health | `/admin` Command Center | `campaignOperationsCommandCenter.ts`, `dashboardMetricsService.ts` |

### 1.3 Operational workflows (as lived)

```text
People: Connect Karkun
    ↓
Operations: Visit (Annexure-1) ──► optional Follow-up
    ↓
Operations: Parallel compliance entry
    ├─ Event/cycle modules (Rukn nav + Admin WI/BM + Health KPIs)
    └─ Legacy per-Karkun (matrix / Compliance / journey sections)
    ↓
Operations: Guidance / development checklist
    ↓
Dashboard / Reporting: Health, Mission, module reports (derived / presentation)
```

### 1.4 Duplicated / overlapping concepts

| Concept | Instance A | Instance B | Evidence |
|---------|------------|------------|----------|
| Weekly Ijtema | Event track (`weeklyIjtemaService`) | Legacy attendance (`ijtemaAttendanceService`) | KC-0103C §2.5, §4 |
| Monthly Baitul Maal | Cycle track (`monthlyBaitulMaalService`) | Legacy per-Karkun (`baitulMaalService`) | KC-0103C §2.5, §4 |
| “Completed” | Execution status (`executionStatus.ts`) | Matrix row completed (`campaignExecutionMatrix.ts`) | KC-0103C §2.6 |
| Campaign progress | Health four slices (`dashboardMetricsService`) | Overview / achievement builders (`commandCenterPresentation`, `adminMissionControlPresentation`) | KC-0103E; explore evidence |
| Mission queue | Admin Today’s Mission | Rukn mission / TodaysFocus | KC-0103C O-15; builders under `missionControl/` |
| Objectives language | Setup `enabledObjectives`, free-text `campaign.objective`, Health slices, `objectiveEvaluation.ts` | Not one Ops completion SoR | KC-0103C O-17–O-19; KC-0104 matrix |

### 1.5 Overlapping ownership (surface vs domain)

| Surface | Looks like | Logical owner (KC-0104) |
|---------|-------------|-------------------------|
| Admin nav peers: Execution, Compliance, Weekly Ijtema, Baitul Maal, Follow-up | Five separate “products” | All **Operations** capabilities |
| Today’s Mission on Dashboard | Ops work queue SoR | **Dashboard** presentation over Ops signals |
| Campaign Health on Dashboard | Ops write home | **Dashboard** presentation; Ops owns underlying SoRs |
| Matrix Ijtema/BM actions | Same business nouns as event/cycle pages | Operations — but **legacy writers**, not Health SoR |
| Assignment / Connection review | “Operational review” | **People** (Connections) — not Operations |

### 1.6 Dependencies

| Dependency | Direction | Notes |
|------------|-----------|-------|
| Active Connection | People → Operations | Prerequisite for visit / cycle denominators |
| Visit → Follow-up | Annexure submit may create follow-up | `annexure1Service` side effect |
| Follow-up → Execution status | Active FU overrides Completed | `executionStatus.ts` |
| Event/cycle KPIs → Health | Ops SoR → Dashboard | `getWeeklyIjtemaDashboardKpi`, `getMonthlyBaitulMaalDashboardKpi` |
| Legacy IJ/BM → Matrix | Ops legacy SoR → Rukn Home | `campaignExecutionMatrix.ts` |
| Mission builders → Ops stores | Read-only derived | No Mission persistence |

---

## 2. Problems

Every problem below is grounded in KC-0103C / KC-0104 / code evidence.

### P1 — Dual compliance tracks (highest severity)

**Problem:** Weekly Ijtema and Monthly Baitul Maal each have **two live Systems of Record**. Campaign Health and Mission use event/cycle KPIs; the Rukn Campaign Execution Matrix and some journey/Compliance surfaces still write and read **legacy** per-Karkun records.

**Evidence:** KC-0103C §2.5 table; `campaignOperationsCommandCenter.ts` vs `campaignExecutionMatrix.ts`; dual service families (`weeklyIjtema*` / `ijtemaAttendance*`, `monthlyBaitulMaal*` / `baitulMaal*`).

**Impact:** Operators can complete “Ijtema” on one surface and still appear incomplete on another. Executive and field truth diverge.

### P2 — Multiple completion definitions

**Problem:** “Completed” means different things in different engines.

| Engine | Definition | Evidence |
|--------|------------|----------|
| Execution status | Submitted annexure (unless FU active) | `executionStatus.ts` |
| Matrix completed | Visit + JIH Registered + legacy IJ + legacy BM | `campaignExecutionMatrix.ts` |
| Campaign Health | Four independent slice formulas | `dashboardMetricsService.ts` |
| Annexure “campaign health” | Averaged visit/report/FU rates | `annexure1Service.getCampaignHealthFromAnnexure1` |
| Achievement / overview progress | Eligible denom + mixed legacy signals | `adminMissionControlPresentation`, `commandCenterPresentation` |

**Impact:** Product language (“progress”, “pending”, “done”) is overloaded; Dashboard and field surfaces cannot share one narrative.

### P3 — Unclear capability homes inside Operations

**Problem:** Admin navigation presents Execution, Compliance, Weekly Ijtema, Baitul Maal, and Follow-up as peers, while Weekly Ijtema / Baitul Maal are also Compliance-adjacent and duplicated with legacy Compliance tabs (KC-0103C §3 observation).

**Impact:** Ownership of “where do I record Ijtema?” is ambiguous even though domain ownership is Operations.

### P4 — Mission looks like a System of Record

**Problem:** Today’s Mission / All Tasks appear as actionable Ops queues but are **derived presentation** with no persisted task SoR (KC-0103C O-15; KC-0104 §3).

**Impact:** Product/engineering risk of treating Mission as writable work management or inventing a second task database without an explicit decision.

### P5 — No unified campaign-objective completion tracker

**Problem:** Setup `enabledObjectives`, free-text `campaign.objective`, policy `objectiveEvaluation`, and Health slices share vocabulary but not one Ops SoR (KC-0103C O-17–O-19; KC-0104 marks unified tracker absent).

**Impact:** “Objective complete” cannot be audited as a single campaign truth.

### P6 — Guidance / development durability gaps

**Problem:** Development assessment is localStorage-only; named Dastoor tracking does not exist (KC-0103C O-14, O-20).

**Impact:** Incomplete campaign memory; study indicators cannot participate in Health or reports.

### P7 — Dashboard and older builders still mix sources

**Problem:** Newer Command Center Health path uses event/cycle KPIs, while older mission-control / command-center presentation helpers still incorporate legacy IJ/BM in places (`buildAdminMissionControl`, `getCampaignProgressOverview`).

**Impact:** Residual dual-source risk even after Health “canonical” contract is stated.

---

## 3. Canonical Operations model

### 3.1 One-sentence definition

**Operations is the exclusive owner of campaign execution events and their Systems of Record after an Active Connection exists; Dashboard and Reporting only summarize those events.**

### 3.2 Owner

| Field | Value |
|-------|-------|
| **Owner domain** | **Operations** |
| **Prerequisite domain** | **People** (Active Connection) |
| **Presentation domains** | **Dashboard**, **Reporting & Analytics** |
| **Advisory / guidance UX** | **Digital Rafeeq** (guides; does not own Ops SoRs) |

### 3.3 Inputs

| Input | Source | Notes |
|-------|--------|-------|
| Active Connection set | People Connections SoR | Denominator for field work |
| Active campaign window | Settings / campaign records | Time-bounds interpretation |
| Operator identity / role | Auth | Rukn executes own roster; Admin opens cycles and reviews |
| Visit form fields | Operator entry on Journey | Annexure-1 |
| Cycle roster marks | Rukn submissions | Present/Absent; Contributed/Pending |
| Follow-up outcomes | Operator entry | Admin desk / Campaign Record |

### 3.4 Execution events (canonical event types)

| Event type | Meaning | SoR |
|------------|---------|-----|
| **VisitRecorded** | Annexure draft or submitted | Visit / execution records |
| **FollowUpCreated / Completed** | Post-visit follow-up lifecycle | Follow-up records |
| **WeeklyIjtemaEventOpened / Closed** | Admin cycle control | Weekly Ijtema events |
| **WeeklyIjtemaSubmission** | Rukn roster for an event | Weekly Ijtema submissions |
| **MonthlyBaitulMaalCycleOpened / Closed** | Admin cycle control | Monthly BM cycles |
| **MonthlyBaitulMaalSubmission** | Rukn marks for a cycle | Monthly BM submissions |
| **JihRegistrationUpdated** | App registration / reporting state | Person + compliance portal records |
| **GuidanceUpdated** | Journey / commitment state | Guidance blob |

**Legacy per-Karkun IJ/BM writes** are **not** canonical events for executive truth. Until retired, they are **supporting/debt** events that must not define Campaign Health.

### 3.5 Completion (canonical definitions)

| Scope | Canonical completion | Non-canonical (debt / supporting) |
|-------|----------------------|-----------------------------------|
| **Per Connection (visit work)** | Execution status from visit + follow-up (`Pending` → `In Progress` → `Follow-up Required` → `Completed`) | Matrix “completed” multi-signal AND |
| **Weekly Ijtema (executive)** | Event KPI: Present ÷ Assigned (connected roster) for open/closed event | Legacy per-Karkun attendance |
| **Monthly Baitul Maal (executive)** | Cycle KPI: Contributed ÷ Assigned | Legacy per-Karkun BM |
| **Campaign (executive)** | Campaign Health four slices | Annexure-averaged “campaign health”; mixed overview builders |
| **Mission item** | Derived attention signal only — **never** a completion SoR | Persisted tasks (not authorized) |

### 3.6 Reporting

| Report class | Owner of data | Owner of presentation |
|--------------|---------------|------------------------|
| Module reports (Execution, WI event, BM cycle) | Operations SoRs | Operations module report pages (+ Reporting presentation) |
| Campaign Health | Operations (+ People denominators) | **Dashboard** |
| Trends / activity timeline | Activity / Ops reads | Dashboard / Reporting |
| Daily report distribution text | Generated from Ops/People signals | **Engagement** distribution |

### 3.7 Dashboard summaries

Dashboard may show:

- Campaign Health (four slices)  
- Today’s Mission / All Tasks (derived)  
- Priority / overview KPIs (derived)  
- Launch links into Operations modules  

Dashboard must **not**:

- Own visit / cycle / follow-up write workflows  
- Invent a second Mission SoR without an explicit product decision  

### 3.8 People interactions

| Interaction | Rule |
|-------------|------|
| Connect / Transfer / Release | **People** only |
| Operations consumption | Read Active Connections as execution targets |
| Connection review | **People** (even when “operational” in tone) |

### 3.9 Engagement interactions

| Interaction | Rule |
|-------------|------|
| Notify / compose about Ops attention | Engagement owns communication; Ops owns the underlying status being described |
| Journey “message” launch | Launch into Engagement; no ownership transfer |

---

## 4. Capability ownership

Aligned with KC-0104 §2–§3. Restated here for Operations consolidation.

| Domain | Owns | Does not own |
|--------|------|--------------|
| **People** | Identity, classification, **Connections** | Visits, cycles, Mission SoR |
| **Operations** | Visit, follow-up, execution desks, **canonical** WI/BM, JIH tracking, guidance, module Ops reports | Person create/approve, broadcast audiences, Dashboard KPI chrome |
| **Engagement** | Communication, Lists, templates, daily report distribution | Connection changes, visit SoR, cycle creation |
| **Dashboard** | Health / Mission / Hero **presentation**, launch, hosted queues (explicit) | Ops / People / Engagement SoRs |
| **Reporting & Analytics** | How truth is inspected/presented | Underlying writes |
| **Settings** | Campaign setup & platform config | Day-to-day execution |
| **Digital Rafeeq** | Guidance / coaching UX | Ops Systems of Record |

**Rule (KC-0104):** One capability, one owner. Supporting domains may launch or summarize only.

---

## 5. Event lifecycle

```text
Campaign (Settings)
        ↓
Connection (People)
        ↓
Execution (Operations)
        ↓
Completion (Operations definitions)
        ↓
Compliance (Operations cycle events — canonical WI/BM)
        ↓
Reporting (module reports + Reporting presentation)
        ↓
Executive Dashboard (derived Health / Mission)
```

### Transition descriptions

| Transition | What happens | Owner | SoR / artifact |
|------------|--------------|-------|----------------|
| Campaign → Connection | Campaign is active; People Connect eligible Karkuns to Rukns | People | Connection records |
| Connection → Execution | Rukn/Admin open Journey; record visit; manage follow-ups | Operations | Visit + follow-up records |
| Execution → Completion | Visit/FU state resolves execution status for that Connection | Operations | Derived status over visit/FU SoRs |
| Completion → Compliance | Parallel cycle work: Admin opens WI event / BM cycle; Rukn submits roster marks; JIH registration advances | Operations | Event/cycle + Person/portal records |
| Compliance → Reporting | Module report pages and KPI services compute Present/Contributed/Registered rates | Operations data; Reporting presentation | KPI functions + report pages |
| Reporting → Executive Dashboard | Health slices and Mission items are assembled for morning briefing; CTAs launch back into Ops modules | Dashboard | Derived only |

**Invariant:** Downstream presentation never becomes upstream ownership.

---

## 6. Source of truth

For every major metric: **Owner** (domain), **Source** (SoR or derived), **Consumers**.

| Metric / signal | Owner | Source | Consumers |
|-----------------|-------|--------|-----------|
| **Campaign Health (composite)** | Dashboard (presentation) | Derived from four Ops/People-backed slices via `dashboardMetricsService` / `campaignOperationsCommandCenter` | Admin Command Center Health panel |
| **Visits slice** | Operations (data) / Dashboard (presentation) | Annexure submissions vs planned/connected denominator | Health; Mission overdue visits |
| **Weekly Ijtema slice** | Operations (data) / Dashboard (presentation) | **Canonical:** `getWeeklyIjtemaDashboardKpi` (event track) | Health; Mission ops items |
| **Monthly Baitul Maal slice** | Operations (data) / Dashboard (presentation) | **Canonical:** `getMonthlyBaitulMaalDashboardKpi` (cycle track) | Health; Mission ops items |
| **App Registration slice** | Operations (data) / Dashboard (presentation) | Person registration / eligibility | Health |
| **Today’s Mission** | Dashboard | Derived ops attention items (`buildTodaysMissionOperationalItems` and related builders) | Admin Action Center |
| **Execution status (per Connection)** | Operations | `executionStatus.ts` over annexure + follow-up | Execution module; badges; Journey |
| **Weekly Ijtema (field submission)** | Operations | Event + submission docs | Rukn WI page; Admin WI report |
| **Monthly Baitul Maal (field submission)** | Operations | Cycle + submission docs | Rukn BM page; Admin BM report |
| **Progress (executive)** | Dashboard / Reporting | **Canonical vocabulary = Campaign Health slices** | Hero/Health; not legacy overview as primary |
| **Completion (visit)** | Operations | Submitted annexure (+ FU override) | Execution status |
| **Pending work (executive)** | Dashboard | Derived Mission / pending slice math | Mission; overview KPIs |
| **Pending work (field cycle)** | Operations | Unmarked roster rows on open event/cycle | WI/BM Rukn pages |
| **Matrix multi-signal “completed”** | Operations (**debt**) | Legacy IJ/BM + visit + JIH | Rukn Home matrix — **not** executive SoR |
| **Legacy IJ/BM compliance docs** | Operations (**debt**) | Per-Karkun compliance docs | Compliance UI; matrix — **not** Health SoR |

---

## 7. Migration strategy

Principles: **incremental**, **independently deployable**, **no big-bang rewrite**, **KC-0104 ownership preserved**, **Health contract preserved** (event/cycle canonical).

### Phase KC-0110 — Weekly Ijtema track consolidation

**Intent:** Make the event track the sole **product** truth for Weekly Ijtema completion signals used by field matrix / journey surfaces that still read legacy attendance.

**Deployable outcomes (examples — exact design in KC-0110):**

- Matrix / journey Ijtema cells read event-track state (or a thin adapter over it)  
- Legacy write paths behind feature flag or read-only quarantine  
- Health KPI unchanged (already event-track)

**Out of scope for 0110:** Baitul Maal, Mission redesign, Firestore collection renames.

### Phase KC-0111 — Monthly Baitul Maal track consolidation

**Intent:** Same pattern as KC-0110 for Monthly Baitul Maal cycles.

**Deployable outcomes:**

- Matrix / journey BM signals align to cycle track  
- Legacy BM writers quarantined  
- Health KPI unchanged (already cycle-track)

**Depends on:** Conceptual pattern proven in KC-0110; may proceed in parallel if adapters are isolated.

### Phase KC-0112 — Progress vocabulary & calculator quarantine

**Intent:** Establish one executive progress vocabulary and stop silent dual use of older calculators.

**Deployable outcomes:**

- Documented mapping: Health = executive progress; execution status = per-Connection visit work; cycle KPIs = compliance  
- Quarantine or rewire `getCampaignProgressOverview` / annexure-averaged health / achievement builders so they cannot contradict Health without an explicit label  
- Operator copy clarifies “Completed” context (visit vs cycle vs Health)

**Out of scope:** New objective SoR; Mission persistence.

### Phase KC-0113 — Ops surface clarity (nav / Compliance IA)

**Intent:** Reduce peer-nav confusion without renaming routes unless necessary.

**Deployable outcomes:**

- Information architecture that presents WI/BM as Operations cycle capabilities (labels/grouping), with legacy Compliance clearly marked transitional  
- No behavior change to SoRs beyond labeling / launch clarity

### Phase KC-0114 — Guidance durability & objective decision

**Intent:** Close KC-0103C open questions that are product decisions first.

**Deployable outcomes (after product choice):**

- Development assessment: durable Ops record **or** explicit “device-local only” product rule  
- Named Dastoor: implement under Ops **or** defer with documented absence  
- Unified objective tracker: implement under Ops **or** formally adopt Health slices as the only live objective proxies

### Phase ordering

```text
KC-0110 (WI) ──┐
               ├──► KC-0112 (vocabulary) ──► KC-0113 (IA) ──► KC-0114 (gaps)
KC-0111 (BM) ──┘
```

KC-0110 and KC-0111 are independently deployable. KC-0112 should follow at least one track consolidation to avoid renaming confusion while dual tracks still write.

---

## 8. Risks

| Risk class | Risk | Mitigation |
|------------|------|------------|
| **Technical** | Adapters introduce divergent edge cases between event and legacy data during transition | Feature flags; dual-read verification scripts; keep Health KPI on existing event/cycle services |
| **Technical** | Quarantining legacy writers breaks matrix workflows mid-campaign | Phase 0110/0111 as read-align first, write-cutover second |
| **Product** | Stakeholders treat Mission as persistent task management | Keep KC-0104 rule: derived visibility ≠ SoR; any Mission persistence needs its own ticket |
| **Product** | “Retire legacy” before field teams finish training on event/cycle pages | Communicate canonical surfaces; keep legacy read-only longer than write |
| **UX** | Temporary dual labels (“legacy vs cycle”) increase clutter | Time-box transitional copy; remove with 0113 |
| **Data** | Historical legacy docs remain after cutover | Retain as archive/read; do not delete without KC-ARCH-001 plan |
| **Deployment** | Large PR mixing WI + BM + vocabulary | Enforce phase tickets; independently deployable |
| **Rollback** | Feature-flagged adapters allow reverting UI source without schema rollback | Prefer presentation/adapters before destructive migrations |

---

## 9. Explicit non-goals

Deferred intentionally (not authorized by KC-0109):

| Non-goal | Reason |
|----------|--------|
| Application / UI implementation | Design-only ticket |
| Firestore schema redesign | Requires dedicated persistence ticket (KC-ARCH-001) |
| Repository redesign / renames | Technical-debt phase |
| Route renames | Navigation program separate from Ops model |
| Security rules redesign | Auth/rules ticket |
| Automation engine rewrite | Advisory framework remains non-SoR (`execution/*`) |
| AI / Voice / Digital Rafeeq SoR ownership | Guides only |
| Mission task persistence | Product decision not taken |
| Unified objective tracker implementation | Decision + later phase (0114) |
| People Connections redesign | Owned by People domain tickets |
| Engagement delivery pipeline | KC-0103D / Engagement roadmap |
| Big-bang rewrite of Operations modules | Explicitly rejected |

---

## 10. Verification checklist (this document)

| Check | Status |
|-------|--------|
| Recommendations reference KC-0104 / KC-0103C (and code evidence) | **Yes** |
| No unsupported “greenfield” domain invention | **Yes** — consolidates existing baseline |
| Phases incremental and independently deployable | **Yes** — 0110/0111 parallel-capable |
| Ownership consistent with KC-0104 | **Yes** — Ops executes; Dashboard summarizes; People connects |
| Event/cycle canonical for Health preserved | **Yes** — Rule 7.1.9 upheld |
| No implementation, schema, route, or repo changes in this ticket | **Yes** |

---

## 11. Governance

| Topic | Rule |
|-------|------|
| Authority | KC-0104 remains the permanent product architecture baseline; this document is the **Operations consolidation design** under that baseline |
| Conflicts | If code and this design diverge during migration, treat as transitional debt with an explicit phase owner — do not invent a third model |
| Implementation | Only via KC-0110+ tickets with KC-ARCH-009 gates |
| Amendments | Update this document through an architecture ticket when phase outcomes change the target state |

---

## 12. Explicit non-actions (KC-0109)

- No application code changes  
- No UI redesign  
- No route changes  
- No Firestore / repository / schema changes  
- No refactoring  

**Stop after KC-0109.**
