# KC Post-Campaign Architecture — Phase 0 Technical Inventory

**Status:** **PHASE 0 — CERTIFIED**  
**Type:** Architecture mapping (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority inputs:** Frozen post-campaign mapping (this conversation) · [KC-0104 Campaign Operating System](./campaign-operating-system-product-architecture.md) · [KC-0109 Operations Model](./operations-model-consolidation.md) · [Firestore](./firestore.md) · [Repository layer](./repository-layer.md) · [DATA_PRESERVATION](./DATA_PRESERVATION.md)

**Nature of this document**

This is the **Phase 0 existing-system audit** required before any post-campaign implementation. It maps every live collection, repository, store, and major UI surface onto the frozen architecture.

It does **not** authorize schema changes, production code, route changes, or deploys. Phase 1 may proceed only under its own ARCH-009 gate.

---

## KC-ARCH-009 gate (this artifact)

| Field | Value |
|-------|-------|
| Request type | Architecture mapping / documentation |
| Change surface | This file + review canvas only |
| Application / UI / routing / repos / Firestore / business logic | **Not modified** |
| Go / No-Go | **PHASE 0 — CERTIFIED.** Mapping approved as baseline. Phase 1 may proceed (separate ARCH-009 required). |

---

## 1. Architectural tension (must be decided, not coded around)

Today’s canonical product handbook ([KC-0104](./campaign-operating-system-product-architecture.md)) still defines Karkun Connect as a **Campaign Operating System** with Campaign as the root.

The frozen post-campaign architecture **repositions** Campaign:

```text
میقاتی منصوبہ  →  اہداف  →  Campaign / Local Programme  →  Occurrence  →  Work
```

**Inventory implication:** existing campaign, connection, Ijtema, and Bait-ul-Maal data remain the operational foundation. They must not be replaced. Campaign is reused and moved down the tree; it is not retired.

A later product decision must amend or supersede KC-0104. This inventory does not rewrite KC-0104.

---

## 2. Persistence topology (as implemented)

```text
UI / Pages
    ↓
Stores (in-memory) + derived engines (Mission, Health, Inbox, Search, Reports)
    ↓
Repository interfaces (Campaign, Rukn, Karkun, Connection, Ledger,
                       AssignmentReview, Execution, Communication,
                       Compliance, Settings)
    ↓
Firestore (production)  |  localStorage (dev / some personal prefs)
```

**Firestore collections** (`src/repositories/firestore/collections.ts`):

| Collection | Document ID pattern |
|------------|---------------------|
| `campaigns` | `campaignId` |
| `rukns` | `ruknId` |
| `karkuns` | `karkunId` |
| `connections` | `assignmentId` |
| `activityLogs` | `entryId` |
| `connectionLedger` | `ledgerId` |
| `assignmentReviews` | review id or `pending_{karkunId}` |
| `executions` | `annexure_{formId}` or `guidance` |
| `followUps` | `followUpId` |
| `communications` | `state` (single blob) |
| `compliance` | typed ids (`ijtema_*`, `baitulMaal_*`, `weeklyIjtemaEvent_*`, `weeklyIjtemaSubmission_*`, `monthlyBaitulMaalCycle_*`, `monthlyBaitulMaalSubmission_*`, `jihPortal`) |
| `settings` | reserved docs + `broadcast_*` / `backup_*` |

**Hard rule already in production (KC-0058):** karkuns, rukns, connections, campaigns — no client deletes. Activity log and connection ledger are append-only.

---

## 3. Inventory — every collection / repository / store

For each row: business concept, source of truth?, frozen-entity map, disposition, UI, backward compatibility, indexes.

Disposition vocabulary:

| Term | Meaning |
|------|---------|
| **REUSE** | Keep as the source of truth. Do not create a parallel entity. |
| **EXTEND** | Same entity; additive fields / query patterns later. |
| **REPOSITION** | Same entity; new place in the planning tree. |
| **WRAP** | New architecture automates around this SoT; do not rebuild it. |
| **REFACTOR CAREFULLY** | Existing records remain; a future Work engine may orchestrate them. |
| **SUPPORTING / DEBT** | Live but not the Health/canonical track; do not duplicate; retire only after wrap. |
| **DERIVED** | Presentation over operational SoT. Must not become a second SoT. |
| **ABSENT** | Genuinely missing. Introduce only in the named phase. |
| **DO NOT CARRY** | Must not be introduced. |

### 3.1 People

#### `rukns` — RuknRepository — REUSE

1. **Concept:** Organisational person (Rukn Master). Identity, gender, mobile, WhatsApp, place, status, archive metadata.
2. **SoT:** Yes. Type: `Rukn` in `src/data/ruknMaster.ts`.
3. **Maps to:** Rukn.
4. **Disposition:** REUSE. No second Rukn table.
5. **UI:** `/admin/rukn`, `/admin/rukn/:id`, Rukn auth/session, dashboards, connections, Ijtema/BM denominators, search, Rafeeq.
6. **Backward compatible:** Yes. Additive fields only. Soft-archive already exists.
7. **Indexes:** Document id = `ruknId`. No composite today. Future Responsibility queries must not replace this collection.

Auth: Firebase user + custom claims `role` / `ruknId`. Roles remain `administrator` | `rukn` (`src/types/auth.types.ts`).

#### `karkuns` — KarkunRepository — REUSE

1. **Concept:** Canonical person record (Karkun and Muttafiq via `category`). Identity, gender, status, category, assignment state, assigned Rukn, campaign-related fields, place/area, JIH app status, review/archive/merge metadata.
2. **SoT:** Yes. Type: `KarkunRegistryRecord`.
3. **Maps to:** Karkun (people foundation). Muttafiq is a **classification on the same record**, not a second person entity.
4. **Disposition:** REUSE. Do not create programme-participant records.
5. **UI:** `/admin/karkun`, `/admin/muttafiqeen`, person profile, Rukn Connect / Connected, search, journey, reports.
6. **Backward compatible:** Yes. `category`, `registryNumber`, review and merge fields are already additive.
7. **Indexes (live):** `assignedRuknId` + `assignmentStatus`. Future Unit/scope filters should extend this record or join Unit — not clone the person.

**Proto-Unit fields (not a Unit entity):** `place` (default `Basavakalyan`), `area`, `address`. Person profile `ward` is derived from `place`.

#### `settings/karkunRequests` — SettingsRepository — REUSE (Admin Inbox intake)

1. **Concept:** Field proposes; Admin authorizes — new Karkun / Muttafiq / conversion requests.
2. **SoT:** Yes (blob on `settings/karkunRequests`).
3. **Maps to:** Admin Inbox (people intake). Not Assignment Review.
4. **Disposition:** REUSE. Keep inside Inbox; do not generalize into an approval engine.
5. **UI:** `/admin/inbox?folder=pending`, dashboard pending-requests widget.
6. **Backward compatible:** Yes. `kind` is optional (defaults to `new_karkun`).
7. **Indexes:** Single settings doc. If volume grows, a dedicated collection would be an **extension of this SoT**, not a new person table.

### 3.2 Rukn ↔ Karkun relationship

#### `connections` — ConnectionRepository / `assignmentStore` — REUSE + EXTEND

1. **Concept:** Operational relationship: Active / Replaced / Unassigned / Completed / Suspended; transfer history; ASN.
2. **SoT:** Yes. Type: `AssignmentRecord`. **Does not store `campaignId`** — campaign is implicit via the active campaign library item.
3. **Maps to:** Connection / Assignment. Source of truth for connected / disconnected / history / current Rukn / lifecycle.
4. **Disposition:** REUSE + EXTEND. Do **not** create `programmeMemberRukn` or `programmeAssignment`.
5. **UI:** `/admin/assignments`, Rukn Connect / Connected, journey, execution desk, reports, search.
6. **Backward compatible:** Yes. KC-0058 archive + transfer history already additive.
7. **Indexes (live):** `ruknId`+`status`; `karkunId`+`status`. Future programme-scoped work must query connections, not duplicate them.

#### `assignmentReviews` — AssignmentReviewRepository — REUSE

1. **Concept:** TD-04 durable Rukn → Admin ownership review (Pending / Resolved). Pending lock docs `pending_{karkunId}`.
2. **SoT:** Yes.
3. **Maps to:** Assignment Review. Not a universal approval engine.
4. **Disposition:** REUSE. Distinct from Admin Inbox.
5. **UI:** Connections / assignment review queue (not `/admin/inbox`).
6. **Backward compatible:** Yes.
7. **Indexes:** None composite today. Future: `status` + `createdAt` if queue volume requires it. Do not merge with Inbox queries.

#### `connectionLedger` — ConnectionLedgerRepository — REUSE

1. **Concept:** Append-only lifecycle: CONNECTED / TRANSFERRED / RESTORED / ARCHIVED / UNARCHIVED / DISCONNECTED.
2. **SoT:** Yes (history of connections).
3. **Maps to:** History / audit of the relationship — not a second relationship model.
4. **Disposition:** REUSE. Do not create a separate Audit module.
5. **UI:** Integrity / recovery / admin forensics. Not a primary operator desk.
6. **Backward compatible:** Yes. Append-only.
7. **Indexes:** None. Admin-only reads.

#### `activityLogs` — ConnectionRepository activity API / `activityLogStore` — EXTEND LIGHTLY

1. **Concept:** Assignment action trail (assign / replace / remove / restore / complete / edit / transfer).
2. **SoT:** Yes for connection actions.
3. **Maps to:** History (`createdBy`/`updatedBy` style evidence for connections).
4. **Disposition:** EXTEND LIGHTLY. Keep append-only. Do not build an Audit product.
5. **UI:** Admin activity timeline, Rukn-scoped history.
6. **Backward compatible:** Yes.
7. **Indexes (live):** `ruknId` + `timestamp` DESC.

**Not durable:** `peopleAuditLog` (`src/lib/peopleAuditLog.ts`) is **in-memory only**. Person field history is not a Firestore SoT. Frozen architecture says extend metadata on records (`createdBy` / `createdAt` / `updatedBy` / `updatedAt`) — karkuns/rukns already have these. Do not introduce an Audit module to “fix” the in-memory log.

### 3.3 Planning / campaign

#### `campaigns` — CampaignRepository — REUSE + REPOSITION

1. **Concept:** Campaign library item: name, status, start/end, theme, free-text `objective`, `objectives[]`, motto. Active id `campaign-active`.
2. **SoT:** Yes in Firestore when present; **local provider returns `MOCK_CAMPAIGNS`**. Repository is **read-only** (`getAll` / `getById` / `getActive`) — no save API in the interface. Production patches exist via admin scripts.
3. **Maps to:** Campaign (no longer the architectural root).
4. **Disposition:** REUSE + REPOSITION under Meqati Mansooba → Objectives. Do not make campaign the only way to create operational work.
5. **UI:** `/admin/campaign`, `/admin/campaign/setup`, dashboards, Rukn header campaign name, reports, search.
6. **Backward compatible:** **Required.** Current production campaign window and objectives strings must remain readable. Additive `mansoobaId` / `objectiveIds` later — do not rewrite existing docs as a breaking change.
7. **Indexes:** None. Future: `mansoobaId` + `status`.

**Campaign setup does not persist.** `CampaignSetupState.enabledObjectives` and `LAUNCH_CAMPAIGN` only flip React state (`isLaunched: true`). They do not write a campaign document or merge objectives into Firestore. Production campaign docs are seeded / patched by admin scripts, not by the wizard.

**Objectives today (not a planning layer):**

| Existing | What it is | Frozen map |
|----------|------------|------------|
| `CampaignListItem.objective` / `objectives[]` | Copy on the campaign doc | EXTEND later into structured Objective links |
| `APPROVED_CAMPAIGN_OBJECTIVES` | Hardcoded setup-wizard checklist | Not a SoT |
| `enabledObjectives` in setup state | Ephemeral wizard state | Not durable |
| Campaign Health four slices | Derived metrics | Consume structured objectives eventually; do not treat Health as Objective SoT |

**Meqati Mansooba:** ABSENT. No collection, type, route, or store.

### 3.4 Local programme / occurrence / attendance / BM

#### `compliance` `_docType: weeklyIjtemaEvent` — ComplianceRepository / `weeklyIjtemaStore` — REUSE + WRAP later

1. **Concept:** Weekly Ijtema meeting event (date, Open/Closed/archived, audience gender, deadline, reopen audit). Closest existing **occurrence-like** record, but Ijtema-specific — not a generic Occurrence engine.
2. **SoT:** Yes for the event-track (canonical for Campaign Health per KC-0104 / KC-0109).
3. **Maps to:** Weekly Ijtema (specific operational programme). Future Local Programme / Occurrence should **wrap** this, not replace it.
4. **Disposition:** REUSE. Do not rebuild as generic participation.
5. **UI:** `/admin/weekly-ijtema`, `/rukn/weekly-ijtema`, Health KPI, WI attendance report (KC-037C4).
6. **Backward compatible:** Yes. Soft-archive (`archived`) already used for duplicate merge.
7. **Indexes:** None composite. Compliance is full-collection hydrate today. Future Occurrence queries must not require migrating these ids prematurely.

**Occurrence precursor already live:** `attendanceWindowEngine` auto-opens/closes gender-scoped events from a day-of-week schedule (`Asia/Karachi`; Women’s Saturday / Men’s Sunday by default; localStorage override). Phase 3 should extend this generator, not invent a parallel calendar of Ijtema dates.

**Ops surfaces already go through adapters** (`weeklyIjtemaReadAdapter` / `weeklyIjtemaWriteAdapter`, KC-0110). Legacy `ijtema_*` remains for Excused, weeks with no open event, and dual-write sync — not as a second Health SoT.

#### `compliance` `_docType: weeklyIjtemaSubmission` — REUSE

1. **Concept:** Per-Rukn marks for an event: Karkun `reminded` + `Present`/`Absent`; Rukn **register submission** completeness (`ruknsSubmitted` / `ruknsPending`).
2. **SoT:** Yes for event-track **Karkun** attendance.
3. **Maps to:** Programme-specific attendance (`reminded` → Present/Absent). Not a universal attendance field.
4. **Disposition:** REUSE.
5. **UI:** Same WI surfaces + individual Rukn/Karkun reports.
6. **Backward compatible:** Yes. Canonical reminder flag is `reminded` on event marks (KC-037C2D). Matrix **Invited / Committed** via legacy campaign remarks is a **separate commitment concept** — never treat `Committed` (or Matrix `Invited`) as Attendance.
7. **Indexes:** None. Access is by `weeklyIjtemaSubmission_{eventId}_{ruknId}`.

**Frozen-architecture gap — Rukn Present / Absent:** the frozen tracking model asks for Rukn self-attendance (`Present` / `Absent` at Ijtema). **That field does not exist.** “Rukn attendance” in code means (a) whether the Rukn submitted the register and (b) how many of their Connected Karkuns are marked. Phase 5 must decide: add Rukn self-attendance on the existing event, or treat register-submission as the Rukn signal. Do not invent a generic participation table to close this gap.

#### `compliance` `_docType: ijtema` (legacy per-Karkun) — SUPPORTING / DEBT

1. **Concept:** Per-karkun week-ending attendance (`Present`/`Absent`/`Excused`).
2. **SoT:** Live but **not** the Health SoT. Dual-track with the event model (KC-0110).
3. **Maps to:** Weekly Ijtema (legacy). Do not treat as the new Occurrence SoT.
4. **Disposition:** SUPPORTING until wrap/sync/retire. Do not add a third attendance model.
5. **UI:** Compliance/review, some journey/matrix paths (`ijtemaAttendanceStore`).
6. **Backward compatible:** Keep readable. No new writes as the primary path.
7. **Indexes:** Doc id `ijtema_{karkunId}_{weekEndingDate}`.

#### `compliance` `_docType: monthlyBaitulMaalCycle` + `monthlyBaitulMaalSubmission` — REUSE + KEEP MINIMAL

1. **Concept:** Monthly cycle + Rukn marks `Contributed` / `Pending`. No amounts on the canonical cycle track.
2. **SoT:** Yes for the cycle track (Health).
3. **Maps to:** Bait-ul-Maal. Required state remains paid/unpaid (cycle: Contributed/Pending).
4. **Disposition:** REUSE. Do not turn into a financial engine.
5. **UI:** `/admin/baitul-maal`, `/rukn/baitul-maal`, Health, BM reports.
6. **Backward compatible:** Yes. Legacy `Campaign:Committed` is read-side compatibility only.
7. **Indexes:** Typed doc ids.

#### `compliance` `_docType: baitulMaal` (legacy) — SUPPORTING / DEBT

1. **Concept:** Per-karkun month `Pending` / `Paid` / `Exempt`, optional amount.
2. **SoT:** Live dual-track (KC-0112).
3. **Maps to:** Bait-ul-Maal legacy. Cycle track remains canonical for Health.
4. **Disposition:** SUPPORTING. Do not create a third BM model.
5. **UI:** Compliance module / matrix (`baitulMaalStore`).
6. **Backward compatible:** Keep readable.
7. **Indexes:** Doc id `baitulMaal_{karkunId}_{monthKey}`.

#### `compliance` `_docType: jihPortal` — REUSE (operational; not named in frozen list)

1. **Concept:** JIH registration + monthly reporting per karkun.
2. **SoT:** Yes.
3. **Maps to:** Reporting / engagement operational record. Not a new person or programme entity.
4. **Disposition:** REUSE. Continue as SoT for portal compliance. Reporting consumes it.
5. **UI:** Review/compliance, annexure JIH field, Health “App Registration”, reports.
6. **Backward compatible:** Yes.
7. **Indexes:** Single `jihPortal` doc (map blob).

**Local Programme:** ABSENT as an entity. `/admin/activities` is an **IA registry** (`ACTIVITIES_MODULES`) listing Weekly Ijtema, Monthly Baitul Maal, Follow-up, Campaign Execution — presentation only, not a programme SoT.

**Generic Occurrence:** ABSENT as a domain type. Shared helper `campaignCycle` is a library, not a collection. WI events and BM cycles are specialised cycles. WI events are already system-generated on matching weekdays — that is the Occurrence pattern to wrap, not a blank slate.

**Orientation / Seerah / Karkun Development programmes:** No durable programme entities. “Orientation” exists as a **journey stage** and a WhatsApp template category — not attendance SoT.

### 3.5 Work / execution / responsibility / unit

#### `executions` annexure docs — ExecutionRepository / `annexure1Store` — REFACTOR CAREFULLY → Work

1. **Concept:** Submitted visit / Annexure-1 forms (connection-oriented).
2. **SoT:** Yes for visits.
3. **Maps to:** Work example “Conduct visit”. Not a generic Work engine today.
4. **Disposition:** REFACTOR CAREFULLY. Keep visit records. Future Work may point at these docs.
5. **UI:** `/rukn/visit/:id`, `/admin/annexure-1/:id` (`ConnectionJourneyPage`), execution desk, Health visits slice.
6. **Backward compatible:** Yes.
7. **Indexes (live):** `ruknId` + `submittedAt` DESC.

#### `executions/guidance` — GuidanceStore — REUSE as journey evidence

1. **Concept:** Shared blob: commitments + journey timeline events. Concurrent Admin/Rukn writes (KC-ARCH-001 merge).
2. **SoT:** Yes for commitments/timeline.
3. **Maps to:** Continuous Karkun Journey (Phase 7) and some Work-like commitments. Not Responsibility.
4. **Disposition:** REUSE blob; do not LWW-replace. Do not invent a second journey store.
5. **UI:** Connection journey, next actions, morning brief.
6. **Backward compatible:** Yes.
7. **Indexes:** Single doc `guidance`.

#### `followUps` — ExecutionRepository / `followUpStore` — REFACTOR CAREFULLY → Work

1. **Concept:** Follow-up records: Pending / Completed, dated, linked to assignment + source annexure.
2. **SoT:** Yes.
3. **Maps to:** Work example “Follow-up”. Lifecycle is already Pending → Completed (no In Progress).
4. **Disposition:** REFACTOR CAREFULLY. Natural first Work subtype. Do not add Task+Activity+Work hierarchy.
5. **UI:** Activities → Follow-up, `/rukn/campaign-record`, dashboards.
6. **Backward compatible:** Yes.
7. **Indexes (live):** `ruknId` + `followUpDate`.

#### Mission Workspace (`WorkQueueItem`) — DERIVED

1. **Concept:** Priority queue over operational signals. Status Pending / Reviewed. Reviewed ids in **localStorage** (`kc.missionWorkspace.reviewed.v1`).
2. **SoT:** **No.**
3. **Maps to:** Admin “Attention Required” / Work presentation — not the Work engine.
4. **Disposition:** DERIVED. Phase 4 Work engine must not persist this queue as organisational truth.
5. **UI:** `/admin/mission-workspace`, Today’s Mission.
6. **Backward compatible:** Presentation-only.
7. **Indexes:** None.

#### `executionPlanStore` — NOT a SoT

In-memory first-contact plans (KC-009). Candidate reminder schedule for Rafeeq. Do not promote to Work SoT without a repository.

#### `developmentAssessmentStore` — localStorage only

Tarbiyah checklist per karkun. Not Firestore. Journey-adjacent. Do not rebuild as a generic programme.

#### Responsibility — ABSENT

No tenure-scoped standing responsibility entity. Closest semantics:

- Auth **role** (administrator / rukn) — not tenure/unit.
- **Connection** — responsibility for specific Karkuns, not for a programme/unit.
- Replacement reason `'Shifted responsibility'` is a string, not a model.

#### Unit / Scope — ABSENT as an entity

Only strings: `place`, `area`, default `'Basavakalyan'`. Introduce a small Unit record in Phase 1 without organisational hierarchy.

### 3.6 Inbox / communication / notifications / calendar / search

#### Admin Inbox — PRESERVE

Read model: `InboxEngine` over `karkunRequests` + Rukn-visible `communications` history.

Kinds: `new_karkun` | `new_muttafiq` | `karkun_to_muttafiq` | `rukn_message` | `admin_notification`.

`admin_notification` is typed but **not populated** by `buildUnifiedInbox`. Do not use Inbox as a generic notification dump; future actionable notices should deep-link to Work / Occurrence.

**Admin Inbox ≠ Assignment Review Queue.** Confirmed in routes and IA.

#### Rukn Inbox / Karkun Inbox — DO NOT CARRY

No `/rukn/inbox` route. Rukn nav is Home, Connect, Connected, **Communication**, Ijtema, Baitul Maal.

`/rukn/communication` is the **WhatsApp companion workspace**, not an inbox. **Keep and extend** as Rukn → Karkun device WhatsApp.

#### `communications` — CommunicationRepository / `communicationStore` — EXTEND

1. **Concept:** Single-doc blob: templates, history, automation rules, scheduled messages, WhatsApp settings.
2. **SoT:** Yes for organisational messaging state.
3. **Maps to:** Communication (Admin → Rukn/Karkun organisational WhatsApp; history). Firestore rules: **Admin read/write only**.
4. **Disposition:** EXTEND. Two technical paths remain: Admin organisational WhatsApp vs Rukn device deep link. No internal Karkun chat.
5. **UI:** `/admin/communication`, lists, history, Rukn companion (send path is device-side).
6. **Backward compatible:** Yes. Blob growth is a known reliability concern (KC-ARCH-001) — extend carefully; do not split into a chat product.
7. **Indexes:** Single doc `state`.

#### Notifications — EXTEND

| Piece | Persistence | Notes |
|-------|-------------|--------|
| User preference toggles | `userPreferencesStore` **localStorage** | follow-up / meeting / ijtema / campaign / admin; push mostly off |
| `notificationService` | Rules from communication automation | `dispatchCampaignEvent` is a stub |
| WI in-app notices | `weeklyIjtemaNotificationStore` **memory** | Window-open / incomplete reminder |

No durable notification inbox. Future notifications must generate from programme/work events and deep-link to actions — not a third messaging SoT.

#### Calendar — ABSENT as a capability

No calendar collection or `/calendar` route. Dates exist on campaign, WI events, BM cycles, follow-ups, annexure visit dates, plus the WI attendance-window schedule. Users must not maintain duplicate calendar records. Phase 3: derive calendar from Occurrence (+ Work), starting from the existing window engine.

#### Search — EXTEND

- Registry: `matchesKarkunRegistrySearch` (name, mobile, place, area, assignment, ids).
- Rafeeq: `universalSearch` over karkun, muttafiq, rukn, campaign, assignment, report, module, dashboard, settings, attendance, weekly_ijtema.

**Not yet:** Programme, Work (as entities). Extend the existing search; do not duplicate person indexes.

### 3.7 Reporting / dashboards / Rafeeq / permissions / settings

#### Reporting — REUSE + EXTEND (derived)

KC-037 reports and Dashboard Health **read** operational SoTs. There is no report-results collection as organisational truth.

Frozen rule: first implementation must map the **actual Basavakalyan/JIH upward report**, then mark auto vs narrative fields. Do not build a theoretical reporting framework first.

Surfaces: `/admin/reports` (Report Center), WI/BM module reports, executive/individual reports, Communication “Daily Reports” (engagement copy, not executive SoT).

#### Dashboards — REUSE + EVOLVE (derived)

Admin `/admin`: Command Center, Campaign Health, Today’s Mission, Attention Required.  
Rukn `/rukn`: mission / matrix / actionable work.

Must remain derived. Primary focus shift to Attention Required is presentation, not a new SoT.

#### Digital Rafeeq — REUSE + BUILD LATER ON TOP

Conversation / voice / secretary / recommendation engines read operational data. Must not invent organisational state. Phase 8.

#### Permissions — EXTEND

Base roles only (`administrator` | `rukn`) + document-scoped Firestore rules (own connections, assigned karkuns, own WI/BM submissions).

Future: Base Role + Active Responsibility + Unit + Tenure. No permission-matrix product in Phase 1.

#### `settings` (other docs) — REUSE

`karkunCounter`, `connectionMeta`, `migrationVersion`, backup index/docs, `broadcast_*` lists. Admin Settings UI + Rukn settings (prefs). Keep.

---

## 4. Frozen entity → existing system (decision table)

| Frozen entity | Existing SoT | Disposition | Phase |
|---------------|--------------|-------------|-------|
| Rukn | `rukns` | REUSE | — |
| Karkun | `karkuns` (incl. Muttafiq `category`) | REUSE | — |
| Connection | `connections` + ledger + activityLogs | REUSE + EXTEND | — |
| Assignment Review | `assignmentReviews` | REUSE | — |
| Meqati Mansooba | none | INTRODUCE | 1 |
| Objectives | campaign copy + wizard constants + Health slices | INTRODUCE / EXTEND | 1 |
| Unit / Scope | `place` / `area` strings | INTRODUCE (minimal) | 1 |
| Campaign | `campaigns` | REUSE + REPOSITION | 2 |
| Local Programme | Activities IA only | INTRODUCE | 2 |
| Weekly Ijtema | `weeklyIjtemaEvent` + submissions | REUSE; WRAP later | 2–5 |
| Occurrence | WI events / BM cycles only | INTRODUCE generic; wrap WI | 3 |
| Calendar | none | INTRODUCE derived | 3 |
| Work | followUps + annexure + derived queues | INTRODUCE / REFACTOR | 4 |
| Responsibility | none | INTRODUCE | 4 |
| Attendance | WI submissions (and orientation later) | REUSE / extend only where required | 5 |
| Bait-ul-Maal | BM cycle + submissions | REUSE + KEEP MINIMAL | 5 |
| Reporting | derived from operational records | REUSE + EXTEND | 5 |
| Admin Inbox | InboxEngine + karkunRequests + comms | PRESERVE | 6 |
| Rukn / Karkun Inbox | do not exist | DO NOT CARRY | — |
| Communication | `communications` + device WhatsApp | EXTEND | 6 |
| Notifications | prefs + stubs + in-memory WI | EXTEND | 6 |
| Search | registry + universalSearch | EXTEND | 7 |
| Dashboards | derived | REUSE + EVOLVE | 7 |
| History metadata | fields on docs + ledger + activityLogs | EXTEND LIGHTLY | ongoing |
| Permissions | roles + rules | EXTEND | 4+ |
| Digital Rafeeq | KC-035 stack | REUSE; later | 8 |

---

## 5. Critical non-duplication — current compliance

| Forbidden | Current evidence | Gate |
|-----------|------------------|------|
| Another Karkun table | Single `karkuns` collection; Muttafiq is `category` | Keep |
| Another Rukn table | Single `rukns` | Keep |
| Generic programme participants | None today | Do not add |
| Generic participation tracking | WI-specific marks only | Do not generalize attendance |
| Second connection model | `connections` only | Do not add programmeAssignment |
| Task + Activity + Work hierarchy | followUps + annexure + derived mission | One simple Work lifecycle later |
| Separate Audit module | ledger + activityLogs + in-memory people audit | Metadata on records only |
| Separate chat system | WhatsApp + Admin Inbox | No Karkun chat |
| Second reporting SoT | Reports are derived | Keep |
| Generic approval engine | Inbox intake ≠ assignmentReviews | Keep split |
| Unnecessary org hierarchy | No Unit tree | Phase 1 Unit is flat |

**Dual-track debt (must not become a third attendance writer / fourth WI-related SoT):**

1. Weekly Ijtema **event attendance** vs legacy per-karkun `ijtema` (adapters already mediate ops writes; dual-write still exists).
2. Weekly Ijtema **Matrix commitment** (legacy campaign remarks: Invited/Committed) — a third *concept*, not a third collection. Do not conflate with event `reminded` / Present / Absent. **`Committed` is never Attendance.**
3. Monthly BM cycle vs legacy per-karkun `baitulMaal`.
4. Multiple “completed” calculators (execution status vs matrix vs Health) — KC-0109.

Do not add a generic participation / programme-member table on top of these.

---

## 6. UI dependency map (major surfaces)

### Administrator

| Route | Depends on |
|-------|------------|
| `/admin` | Derived: connections, campaigns, WI/BM KPIs, visits, requests |
| `/admin/mission-workspace` | Derived priority queue; local reviewed flags |
| `/admin/inbox` | `karkunRequests`, communication history |
| `/admin/campaign` | `campaigns` |
| `/admin/reports` | Derived from operational SoTs |
| `/admin/rukn` | `rukns` + connections |
| `/admin/karkun`, `/admin/muttafiqeen` | `karkuns` |
| `/admin/assignments` | `connections`, `assignmentReviews` |
| `/admin/weekly-ijtema` | WI events + submissions |
| `/admin/baitul-maal` | BM cycles + submissions |
| `/admin/operations` (execution / follow-up / review) | annexure, followUps, legacy compliance, JIH |
| `/admin/communication` (+ lists, history) | `communications`, broadcast lists |
| `/admin/settings` | settings + local prefs |
| `/admin/annexure-1/:id` | executions + karkuns + connections |

### Rukn

| Route | Depends on |
|-------|------------|
| `/rukn` | Derived mission / matrix |
| `/rukn/available-karkun` | `karkuns` available pool |
| `/rukn/my-karkun` | `connections` |
| `/rukn/communication` | Device WhatsApp companion (keep) |
| `/rukn/weekly-ijtema` | WI submissions |
| `/rukn/baitul-maal` | BM submissions |
| `/rukn/visit/:id` | annexure + guidance |
| `/rukn/campaign-record` | followUps |
| `/rukn/settings` | local prefs |

---

## 7. Index / query implications (do not deploy yet)

**Keep (live `firestore.indexes.json`):**

- `connections`: `ruknId`+`status`; `karkunId`+`status`
- `karkuns`: `assignedRuknId`+`assignmentStatus`
- `activityLogs`: `ruknId`+`timestamp`
- `followUps`: `ruknId`+`followUpDate`
- `executions`: `ruknId`+`submittedAt` — **declared but hydrate currently loads the full collection**
- **No compliance indexes** — WI/BM/JIH load via full-collection hydrate

**Likely new (by phase, after approval):**

| Phase | Collection (proposed) | Query pattern |
|-------|----------------------|---------------|
| 1 | `meqatiMansoobas` | status, date window |
| 1 | `objectives` | `mansoobaId` + status |
| 1 | `units` | small; id lookup sufficient initially |
| 2 | `localProgrammes` | `campaignId`, `mansoobaId`, `unitId`, status; independent programmes: `unitId`+status |
| 3 | `occurrences` | `programmeId`+date; date range for calendar |
| 4 | `work` | assignee + status; `occurrenceId`; due date |
| 4 | `responsibilities` | `personId` + `unitId` + tenure start/end |
| 6 | notifications (if durable) | recipient + unread + createdAt — only if in-app durability is required |

Rules, schema, and indexes must ship together (KC-ARCH-001). No new collection in this Phase 0.

---

## 8. Backward-compatibility law for later phases

1. Additive fields only on existing production docs.
2. Dual-track Ijtema/BM: wrap and sync before retire; never a third SoT.
3. Campaign docs remain readable without Meqati/Objective FKs (optional links).
4. Connections remain valid without `campaignId` (optional later).
5. No hard-delete of people, connections, campaigns, ledger, activity.
6. Muttafiq remains a category on `karkuns`.
7. Reporting continues to **read** operational records; no parallel report warehouse as SoT.

---

## 9. Implementation sequence (frozen) — Phase 0 certified; later phases need their own gates

| Phase | Scope | Code? |
|-------|-------|-------|
| **0** | This inventory | **PHASE 0 — CERTIFIED** (documentation baseline) |
| 1 | Meqati Mansooba + Objectives + Unit foundation | May proceed after ARCH-009 for that ticket |
| 2 | Campaign → Local Programme | |
| 3 | Occurrence generation + Calendar | |
| 4 | Responsibility + Work engine | |
| 5 | Programme-specific attendance + Reporting (real JIH/Basavakalyan report first) | |
| 6 | Communication + Notifications | |
| 7 | Admin/Rukn dashboards + Continuous Karkun Journey | |
| 8 | Automation / Digital Rafeeq | |

---

## 10. Approval checklist (Phase 1 may start only when these are YES)

- [x] People SoTs remain `rukns` + `karkuns` (Muttafiq is classification).
- [x] Relationship SoT remains `connections` (plus reviews/ledger). No programmeAssignment.
- [x] Weekly Ijtema event track remains Ijtema SoT; generic Occurrence wraps later.
- [x] Bait-ul-Maal cycle track remains BM SoT; Paid/Unpaid (Contributed/Pending) only.
- [x] Admin Inbox preserved; Assignment Review stays on Connections; no Rukn/Karkun inbox.
- [x] Work will refactor follow-up/visit carefully — no Task/Activity/Work stack.
- [x] Unit is a flat scope for Basavakalyan first — no extra hierarchy.
- [x] Campaign production data stays valid after repositioning.
- [x] Dual-track Ijtema/BM will not gain a third attendance writer (or a fourth WI-related SoT). Matrix commitment stays distinct from event attendance; `Committed` ≠ Attendance.
- [x] Rukn Ijtema Present/Absent is a Phase 5 product decision on the existing event — not a new participation entity.
- [x] Campaign setup wizard is not the campaign SoT until it actually writes Firestore (today it does not).
- [x] KC-0104 amendment (Campaign no longer root) is accepted as a follow-on product doc, not a silent rewrite.

---

## PHASE 0 — CERTIFIED

| Field | Value |
|-------|-------|
| Review | **Completed** (TASK-001). Mapping internally consistent with the frozen architecture. |
| Baseline | **Approved.** REUSE / EXTEND / NEW dispositions unchanged. Weekly Ijtema three-concept model preserved; `Committed` ≠ Attendance; no fourth WI writer; Campaign Setup React-state-only; `attendanceWindowEngine` remains Occurrence precursor. Architecture conflicts: none. |
| Phase 1 | **May proceed** under its own KC-ARCH-009 gate. This certification does not implement Phase 1. |
| Deferred product decisions (not resolved here) | (1) Rukn Ijtema Present/Absent semantics on the existing Weekly Ijtema event. (2) KC-0104 amendment (Campaign no longer product root). |
