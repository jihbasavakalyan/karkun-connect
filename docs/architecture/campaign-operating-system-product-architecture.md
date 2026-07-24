# Campaign Operating System — Product Architecture Baseline

**Document ID:** KC-0104  
**Status:** Canonical product architecture baseline  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Audience:** Product, engineering, and campaign leadership  
**Sources:** KC-0103A · KC-0103B · KC-0103C · KC-0103D · KC-0103E  

**Nature of this document**

This is the **permanent product architecture handbook** for Karkun Connect.  
It defines domains, capability ownership, terminology, and principles.

It does **not** redesign UI, rename routes, change Firestore, or prescribe code structure.  
Future implementation work must align with this baseline; deviations require an explicit product decision.

---

## 1. Product Vision

### 1.1 Mission

**Karkun Connect is a Campaign Operating System.**

It enables Jamaat campaign leadership and Rukns to:

1. **Organize people** for campaign participation  
2. **Execute campaign work** (visits, follow-ups, compliance cycles)  
3. **Engage audiences** through structured communication  
4. **See campaign truth** through executive visibility and module reports  

The product is not a generic CRM, not a chat app, and not a static reporting portal. It is the operating system for running a **time-bounded campaign**.

### 1.2 Scope

| In scope | Out of scope (for this baseline) |
|----------|----------------------------------|
| Campaign people (Rukn, Karkun, Muttafiq) | General Jamaat membership systems beyond campaign Person model |
| Connections (Rukn↔Karkun ownership) | Non-campaign social networking |
| Visit / Annexure execution | Unrelated field apps |
| Follow-up, Weekly Ijtema, Monthly Baitul Maal, JIH registration tracking | Full financial ERP |
| Communication & Lists (WhatsApp-assisted engagement) | Meta Cloud delivery engine (future; not assumed live) |
| Executive Dashboard & module reporting | Standalone BI warehouse |
| Campaign setup & settings | Arbitrary multi-tenant SaaS |

### 1.3 Supported users

| Role | Responsibility in the COS |
|------|---------------------------|
| **Administrator** | Owns registries, Connections desk, Operations modules, Engagement (mission-wide), executive Dashboard, Settings |
| **Rukn** | Connects Available Karkuns, executes visits, submits compliance cycles for assigned Karkuns, communicates with Connected Karkuns |

### 1.4 Campaign philosophy

1. **Connection before execution** — Operational work targets Active Connections.  
2. **Field proposes; Admin authorizes** — New Karkuns from the field enter through request → approval.  
3. **Execute in modules; see on Dashboard** — Systems of record live in domains; Dashboard summarizes and launches.  
4. **One capability, one owner** — Supporting surfaces may launch or summarize; they do not redefine ownership.  
5. **Campaign time is finite** — Progress, health, and missions are interpreted inside the active campaign window.

---

## 2. Product Domains

These domains are the **permanent business structure** of the Campaign Operating System.

### 2.1 Dashboard (Executive Visibility)

**Responsibility:** Morning briefing and exception orientation for Administrators.

- Summarize campaign progress and health  
- Surface derived missions and priority signals  
- Launch Administrators into owning modules  
- Host temporary executive queues only when product intentionally places them there (see Product Rules)

**Does not own:** Registries, visit forms, compliance cycles, message templates, or durable operational write paths (except explicitly hosted queues such as New Karkun approval UI).

### 2.2 People

**Responsibility:** Identity, classification, and campaign ownership relationships.

- Rukn master  
- Karkun and Muttafiqeen Person registries (shared Person model; category distinguishes)  
- New Karkun intake (request + approval)  
- Connections (Connect / Transfer / Release / Restore / Review)  
- Person profile and reclassification  

**Does not own:** Visit outcomes, compliance cycle submissions, broadcast templates.

### 2.3 Operations

**Responsibility:** Campaign execution after a Karkun is Connected.

- Visit / Annexure-1 recording  
- Follow-up lifecycle  
- Execution status desks and visit reports  
- Weekly Ijtema (canonical executive health: event track)  
- Monthly Baitul Maal (canonical executive health: cycle track)  
- JIH App Registration / reporting tracking  
- Guidance / journey progression  
- Module-scoped operational reports  

**Does not own:** Person create/approve, mission-wide broadcast audiences, Dashboard KPI presentation.

### 2.4 Engagement

**Responsibility:** Audience selection and campaign communication.

- Communication workspace (Admin mission-wide; Rukn Connected-scoped)  
- Lists (dynamic + saved audiences)  
- Templates and message history  
- WhatsApp-assisted compose / personalized multi-send  
- Daily report distribution to leadership audiences  

**Does not own:** Connection ownership changes, visit SoR, compliance event creation.

### 2.5 Reporting & Analytics

**Responsibility:** How campaign truth is presented and inspected.

- Executive summaries and derived analytics on Dashboard  
- Campaign Health presentation  
- Module-scoped reports (Execution, Weekly Ijtema, Baitul Maal)  
- Trends and activity timelines  

**Does not own:** Underlying operational writes. Reporting **reads** Systems of Record owned by People / Operations / Engagement.

> **Note:** Reporting & Analytics is a **presentation domain**. Many of its surfaces currently live on Dashboard or inside Operations/Engagement modules. Ownership of *presentation* may sit with Dashboard or the module report page; ownership of *data* never leaves the SoR domain.

### 2.6 Settings

**Responsibility:** Platform and campaign configuration.

- Campaign setup and library  
- Authentication / role access configuration  
- Data integrity and administrative tooling  
- Product settings that are not domain workflows  

**Does not own:** Day-to-day People / Operations / Engagement execution.

---

## 3. Capability Ownership Matrix

**Rule:** Every major capability has **exactly one Owner Domain**.  
Supporting domains may launch, summarize, or consume — they do not co-own.

| Capability | Owner Domain | Supporting Domains | System of Record | Executive Visibility |
|------------|--------------|--------------------|------------------|----------------------|
| Rukn management | **People** | Dashboard (summaries) | Rukn master records | Collective / Male–Female overviews; Top Priority |
| Karkun registry | **People** | Dashboard, Engagement (recipients) | Person records (`category: Karkun`) | Connection counts; Health denominators |
| Muttafiqeen registry | **People** | — | Person records (`category: Muttafiq`) | Not campaign-eligible; not Connect pool |
| Person profile & reclassification | **People** | Operations (read Connected context) | Person record + classification history | — |
| New Karkun request | **People** | Engagement (none required) | Pending requests store | Dashboard may show pending count |
| New Karkun approval / rejection | **People** | Dashboard (**host surface** today) | Pending requests store + Person + Connection on approve | Dashboard queue (**hosted**; does not transfer ownership) |
| Connection management (Connect / Transfer / Release / Restore / Replace) | **People** | Operations (consumes Active Connections); Dashboard (summaries) | Connections records + Person assignment fields | Hero Connected/Remaining; overviews |
| Connect / Connected worklists (Rukn) | **People** | Operations (visit entry) | Same Connections SoR | Rukn home parallel summaries |
| Connection ownership review | **People** | — | Review requests (**durability gap** — see roadmap) | Connections desk queue |
| Visit execution (Annexure-1) | **Operations** | People (Connection prerequisite); Dashboard (Health Visits) | Visit / execution records | Campaign Health · Visits; Mission overdue visits |
| Execution status desk | **Operations** | Dashboard (launch) | Derived from visit + follow-up SoRs | Mission / Trends |
| Follow-up | **Operations** | Dashboard (Mission) | Follow-up records | Mission / Execution status |
| Weekly Ijtema | **Operations** | Dashboard (Health); Reporting (event report) | **Canonical for Health:** Weekly Ijtema events & submissions. Legacy per-Karkun attendance remains supporting/debt | Campaign Health · Weekly Ijtema |
| Monthly Baitul Maal | **Operations** | Dashboard (Health); Reporting (cycle report) | **Canonical for Health:** Monthly cycles & submissions. Legacy per-Karkun records remain supporting/debt | Campaign Health · Monthly Baitul Maal |
| JIH App Registration / reporting | **Operations** | People (Person fields); Dashboard (Health) | Person registration state + compliance portal records | Campaign Health · App Registration |
| Guidance / journey | **Operations** | People (Connected context) | Guidance state | Journey UI (Rukn/Admin) |
| Development assessment / study indicators | **Operations** | — | Local/device checklist today (**gap**) | Not in Campaign Health |
| Dastoor study (named) | **— (absent)** | — | Not implemented | — |
| Campaign objective completion (unified) | **— (absent as unified Ops tracker)** | Settings (setup toggles); Dashboard (Health slices) | Split across setup / free-text / Health — **not one SoR** | Health slices act as live proxies |
| Communication compose & send | **Engagement** | People (recipients); Dashboard (Notify launch); Operations (Journey launch) | Communication history / templates store | Dashboard may launch composer |
| Lists & audience management | **Engagement** | People (registry filters) | Saved lists + dynamic list definitions | — |
| Templates | **Engagement** | — | Template store | — |
| Message history / delivery UI | **Engagement** | Reporting (presentation) | Communication history (**delivery receipts not live**) | Delivery panels |
| Daily report distribution | **Engagement** | Reporting (generated text) | Report compose + send history | Communication Daily Reports |
| Campaign Health presentation | **Dashboard** | Operations (SoRs); Reporting (concept) | *None* — reads Ops/People metrics | Primary Health panel |
| Executive Hero & overviews | **Dashboard** | People / Operations | *None* — derived | Hero; Collective; Male/Female |
| Today’s Mission / All Tasks | **Dashboard** | Operations (signals) | *None* — derived task list | Mission widgets |
| Top Priority Rukns | **Dashboard** | Operations / People / Engagement (notify) | *None* — derived ranking | Priority list |
| Progress Trends / Activity Timeline | **Dashboard** / **Reporting & Analytics** | Operations / activity SoR | Activity log for timeline; derived trends | Trends; Timeline |
| Module operational reports (Execution / WI / BM) | **Operations** (+ **Reporting & Analytics** presentation) | Dashboard (launch) | Module SoRs | Report pages |
| Campaign setup & library | **Settings** | Dashboard (reads active campaign) | Campaign records | Hero campaign window |
| Platform / auth / integrity tooling | **Settings** | All domains | Settings & auth configuration | — |

### 3.1 Ownership verification checklist

| Check | Status |
|-------|--------|
| Every major capability has exactly one Owner Domain | **Yes** (absent capabilities marked explicitly) |
| Every owned capability identifies SoR or “derived / none” | **Yes** |
| Dashboard does not own People/Ops/Engagement SoRs | **Yes** (approval UI is hosted, not re-owned) |
| Dual Ijtema/BM tracks acknowledged with one canonical Health owner | **Yes** — Operations; event/cycle canonical for Health |
| KC-0103A–E findings reflected | **Yes** — see §9 |

---

## 4. Executive Principles

1. **Dashboard summarizes.** It aggregates and orients; it is not the home of operational write workflows—except intentional hosted queues.  
2. **Operational modules execute.** People, Operations, and Engagement own mutations and Systems of Record.  
3. **One capability has one owner.** Supporting domains may assist; they do not share ownership.  
4. **One System of Record per capability.** Parallel tracks are technical debt until product retires or merges them.  
5. **Executive widgets launch work; they do not own work.** Links and CTAs navigate into owner modules.  
6. **Derived visibility is not a SoR.** Mission, Priority, Health %, and Trends can change presentation without changing underlying records.  
7. **Connection before execution.** Operations assumes Active Connections from People.  
8. **Reliability is part of architecture.** Durable workflows (e.g. New Karkun requests) must persist; ephemeral queues must be explicit product decisions (KC-ARCH-001).

---

## 5. Canonical Terminology

### 5.1 Approved product terms

| Approved term | Meaning |
|---------------|---------|
| **Campaign Operating System (COS)** | Karkun Connect as a whole |
| **Executive Dashboard** | Admin home briefing & exception orientation (`/admin`) |
| **Campaign Health** | Four-slice executive completion view (Visits, Weekly Ijtema, Monthly Baitul Maal, App Registration) |
| **Today’s Mission** | Derived Admin task list of attention items |
| **People** | Domain of identity, classification, and Connections |
| **Rukn** | Campaign leader / field operator identity |
| **Karkun** | Campaign-eligible Person |
| **Muttafiq / Muttafiqeen** | Non–campaign-eligible Person classification |
| **Person** | Shared identity record underlying Karkun and Muttafiq |
| **Connection** | Active (or historical) Rukn↔Karkun ownership relationship |
| **Connect / Connected / Available** | Rukn-facing Connection states |
| **Operations** | Domain of campaign execution |
| **Visit / Annexure-1** | Meeting capture for a Connected Karkun |
| **Follow-up** | Post-visit operational follow-up record |
| **Weekly Ijtema** | Weekly attendance cycle capability |
| **Monthly Baitul Maal** | Monthly contribution cycle capability |
| **Engagement** | Domain of audiences and communication |
| **Lists** | Audience workshop (dynamic + saved) |
| **Communication** | Compose / send / history workspace |
| **Reporting & Analytics** | Presentation of campaign truth |

### 5.2 Legacy / implementation terminology (still present)

| Legacy / code term | Product meaning | Guidance |
|--------------------|-----------------|----------|
| Assignment / Assigned / Available (pool) | Connection / Connected / Not Connected | Prefer **Connection** in product language |
| `/admin/assignments` | Connections desk | Nav already says Connections; route may remain until a dedicated rename program |
| `AssignmentRecord`, assignment services | Connection records | Implementation vocabulary |
| Registry (engineering shorthand) | People lists / Person store | Prefer **People** / **Karkuns** / **Muttafiqeen** in product language |
| Broadcast (multi `wa.me`) | Personalized multi-send | Product may keep “Broadcast” label; meaning is per-recipient WhatsApp assist |
| Reports (Communication Daily Reports) | Engagement distribution tool | Not Campaign Health analytics |
| Assignment (Execution status context) | Visit progress against a Connection | Clarify as **execution status** in operator copy when ambiguous |

---

## 6. Navigation Principles

**This baseline does not redesign menus.** It constrains how navigation should evolve.

1. **Navigation follows business domains** — Admin and Rukn structures should remain readable as People / Operations / Engagement / Dashboard / Settings.  
2. **Executive surfaces remain lightweight** — Dashboard stays a scan + launch + limited queues surface.  
3. **Operational pages own workflows** — Deep forms and SoR desks live in domain modules.  
4. **Reporting summarizes operational data** — Module report pages sit beside their SoRs; Executive Dashboard does not become a report warehouse.  
5. **Rukn navigation prioritizes field work** — Connect, Connected, Communication, Ijtema, Baitul Maal remain execution-forward.  
6. **Do not imply ownership by placement alone** — A widget on Dashboard does not make Dashboard the capability owner.

---

## 7. Product Rules

### 7.1 Permanent rules

1. **Dashboard never becomes a workbench** for full People / Operations / Engagement workflows.  
2. **Operational data originates from Systems of Record** in owner domains.  
3. **One capability appears in one primary module** for ownership; secondary surfaces may launch or summarize.  
4. **Executive summaries may surface capability status without owning it.**  
5. **Rukn cannot create Person documents directly** — field intake uses New Karkun request → Admin approval.  
6. **Muttafiqeen are not campaign-eligible** until reclassified as Karkun.  
7. **Active Connection is required** before campaign execution against a Karkun.  
8. **Gender-matched Connection** remains a business rule for Connect.  
9. **Campaign Health’s canonical Ijtema/BM sources are event/cycle tracks** until product explicitly changes that contract.  
10. **Engagement delivery truth** (sent/delivered/read) is not assumed until a real delivery pipeline exists; history may remain “queued” after WhatsApp assist.

### 7.2 Hosted-queue exception

**New Karkun approval** is owned by **People** and may remain **hosted on the Executive Dashboard** as an intentional morning-desk queue.

This exception must stay explicit: hosting ≠ ownership transfer.

---

## 8. Future Implementation Roadmap

Phased alignment work. **No redesign is authorized by this document alone.** Each phase requires its own KC-ARCH-009 gate.

| Phase | Focus | Intent |
|-------|--------|--------|
| **A. Terminology alignment** | Product copy & docs prefer Connection / People / Campaign Health | Reduce Assignment/Registry confusion without mandatory route renames |
| **B. Navigation alignment** | Ensure nav labels continue to mirror domains; avoid new duplicate homes | Clarity only |
| **C. People refinement** | Intake surface clarity; Connection review durability decision; Person naming clarity | Close KC-0103A/B open questions |
| **D. Operations refinement** | Resolve dual Ijtema/BM tracks; clarify objective completion; guidance durability | Close KC-0103C gaps |
| **E. Engagement refinement** | Canonical audience model (Lists); delivery pipeline intent; Rukn history persistence | Close KC-0103D gaps |
| **F. Reporting refinement** | Single progress vocabulary on Hero; Health vs Trends labeling; module report consistency | Close KC-0103E conflicts |
| **G. Technical debt cleanup** | Remove or quarantine unused executive builders; stub automation/delivery honesty in UX | Reliability & maintainability |

---

## 9. Traceability to KC-0103 audits

| Audit | Incorporated into this baseline |
|-------|----------------------------------|
| **KC-0103A** | People capabilities; intake; Connections; shared Person model |
| **KC-0103B** | Connection = Assignment (one capability); approval ownership = People; Dashboard queue taxonomy; review persistence gap; Person model confirmed |
| **KC-0103C** | Operations lifecycle; dual Ijtema/BM; Mission as derived visibility; Dastoor absent; objective tracker absent |
| **KC-0103D** | Engagement = WhatsApp-assisted compose; Lists vs Communication; delivery/automation stubs; duplicated entry points |
| **KC-0103E** | Dashboard taxonomy (SoR / Summary / Analytics / Launch / Queue); Health sources; dual progress signals; module reports |

---

## 10. Governance

| Topic | Rule |
|-------|------|
| Authority | This document is the product architecture baseline for COS work after KC-0104 |
| Conflicts | If implementation and this baseline diverge, treat divergence as debt or raise a product decision — do not silently invent a second architecture |
| Changes | Amend this document through an explicit architecture ticket; do not “fix by PR description” |
| Engineering standards | KC-ARCH-009 (impact/regression) and KC-ARCH-001 (reliability/persistence) apply to all future implementation |

---

## 11. Explicit non-actions (KC-0104)

- No UI redesign  
- No route renames  
- No file renames  
- No application code changes  
- No Firestore or repository changes  

**Stop after KC-0104.**
