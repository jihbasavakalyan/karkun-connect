# KC-0103B — People Domain Ownership Validation

**Type:** Product validation audit (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Status:** Complete  
**Predecessor:** [KC-0103A](./kc-0103a-people-capability-audit.md)  
**Scope:** Validate five ownership / terminology findings only  
**Excluded:** Application code, UI, routing, repositories, Firestore, business logic, implementation plans, navigation redesign

### Evidence labels

| Label | Meaning |
|-------|---------|
| **FACT** | Directly evidenced in source, rules, or architecture docs |
| **OBSERVATION** | Cross-surface pattern; interpretive but grounded |
| **HYPOTHESIS** | Plausible; not fully proven |
| **RECOMMENDATION** | Non-implementation finding (product decision / investigation priority only) |

---

## Phase 0–3 (KC-ARCH-009) — Audit gate

| Field | Value |
|-------|-------|
| Request type | **Audit / Validation** |
| Change surface | Documentation only |
| Application / UI / routing / repos / Firestore / business logic | **Not modified** |
| Go / No-Go | **GO** for documentation validation only |

---

## 1. Executive Summary

| Topic | Validated conclusion | Classification |
|-------|----------------------|----------------|
| **1. Connections vs Assignments** | **Same business capability.** Product/nav language prefers **Connection**; code, routes, types, and services largely use **Assignment**. Distinction is **intentional product terminology over implementation terminology**, not two separate capabilities. | **FACT** + **OBSERVATION** |
| **2. New Karkun Approval Ownership** | **Capability:** People intake (create/link Person + connect to requesting Rukn). **Actors:** Rukn initiates; Admin reviews/approves/rejects. **Surface:** Admin Dashboard widget only. Logical home is People intake (Karkuns/Connections domain), not Dashboard as capability owner. | **FACT** (actors/surface/data); **OBSERVATION** (logical ownership) |
| **3. Dashboard Queue Ownership** | Only **Pending Karkun Requests** is a People **capability owner** on the Dashboard (approve/reject in place). Other People-related widgets **summarize** or **launch** communication around Rukn/connection metrics — they do not own registry CRUD. | **FACT** / **OBSERVATION** |
| **4. Assignment Review Persistence** | Store is **explicitly in-memory** (module comment + array, no repository, no Firestore collection). Activity log messages are written; the **review queue itself is not durable**. Best evidence class: **genuine architectural gap** relative to New Karkun requests (which are durable) — unless product intended session-only reviews (unproven). | **FACT** (in-memory); **HYPOTHESIS** (intent) |
| **5. Shared Person Model** | **Confirmed architecture:** one Person document in `karkuns/{id}`; `category` distinguishes Karkun vs Muttafiq; Muttafiqeen excluded from campaign eligibility; Rukn is a separate master (`rukns`). Model correctly matches documented KC-0101 design. | **FACT** |

No implementation is proposed. Items needing product decisions are listed in §8.

---

## 2. Validation Results

### 2.1 Connections vs Assignments

#### Where each term appears

| Layer | “Connection(s)” | “Assignment(s)” |
|-------|-----------------|-----------------|
| Admin nav label | **Connections** (`adminNavigation.ts`) | — |
| Route constant / URL | — | `ADMIN_ASSIGNMENTS` → `/admin/assignments` |
| Rukn UX | Connect, Connected, connection journey | Internal status `Assigned` / `Available` mapped to Connected / Not Connected |
| Types | — | `AssignmentRecord`, `AssignmentStatus`, `assignmentId`, `assignmentNumber` |
| Repository | `ConnectionRepository`, `ConnectionState` | State field `assignments: AssignmentRecord[]` |
| Firestore | Collection `connections`, `connectionLedger`, doc `settings/connectionMeta` | Document fields use assignment ids/numbers inside connection docs |
| Services | `connectionLedgerService`, relationship “Connect” UI | `assignmentService`, `assignmentEngine`, `assignmentStore` |
| User-facing adapter | `connectionLabels.ts`: *“User-facing Connection language for the internal assignment/pool status values”* | Pool status `Assigned` / `Available` |

#### Who uses which term

| Audience | Dominant language |
|----------|-------------------|
| Administrator (nav / campaign setup copy) | Connections |
| Rukn (worklists) | Connect / Connected |
| Engineers / types / services | Assignment |
| Firestore path names | connections (+ connectionMeta / ledger) |

#### Ownership summary

| Concern | Owner |
|---------|--------|
| Business capability | **One:** Rukn↔Karkun ownership lifecycle (connect, transfer, remove, restore, replace, review) |
| Navigation ownership | Label **Connections** → page `AssignmentManagementPage` at `/admin/assignments` |
| Repository ownership | `ConnectionRepository` (interface name) operating on `AssignmentRecord[]` |
| Firestore ownership | `connections/{assignmentId}` documents |

#### Conclusion

**FACT:** Data model and persistence are a single ownership record stored under `connections`, typed as `AssignmentRecord`.

**FACT:** Product UI intentionally maps internal assignment/pool status to Connection language (`src/lib/connectionLabels.ts`).

**OBSERVATION:** The split is **not** two business capabilities. It is **legacy/implementation terminology (“Assignment”)** under a **product terminology (“Connection”)** veneer — partially completed rename (Firestore/nav/labels moved toward Connection; TypeScript/route/service names retain Assignment).

**Conclusion class:** Intentional **product vs implementation** terminology — **accidental inconsistency in completeness of rename**, not intentional dual capability.

---

### 2.2 New Karkun Approval Ownership

#### Trace

| Step | Actor | Surface | Service / persistence |
|------|-------|---------|------------------------|
| Initiate | **Rukn** | `/rukn/available-karkun` → New Karkun request modal | `submitNewKarkunRequest` → `settings/karkunRequests` |
| Review list | **Admin** | Dashboard `PendingKarkunRequestQueue` inside `AdminCommandCenter` | `getPendingKarkunRequests` / store hydrated from Firestore |
| Approve | **Admin** | Same queue (in place) | `approveNewKarkunRequest` → create/link Karkun + `assignKarkun` to requesting Rukn + resolve request |
| Reject | **Admin** | Same queue | `rejectNewKarkunRequest` → status Rejected; no Person create |
| Parallel create (no request) | **Admin** | `/admin/karkun` Person form | `createKarkun` (bypass request) |

#### Where approval is surfaced

**FACT:** Only Admin Dashboard command center embeds `PendingKarkunRequestQueue`. No dedicated People route for the queue was found.

#### Where approval logically belongs

| View | Assessment | Class |
|------|------------|-------|
| Capability definition | People **intake**: authorize Person into Karkun registry and establish first Connection | **FACT** (approve creates/links Person and connects) |
| Data owner | `settings/karkunRequests` + resulting `karkuns` + `connections` | **FACT** |
| Surface owner today | **Dashboard** (executive / command center) | **FACT** |
| Logical capability owner | **People intake** under Karkuns (registry write) with Connections side-effect — **not** Dashboard as domain owner | **OBSERVATION** |

**Validation (no move recommended):** Dashboard **hosts** the decision UI; it does not redefine the capability as “dashboard operations.” Capability ownership remains People intake; surface ownership is currently Dashboard.

---

### 2.3 Dashboard Queue Ownership (People-related)

Admin Dashboard widgets related to People (from `AdminCommandCenter` / hero):

| Widget / section | People relation | Owns capability? | Summarizes? | Launches? |
|------------------|-----------------|------------------|-------------|-----------|
| **Pending Karkun Requests** | Intake approve/reject | **Yes — capability owner** (approve/reject executed here) | Also shows pending count | Duplicate link to existing record on conflict; actions in place |
| Hero Campaign Progress (Connected / Remaining) | Connection totals | No | **Yes** | Quick actions to Connections / other modules |
| Collective Overview | Rukn/connection KPIs | No | **Yes** | No registry CRUD |
| Male / Female Rukns overview | Connection % / progress by wing | No | **Yes** | No |
| Top Priority Rukns | Performance ranking + WhatsApp notify/appreciate/remind | No People registry ownership | **Yes** (priority) | **Launches** Communication composer / View Rukn — not Connect assign |
| Today's Mission / Campaign Health | Operational; may mention people indirectly | No (Operations) | Out of People capability ownership | — |

#### Capability Owner vs Executive Summary

| Role | Definition used here | Dashboard People examples |
|------|----------------------|---------------------------|
| **Capability Owner** | Surface where the authoritative decision or mutation for that capability is performed | Pending Karkun Requests (approve/reject) |
| **Executive Summary** | Metrics / rankings derived from People/Connections data without owning registry or ownership mutations | Hero progress, Collective / Male / Female overviews, Top Priority Rukns (except communication side-actions) |

**FACT:** Assignment Review queue is **not** on the Dashboard; it is on the Connections page (`AssignmentManagementPage`).

**OBSERVATION:** Dashboard uniquely **owns** New Karkun approval among Admin surfaces; it only **summarizes** connection/registry health elsewhere.

---

### 2.4 Assignment Review Persistence

#### Evidence

| Check | Result | File / layer |
|-------|--------|--------------|
| Store implementation | `const requests: AssignmentReviewRequest[] = []` — module-level array | `src/stores/assignmentReviewStore.ts` |
| File header | Explicit: *“In-memory assignment review request store (KC-008)”* | Same |
| Repository | No `AssignmentReviewRepository`; not in `ConnectionRepository` | Repositories tree |
| Firestore collection / settings doc | No `assignmentReviews` (or similar) in `FIRESTORE_COLLECTIONS` / `FIRESTORE_DOCS` | `collections.ts` |
| Service persist calls | `append` / `resolve` only mutate store; `logActivity` for audit messages | `assignmentReviewService.ts` |
| Cleared on data reset | `clearAssignmentReviewStore()` | `dataResetService.ts` |
| Contrast: New Karkun requests | Durable `settings/karkunRequests` + hydrate/onSnapshot | `firestoreRepositories.ts`, `karkunRequestService.ts` |

#### Classification of the finding

| Candidate interpretation | Supported? | Reasoning |
|--------------------------|------------|-----------|
| Intentional transient UI state | **HYPOTHESIS only** | No product doc found stating “session-only reviews”; feature has Admin queue UX implying cross-session work |
| Persisted elsewhere | **Not evidenced** | Activity log messages ≠ reloadable pending queue |
| Incomplete implementation | **OBSERVATION / strong HYPOTHESIS** | Full submit/decide UX exists; persistence layer omitted vs sibling intake queue |
| Obsolete code | **Unlikely (FACT of live wiring)** | Wired from Connected card, Connection journey, Connections page queue |
| Genuine architectural gap (vs KC-ARCH-001 durability expectation for workflow state) | **OBSERVATION** | Pending queue that drives Admin action is not durable across refresh/devices |

**Validated statement:**  
**FACT:** Assignment review **requests** are in-memory only in the client.  
**FACT:** Side-effect activity log entries may persist (via activity logging path), but they do **not** reconstruct the pending review queue.  
**HYPOTHESIS:** This is an incomplete durability design rather than an intentional session-scoped product rule — product confirmation required.

---

### 2.5 Shared Person Model

#### Model

| Concept | Representation | Evidence |
|---------|----------------|----------|
| **Person** | Single registry record type `KarkunRegistryRecord` in collection `karkuns/{id}` (`kr-*` ids) | `karkun-registry.types.ts`, `people-classification.md` |
| **Karkun** | `category === 'Karkun'` (via `getPersonCategory`) | `peopleClassification.ts` |
| **Muttafiq** | `category === 'Muttafiq'`; display `registryNumber` `MT-*` | Same + types |
| **Rukn** | Separate master `rukns/{id}` — **not** a PersonCategory | `PersonKind` includes `'rukn' \| 'karkun'` for forms; category model is Karkun\|Muttafiq only |

#### Shared vs unique attributes

| Shared on Person doc | Unique / category-specific | Campaign-specific behaviour |
|----------------------|----------------------------|-----------------------------|
| Identity: name, gender, mobile, place, area, address, status, notes | `category`, `registryNumber` (Muttafiq display), `classificationHistory` | `assignmentStatus`, `assignedRuknId`, visit/campaign fields used for Karkun campaign path |
| Soft-remove / review metadata | Muttafiq path uses `MT-*`; Karkun uses campaign pool Available/Assigned | `isCampaignEligible()` = Karkun only, not soft-removed |

#### Repository / lifecycle

| Concern | Owner |
|---------|--------|
| Repository | `KarkunRepository` for both categories |
| Firestore | `karkuns` only (no `muttafiqeen` collection) |
| Create Karkun | `createKarkun` → category Karkun |
| Create Muttafiq | `createMuttafiq` → category Muttafiq |
| Move | `moveToMuttafiqeen` / `moveToKarkunRegistry` (Active connection blocks Muttafiq move) |
| Campaign Connect | Eligible Karkuns only |

#### Architecture correctness

**FACT:** Current architecture matches the documented single-Person / dual-registry model (KC-0101).

**OBSERVATION:** Naming remains confusing for outsiders (`KarkunRegistryRecord` holds Muttafiqs; `PersonKind` omits Muttafiq) but the **runtime model is coherent**.

**Conclusion:** Shared Person model is **confirmed architecture**, not an accident.

---

## 3. Evidence Matrix

| Topic | Key evidence | Supporting files | Services | Repo | Firestore |
|-------|--------------|------------------|----------|------|-----------|
| Conn vs Assign | Nav label vs route; ConnectionRepository + AssignmentRecord; connectionLabels | `adminNavigation.ts`, `routes.ts`, `ConnectionRepository.ts`, `assignment.ts`, `connectionLabels.ts` | `assignmentService`, `assignmentEngine` | `ConnectionRepository` | `connections`, `connectionMeta`, `connectionLedger` |
| New Karkun approval | Rukn submit; Admin queue on Dashboard; durable settings blob | `PendingKarkunRequestQueue.tsx`, `AdminCommandCenter.tsx`, AvailableKarkun + request modal | `karkunRequestService` | Settings / karkun request cache | `settings/karkunRequests`, `karkuns`, `connections` |
| Dashboard People widgets | Queue owns approve; overviews summarize | `AdminCommandCenter.tsx`, hero | Presentation builders | — | Reads via stores |
| Assignment review persist | In-memory array; no collection | `assignmentReviewStore.ts`, `assignmentReviewService.ts`, `collections.ts` | `assignmentReviewService` (+ `logActivity`) | None for reviews | None for review docs |
| Shared Person | category on one collection | `people-classification.md`, `karkun-registry.types.ts`, `peopleClassification.ts` | `peopleClassificationService`, `peopleStore` | `KarkunRepository` | `karkuns` |

---

## 4. Ownership Matrix

| Capability | Capability owner (domain) | Surface owner today | Data owner | Actor who decides |
|------------|---------------------------|---------------------|------------|-------------------|
| Connection / Assignment lifecycle | Connections (product) / Assignment (code) | `/admin/assignments` + Rukn Connect/Connected | `connections` + Person assignment fields | Admin full; Rukn self-connect |
| New Karkun request | People intake | Rukn Connect | `settings/karkunRequests` | Rukn initiates |
| New Karkun approve/reject | People intake | **Dashboard queue** | Same + `karkuns` + `connections` | Admin |
| Assignment review request/decide | Connections ownership change | Connections page queue | **In-memory only** (+ activity log side-effect) | Rukn request; Admin decide |
| Karkun registry | Karkuns | `/admin/karkun` | `karkuns` (Karkun category) | Admin |
| Muttafiqeen registry | Muttafiqeen | `/admin/muttafiqeen` | `karkuns` (Muttafiq category) | Admin |
| Person profile | Shared Person | `/admin/karkun/:id` | `karkuns` | Admin (+ limited Rukn enrich) |

---

## 5. Terminology Matrix

| Business idea | Product / UX term | Implementation term | Persistence term |
|---------------|-------------------|---------------------|------------------|
| Rukn owns Karkun for campaign | Connection / Connected / Connect | Assignment / Assigned / Available | `connections` docs; Person `assignmentStatus` |
| Admin ownership desk | Connections (nav) | AssignmentManagement / assignment* services | `/admin/assignments` URL |
| Field proposes new Person | New Karkun request | `NewKarkunRequest` / karkunRequest* | `settings/karkunRequests` |
| Organizational non-campaign Person | Muttafiq / Muttafiqeen | `category: 'Muttafiq'` on `KarkunRegistryRecord` | Same `karkuns` collection |
| Campaign Person | Karkun | `category: 'Karkun'` | Same |
| Ownership change request | Review / Request review | AssignmentReview* | **No durable collection** |

---

## 6. Architectural Risks

| Risk | Severity (qualitative) | Evidence class | Notes |
|------|------------------------|----------------|-------|
| Assignment review queue lost on refresh / multi-device | High if feature is relied on in production | **FACT** (in-memory) + **HYPOTHESIS** (ops impact) | Unlike New Karkun requests |
| Dual terminology (Connection/Assignment) slows onboarding and audits | Medium | **OBSERVATION** | Rename incomplete |
| New Karkun approval only on Dashboard | Medium (discoverability / ownership clarity) | **FACT** surface | Capability still People intake |
| `KarkunRegistryRecord` naming vs Muttafiq content | Low–Medium | **OBSERVATION** | Model correct; names misleading |
| Activity log mistaken for review persistence | Medium (false confidence) | **OBSERVATION** | Log ≠ queue |

---

## 7. Open Questions

1. Was Assignment Review (KC-008) **intended** to be session-only, or was Firestore persistence deferred?
2. Should product treat “Connection” as the sole external term and “Assignment” as internal-only indefinitely?
3. Is Dashboard the **deliberate** home for New Karkun approval (executive decision queue), or a temporary host?
4. Should activity-log entries for review requests be considered sufficient audit for compliance, even without a reloadable queue?
5. Are there production operators currently depending on Assignment Review across devices? (ops question — not answered by code)

---

## 8. Items requiring future product decisions

These are **decision prompts**, not implementation plans:

1. **Confirm intent** of Assignment Review durability (session vs durable workflow).
2. **Confirm** whether New Karkun approval should remain an executive Dashboard action or be recognized as a People-intake surface (ownership labeling only).
3. **Confirm** Connection vs Assignment as permanent dual vocabulary vs eventual full product/code alignment.
4. **Confirm** whether Top Priority Rukn communication actions are considered People-domain or Communication-domain (boundary clarity).

**RECOMMENDATION (non-implementation):** Treat items 1–3 as product decisions before any future People IA work. Do not treat hypotheses as approved scope.

---

## 9. Explicit non-actions (this ticket)

- No application code, UI, routing, repository, Firestore, or business-logic changes  
- No implementation plans  
- No navigation redesign  
- No page merges  

**Stop after KC-0103B.**
