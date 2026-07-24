# KC-0103A — Campaign Operating System Capability Audit (People Domain)

**Type:** Product audit (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Status:** Complete  
**Scope:** People domain only (Rukn, Karkuns, Muttafiqeen, Connections, creation, approval, editing, searching, assignment ownership)  
**Explicitly excluded:** Operations, Communication, Dashboard redesign, Reporting, implementation, navigation redesign

### Evidence classification used in this document

| Label | Meaning |
|-------|---------|
| **FACT** | Directly evidenced in source, rules, or existing architecture docs |
| **OBSERVATION** | Pattern visible across multiple surfaces; interpretive but grounded |
| **HYPOTHESIS** | Plausible but not fully proven; needs further investigation |
| **RECOMMENDATION** | Non-implementation finding only (organization clarity / investigation priority) |

---

## Phase 0–3 (KC-ARCH-009) — Audit gate

| Field | Value |
|-------|-------|
| Request type | **Audit / Investigation** |
| Change surface | Documentation only — `docs/architecture/kc-0103a-people-capability-audit.md` |
| Application / UI / routing / repos / Firestore / business logic | **Not modified** |
| Go / No-Go | **GO** for documentation audit only |

---

## 1. Capability inventory

Capabilities are business verbs (what the system does), not page titles.

### 1.1 Registry & identity

| ID | Capability | Purpose | User | Trigger | Inputs | Outputs | Current owner surface | Dependencies |
|----|------------|---------|------|---------|--------|---------|----------------------|--------------|
| P-01 | Manage Rukn registry | Maintain campaign leaders (create / edit / import / export) | Admin | Admin opens Rukn module | Rukn profile fields | `rukns/{id}` record | `/admin/rukn` (`RuknModulePage`) | `peopleStore`, Rukn repository, `ruknMaster` |
| P-02 | View Rukn connection desk | See a Rukn’s Active connections; remove / transfer | Admin | Open Rukn detail | `ruknId` | Connection actions on that Rukn | `/admin/rukn/:id` (`RuknDetailPage`) | `assignmentService` / engine, connections |
| P-03 | Manage Karkun registry | Maintain campaign-eligible people (`category: Karkun`) | Admin | Admin opens Karkuns | Person profile | `karkuns/{id}` with category Karkun | `/admin/karkun` (`KarkunanPage`) | `peopleStore`, Karkun repository |
| P-04 | Manage Muttafiqeen registry | Maintain non–campaign-eligible people (`category: Muttafiq`) | Admin | Admin opens Muttafiqeen | Person profile + `MT-*` display number | Same `karkuns/{id}` collection, Muttafiq category | `/admin/muttafiqeen` | `peopleClassification`, `createMuttafiq` |
| P-05 | View / edit Person profile | Deep profile + assignment + maintenance | Admin | Open profile | `karkunId` | Updated Person / classification / assignment | `/admin/karkun/:id` (shared by both registries) | `KarkunProfilePage`, registry maintenance |
| P-06 | Reclassify Person (Karkun ↔ Muttafiq) | Move between organizational registries | Admin | Registry maintenance actions | Person id, blockers | Updated `category` + history | Profile maintenance panel | `peopleClassificationService` — blocked if Active connection |

**FACT:** Single Firestore collection `karkuns/{id}` holds both Karkun and Muttafiq; classification is a field, not a separate collection (`docs/architecture/people-classification.md`).

### 1.2 Discovery & intake (new people)

| ID | Capability | Purpose | User | Trigger | Inputs | Outputs | Current owner surface | Dependencies |
|----|------------|---------|------|---------|--------|---------|----------------------|--------------|
| P-07 | Create Karkun directly | Admin adds a campaign Person without Rukn request | Admin | Create on Karkuns page | Profile (+ optional assign) | New `karkuns` doc | `/admin/karkun` via `PersonFormModal` | `createKarkun`, counter `settings/karkunCounter` |
| P-08 | Create Muttafiq directly | Admin adds Muttafiq | Admin | Create on Muttafiqeen page | Profile | New `karkuns` doc, category Muttafiq | `/admin/muttafiqeen` | `createMuttafiq` |
| P-09 | Request new Karkun | Rukn proposes a Person not yet in registry | Rukn | “New Karkun” on Connect | Name, mobile, gender-scoped fields | Pending request in `settings/karkunRequests` blob | `/rukn/available-karkun` (`NewKarkunRequestModal`) | `karkunRequestService.submitNewKarkunRequest` |
| P-10 | Approve new Karkun request | Create or link Person + connect to requesting Rukn | Admin | Approve in queue | `requestId`, decider | Person + Active connection + request Approved | **Dashboard** `PendingKarkunRequestQueue` (not a People route) | `approveNewKarkunRequest` → `createKarkun` / link + `assignKarkun` |
| P-11 | Reject new Karkun request | Decline intake; no Person create | Admin | Reject in queue | `requestId`, notes | Request status Rejected | Dashboard queue | `rejectNewKarkunRequest` |

**FACT:** Rukn cannot `create` documents in `karkuns` (Firestore rules: `allow create: if isAdministrator()`). Intake from field must go through P-09 → P-10.

**OBSERVATION:** Approval UI is hosted on the Admin dashboard command center, while the capability is People intake — ownership of the *surface* and the *capability* diverge.

### 1.3 Connection / assignment ownership

| ID | Capability | Purpose | User | Trigger | Inputs | Outputs | Current owner surface | Dependencies |
|----|------------|---------|------|---------|--------|---------|----------------------|--------------|
| P-12 | Assign / Connect Karkun to Rukn | Establish Active ownership | Admin (any Rukn); Rukn (self) | Connect confirm / inline assign | `ruknId`, `karkunId` | `connections/{assignmentId}` + registry `assignedRuknId` | Admin `/admin/assignments`; Rukn Connect; inline selects on Karkun list/profile | `assignmentService.assignRukn`, gender gate |
| P-13 | Browse Available Karkuns (Connect pool) | Find unconnected campaign Karkuns | Rukn | Open Connect | Search / filters | Available list (gender-matched) | `/rukn/available-karkun` | Karkun read rules: Available or own |
| P-14 | Browse own Connected Karkuns | Worklist of Active connections | Rukn | Open Connected | Search | Own Active list | `/rukn/my-karkun` | connections where `ruknId` claim matches |
| P-15 | Transfer connection | Move ownership Admin→Admin action | Admin | Transfer modal | from/to Rukn, karkun | Updated connection + registry | Connections desk, Rukn detail, review queue | `transferAssignment` / `changeKarkunRuknAssignment` |
| P-16 | Remove / release connection | End Active ownership | Admin (primary UX) | Remove / release | assignment id | Inactive / released state | Connections / Rukn detail | `removeAssignment` |
| P-17 | Restore connection | Undo remove where supported | Admin | Restore modal | assignment id | Restored Active | Connections desk | `restoreAssignment` |
| P-18 | Replace assignment | Swap parties on an assignment | Admin | Replace modals | replace payload | New connection arrangement | Assignment forms (`ReplaceKarkunModal` / `ReplaceAssignmentModal`) | `replaceAssignment` |
| P-19 | Request assignment review | Rukn asks Admin to continue / transfer / replace / release | Rukn | Request review on Connected / journey | reason + preferred action | In-memory review item | Connected card / Connection journey | `assignmentReviewService` |
| P-20 | Decide assignment review | Admin acts on Rukn review request | Admin | Review queue on Connections page | decision | Transfer / replace / release / reject | `AssignmentReviewQueue` on `/admin/assignments` | Same assignment ops |

**FACT:** Product language mixes “Assignment” (routes/types/services) and “Connections” (nav label, Firestore collection `connections`).

**FACT:** `assignmentReviewStore` has no Firestore / durable persist path found in store code — reviews appear **in-memory only**.

### 1.4 Editing & enrichment

| ID | Capability | Purpose | User | Trigger | Inputs | Outputs | Current owner surface | Dependencies |
|----|------------|---------|------|---------|--------|---------|----------------------|--------------|
| P-21 | Full Person edit (Admin) | Correct / complete registry profile | Admin | Edit modal or profile page | Full form | Updated `karkuns` doc | Karkun / Muttafiq list + profile | `updateKarkun` / persistence |
| P-22 | Limited profile enrichment (Rukn) | Complete incomplete fields on Connected Karkun | Rukn | Profile completion reminder | Subset of fields | Updated Person | Connected journey UX | `ProfileCompletionReminder` + rules `ruknMayUpdateKarkun` |
| P-23 | Edit Rukn profile | Maintain leader identity | Admin | Rukn form | Rukn fields | Updated `rukns` doc | Rukn module | Rukn repository |

**FACT:** Rules allow Rukn to update a karkun doc only when assignment field stays self, claims Available→self, or releases self→empty — not when reassigning to another Rukn (`firestore.rules` `ruknMayUpdateKarkun`).

### 1.5 Search & discovery

| ID | Capability | Purpose | User | Trigger | Inputs | Outputs | Current owner surface | Dependencies |
|----|------------|---------|------|---------|--------|---------|----------------------|--------------|
| P-24 | Search Karkun registry | Find people in Admin Karkuns list | Admin | Filters / top bar → Karkun page | Query + filters | Filtered list | `/admin/karkun`, Admin top bar | `useKarkunPeopleManagement` |
| P-25 | Search Muttafiqeen | Find Muttafiq records | Admin | Filters on Muttafiqeen | Query + filters | Filtered list | `/admin/muttafiqeen` | Same people management pattern |
| P-26 | Search Rukn registry | Find leaders | Admin | Rukn module search | Query | Filtered Rukns | `/admin/rukn` | `useRuknManagement` |
| P-27 | Search Connections desk | Find by Rukn / Karkun / mobile / ASN | Admin | Connections search fields | Query | Matching assignments | `/admin/assignments` | `ruknMatchesAssignmentSearch` |
| P-28 | Search Connect / Connected pools | Rukn find Available or own Karkuns | Rukn | Search on those pages | Tokenized / mobile match | Filtered cards | Connect / Connected | `matchesKarkunRegistrySearch` |

**OBSERVATION:** Admin top-bar placeholder mentions “Karkun, Rukn, assignments…” but navigation routes search to the Karkun page (`AdminTopBar` → `/admin/karkun` with `state.searchQuery`) — broader search is not a single capability today.

**OBSERVATION:** Admin list search (`includes`) and Rukn relationship search (tokenized multi-word) are different algorithms.

### 1.6 History & audit (People-adjacent)

| ID | Capability | Purpose | User | Trigger | Inputs | Outputs | Current owner surface | Dependencies |
|----|------------|---------|------|---------|--------|---------|----------------------|--------------|
| P-29 | Connection lifecycle ledger | Append-only history of connection events | Admin (rules) | Assignment mutations | Event payload | `connectionLedger/{id}` | Written by services; not a primary People UI | `connectionLedgerService` |
| P-30 | Activity log (people events) | Operational messages (e.g. reject request) | Both (scoped) | Various actions | Activity entry | `activityLogs/{id}` | Feeds / timelines (out of People nav) | activity logging helpers |

---

## 2. User journey — People lifecycle

### 2.1 Completely new Karkun entering the system

```text
Path A — Field discovery (Rukn-led)
  Rukn opens Connect (Available pool)
    → submits New Karkun request (mobile / gender / identity checks)
    → request stored in settings/karkunRequests
    → Admin sees Pending queue on Dashboard
    → Approve: create Person (or link existing mobile owner) + assign to requesting Rukn
    → Reject: request closed; no create
    → On approve success: Karkun appears Connected for that Rukn

Path B — Admin registry intake
  Admin opens Karkuns → PersonFormModal → createKarkun
    → optional inline assign to a Rukn
    → Person available for Connect if left unassigned
```

**FACT:** Path A is the only Rukn path to introduce a new Person (Rukn cannot create `karkuns` docs).

**FACT:** After approval, assignment to the requesting Rukn is part of the approve workflow (`karkunRequestService` → assign).

### 2.2 How a Rukn receives a Karkun

| Mechanism | Actor | Result |
|-----------|-------|--------|
| Approve of that Rukn’s New Karkun request | Admin | Auto-connect to requester |
| Rukn Connect from Available pool | Rukn | Self-assign Active connection (gender-matched) |
| Admin assign / Connections desk / inline select | Admin | Assign to chosen Rukn |
| Transfer | Admin | Ownership moves from one Rukn to another |

### 2.3 Who approves / rejects / edits

| Action | Who | Where |
|--------|-----|-------|
| Approve New Karkun request | Admin | Dashboard pending queue |
| Reject New Karkun request | Admin | Same queue |
| Edit full profile | Admin | Karkun / Muttafiq surfaces + shared profile |
| Enrich incomplete fields | Rukn (limited) | Connected / journey reminder |
| Reject assignment review | Admin | Connections `AssignmentReviewQueue` |
| Reclassify to Muttafiq | Admin only | Profile maintenance; requires no Active connection |

### 2.4 After approval

**FACT (happy path):** Person exists in Karkun registry; Active connection to requesting Rukn; Rukn sees them under Connected; campaign execution (visits / compliance) can proceed for that connection (Operations domain — out of scope beyond dependency note).

**HYPOTHESIS:** If approve links an existing Karkun that already has an Active connection to another Rukn, assign may fail or conflict — edge not fully proven in this audit (open question).

### 2.5 Muttafiq path (non-campaign)

```text
Admin creates Muttafiq OR moves Karkun → Muttafiqeen (after disconnect)
  → appears only in Muttafiqeen registry
  → excluded from Connect / campaign eligibility until moved back to Karkun
```

**FACT:** Muttafiqeen are not campaign-eligible (`isCampaignEligible` = Karkun only).

### 2.6 Lifecycle sketch (end-to-end)

```text
[Identity]
  Rukn master ──┐
                ├── registries (Admin)
  Person doc ───┘  category: Karkun | Muttafiq

[Intake]
  Rukn request ──► Admin approve/reject ──► (approve) Person + Connection
  Admin create ──────────────────────────► Person (± Connection)

[Ownership]
  Available ──Connect/Assign──► Active Connection
  Active ──Transfer / Replace / Release / Review──► new owner or Available

[Exit from campaign people]
  Active must end ──► Move to Muttafiqeen (or soft-remove paths)
```

---

## 3. Ownership analysis

“Who SHOULD own it?” is organizational judgment grounded in current behaviour — not an implementation plan.

| Capability | Current surface owner | Suggested capability owner | Reasoning |
|------------|----------------------|----------------------------|-----------|
| P-01 Manage Rukns | Rukn module | **Rukn** | Leader identity is distinct from Person registry |
| P-02 Rukn connection desk | Rukn detail | **Shared (Rukn + Connections)** | Rukn-centric view of Connections capability |
| P-03 Manage Karkuns | Karkuns | **Karkuns** | Campaign Person registry |
| P-04 Manage Muttafiqeen | Muttafiqeen | **Muttafiqeen** (or shared Person registry) | Same docs, different category — clear business separation |
| P-05 Person profile | Shared URL under Karkun path | **Shared capability** | Correct that one profile serves both registries |
| P-06 Reclassify | Profile maintenance | **Shared (Person classification)** | Cross-registry; not Connect |
| P-07 Admin create Karkun | Karkuns | **Karkuns** | Registry write |
| P-08 Create Muttafiq | Muttafiqeen | **Muttafiqeen** | Registry write |
| P-09 Request new Karkun | Rukn Connect | **Shared (Intake)** surfaced via Connect | Field discovery starts on Connect; authority is Admin |
| P-10/11 Approve/Reject request | **Dashboard** | **Karkuns / Intake** (Admin) | **OBSERVATION:** capability is People intake; surface is Operations-facing dashboard |
| P-12 Assign/Connect | Connections + Connect + inline | **Connections** (with Rukn Connect as Rukn portal) | Ownership change is the Connections domain |
| P-13/14 Connect / Connected pools | Rukn nav | **Connections** (Rukn-facing) | Worklists over connection state |
| P-15–18 Transfer/Remove/Restore/Replace | Connections (+ Rukn detail) | **Connections** | Admin ownership desk |
| P-19/20 Assignment review | Connections + Rukn journey | **Connections** | Ownership dispute / change request |
| P-21/23 Full edit | Registries | **Respective registries** | — |
| P-22 Rukn enrichment | Connected journey | **Shared (profile) under Connections context** | Editing while Connected |
| P-24–28 Search | Multiple | **Shared search capability** | Cross-cutting; not a single page |
| P-29 Ledger | Service-level | **Connections** | History of ownership |

---

## 4. Duplication analysis

Identify only — no merge recommendation.

### 4.1 Duplication matrix

| Area | Duplicate / parallel instances | Type | Evidence class |
|------|-------------------------------|------|----------------|
| Person create/edit UI | `PersonFormModal` used for Rukn, Karkun, Muttafiq with label/kind switches | Shared form (intentional reuse) | **FACT** |
| New Person intake | Admin `createKarkun` vs Rukn request → Admin approve create/link | Parallel intake paths | **FACT** |
| Connect confirm | Admin Connections + Rukn Connect both use `ConnectKarkunConfirmModal` | Shared modal, dual entry | **FACT** |
| Assign entry points | Inline `RuknAssignmentSelect`, Assign modals, Connections desk, approve-auto-assign | Multiple triggers → same engine | **FACT** / **OBSERVATION** |
| Replace UIs | `ReplaceKarkunModal` and `ReplaceAssignmentModal` | Parallel replace forms | **FACT** |
| Transfer entry | Connections page, Rukn detail, Assignment review queue | Same modal + engine | **FACT** |
| Profile edit | Full profile page, PersonFormModal, Rukn `ProfileCompletionReminder` | Parallel edit surfaces | **FACT** |
| Terminology | “Assignments” route/service vs “Connections” nav/collection | Naming duplication / ambiguity | **OBSERVATION** |
| Search algorithms | Admin contiguous `includes` vs Rukn tokenized registry search | Dual search behaviour | **OBSERVATION** |
| Pending queues | New Karkun requests (Dashboard) vs Assignment reviews (Connections) | Two Admin queues for People-adjacent decisions | **OBSERVATION** |
| Workflow README vs live path | `src/workflows/assignment` README vs live `assignmentService` | Possible dead / aspirational orchestration | **HYPOTHESIS** (exports usage not fully traced) |

### 4.2 Duplicated ownership (capability vs surface)

| Capability | Surfaces that appear to “own” it today |
|------------|----------------------------------------|
| Assign/Connect | Connections page, Karkun list inline, Karkun profile, Rukn Connect, Approve request |
| Transfer | Connections, Rukn detail, Review queue |
| New Karkun decision | Dashboard queue only (not under Karkuns or Connections nav) |

---

## 5. Dependency overview (high-level)

### 5.1 Repositories & collections

| Capability group | Repositories (interfaces) | Firestore / settings |
|------------------|---------------------------|----------------------|
| Rukn registry | `RuknRepository` | `rukns/{id}` |
| Karkun / Muttafiq | `KarkunRepository` | `karkuns/{id}` (shared) |
| Connections | `ConnectionRepository` | `connections/{assignmentId}`, `settings/connectionMeta` |
| New Karkun requests | Firestore settings cache / persist helpers | `settings/karkunRequests` (blob, not subcollection) |
| IDs | Counter settings | `settings/karkunCounter` |
| Ledger | Connection ledger repo | `connectionLedger/{id}` |
| Activity | Activity logging | `activityLogs/{id}` |

### 5.2 Shared services / stores

| Layer | Role |
|-------|------|
| `peopleStore` / `peopleClassification` | In-memory registry API, category, eligibility, gender assign rules |
| `assignmentStore` + `assignmentService` + `assignmentEngine` | Connection lifecycle |
| `karkunRequestStore` + `karkunRequestService` | Pending New Karkun workflow |
| `assignmentReviewStore` + `assignmentReviewService` | Rukn→Admin ownership review (**in-memory**) |
| `peopleRegistryPersistence` / registry maintenance | Durable Person writes, archive/soft-remove, classification moves |
| Auth claims (`role`, `ruknId`) | Gate Admin vs Rukn Firestore + routes |

### 5.3 Core business rules (People)

| Rule | Evidence |
|------|----------|
| Only Admin creates `karkuns` docs | `firestore.rules` |
| Same-gender assignment only | `canAssignByGender` / peopleStore |
| Muttafiq not campaign-eligible | `isCampaignEligible` / people-classification.md |
| Cannot move to Muttafiqeen while Active connection | `getMoveToMuttafiqeenBlockers` |
| Rukn cannot reassign Karkun to another Rukn via client update | `ruknMayUpdateKarkun` |
| Connect writes need JWT role claims | `ensureJwtRoleClaim` / KC-0061 lineage |

---

## 6. Findings

### 6.1 What is correctly organized today

**FACT / OBSERVATION:**

1. **Clear Admin registries** for Rukn, Karkuns, Muttafiqeen, Connections match distinct business nouns.
2. **Single Person document model** with category split is coherent and documented (`people-classification.md`).
3. **Rukn Connect / Connected** mirrors Available vs Active connection states without exposing Muttafiqeen.
4. **Hard security split** (Admin create Person; Rukn request) matches real-world approval needs.
5. **Shared profile URL** for Karkun and Muttafiq avoids duplicate profile products.

### 6.2 What is confusing

**OBSERVATION:**

1. **Assignment vs Connection** naming across route (`/admin/assignments`), nav (“Connections”), types (`AssignmentRecord`), and collection (`connections`).
2. **New Karkun approval** is a People intake capability but lives on the **Dashboard**, away from Karkuns / Connections.
3. **Two Admin decision queues** (New Karkun requests vs Assignment reviews) with different persistence guarantees.
4. **Top-bar search** wording suggests cross-registry search; behaviour is Karkun-page scoped.
5. **Multiple assign entry points** make “where do I connect someone?” ambiguous for operators (capability is one; surfaces are many).

### 6.3 Capabilities that appear misplaced

| Capability | Why it appears misplaced | Class |
|------------|--------------------------|-------|
| Approve / reject New Karkun (P-10/11) | People intake owned by Dashboard widget | **OBSERVATION** |
| Rukn connection desk actions on Rukn detail (P-02) | Overlaps Connections desk | **OBSERVATION** (may be intentional Rukn-centric view) |

### 6.4 Capabilities that should stay where they are

**RECOMMENDATION** (stability only — not a redesign):

1. Keep **Muttafiqeen as a separate registry surface** while sharing Person storage — business meaning differs from Karkuns.
2. Keep **Rukn Connect / Connected** as Rukn-facing connection worklists.
3. Keep **Admin-only create** for Person documents (security + approval model).
4. Keep **Connections desk** as the Admin ownership operations center (transfer / remove / restore / review).
5. Keep **shared Person profile** for both registries.

### 6.5 Capabilities requiring further investigation

| Topic | Why | Class |
|-------|-----|-------|
| Assignment review durability | No Firestore persist found; multi-device / refresh behaviour unknown in prod | **HYPOTHESIS** / open question |
| Approve + existing Active conflict | create-or-link then assign edge cases | **HYPOTHESIS** |
| Rukn first-class disconnect UX vs rules allowance | Rules allow self→''; product control may be Admin/review only | **Open question** |
| `workflows/assignment` vs `assignmentService` | Possible unused orchestration layer | **HYPOTHESIS** |
| Field-level Rukn profile edit scope | Rules focus on assignment fields; UI enrichment vs full schema | **Open question** |
| Whether New Karkun queue should conceptually belong under Karkuns/Connections | Organizational clarity only | **RECOMMENDATION** (investigate — no implementation) |

---

## 7. Open questions

1. Should **New Karkun approval** be considered a Karkuns capability, a Connections capability, or a dedicated Intake capability that merely *appears* on the Dashboard today?
2. Are **assignment review requests** intended to be durable across sessions/devices?
3. On approve, if mobile already belongs to a Karkun with an **Active** connection elsewhere, what is the guaranteed product outcome?
4. Is there a supported **Rukn self-disconnect** path in UI, or only Admin release / review Release?
5. Is Admin top-bar search intentionally Karkun-only despite the placeholder?
6. Are `ReplaceKarkunModal` and `ReplaceAssignmentModal` both still live paths for different scenarios, or historical parallel?

---

## 8. Evidence index (primary)

| Area | Paths |
|------|-------|
| Routes / nav | `src/constants/routes.ts`, `adminNavigation.ts`, `AppRouter.tsx`, `RuknLayout.tsx` |
| Classification | `docs/architecture/people-classification.md`, `src/lib/peopleClassification.ts`, `peopleStore.ts` |
| Intake | `src/services/karkunRequestService.ts`, `PendingKarkunRequestQueue.tsx`, `NewKarkunRequestModal` (via AvailableKarkunPage) |
| Connections | `assignmentService.ts`, `assignmentEngine.ts`, `AssignmentManagementPage.tsx`, `AvailableKarkunPage.tsx`, `MyKarkunPage.tsx` |
| Review | `assignmentReviewService.ts`, `assignmentReviewStore.ts`, `AssignmentReviewQueue.tsx` |
| Security | `firestore.rules`, `authorization.ts`, claims provision lineage |
| Collections | `src/repositories/firestore/collections.ts` |

---

## 9. Explicit non-actions (this ticket)

- No application code, UI, routing, repository, Firestore, or business-logic changes  
- No implementation plan  
- No navigation redesign  
- No merge of pages or capabilities  

**Stop after KC-0103A.**
