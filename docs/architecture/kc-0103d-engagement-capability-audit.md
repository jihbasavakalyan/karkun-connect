# KC-0103D — Engagement Capability Audit

**Type:** Product audit (documentation only)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Status:** Complete  
**Related:** [KC-0103A People](./kc-0103a-people-capability-audit.md) · [KC-0103B Ownership](./kc-0103b-people-ownership-validation.md) · [KC-0103C Operations](./kc-0103c-operations-capability-audit.md)  
**Scope:** Engagement — Communication, Lists, audience, broadcast, WhatsApp, templates, history, delivery, reminders  
**Excluded:** People, Operations, Dashboard, Reporting as primary audit targets (dependencies noted only)

### Evidence labels

| Label | Meaning |
|-------|---------|
| **FACT** | Directly evidenced in source, rules, or product docs |
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

## Executive Summary

Engagement today is a **WhatsApp Web–assisted compose + local/Firestore history** system, not a live Meta Cloud delivery engine.

**Highest-signal findings:**

1. **FACT:** Admin owns Communication workspace + Lists; Rukn owns a relationship-first Communication workspace (Connected Karkuns) without Lists.
2. **FACT:** Multi-recipient “broadcast” is primarily **personalized per-recipient `wa.me` launches** plus history recorded as `queued`.
3. **FACT:** Delivery status updates, retry queue, and campaign automation **dispatch** are explicit stubs (Sprint 16/17 reserved).
4. **FACT:** Messaging entry points are duplicated across Communication module, Lists, Dashboard Notify, People bulk WhatsApp, and Connection Journey.
5. **OBSERVATION:** COS “Audiences / Delivery / Conversations” sections are largely structural placeholders; Lists + Messaging Tools hold the real capability.

---

## 1. Capability Inventory

Capabilities are business verbs. “Current owner page” is the primary surface today.

### 1.1 Communication workspace & compose

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| E-01 | Open Communication workspace | Access messaging tools and (Admin) COS sections | Admin / Rukn | Nav Communication | Section query | Workspace UI | `/admin/communication`; `/rukn/communication` | Routes, navigation libs |
| E-02 | Compose individual message | Build WhatsApp message to one recipient | Admin / Rukn (scoped) | Composer modal | Recipient, template/body | History row + optional WA launch | Communication panels; Journey; Dashboard | `MessageComposerModal`, `communicationService` |
| E-03 | Compose / send personalized bulk | Mail-merge message to many recipients | Admin (primary) | Multi-recipient composer | Recipient list, template | Per-recipient WA tabs + queued history | Lists Broadcast; Communication Broadcast; People bulk | `PersonalizedBulkComposerModal`, `personalizedBulkSend` |
| E-04 | Official communications launch | Send from official template library | Admin (Rukn official locked) | Official panel | Template + recipient | WA launch + history | Communication Official panel | Templates store |
| E-05 | Contact shortcuts | Call / WhatsApp / email without full composer | Both | Contact action bar / cards | Mobile | `tel:` / `wa.me` / `mailto:` | Cards, companion, ContactActionBar | `personContactLinks` |

### 1.2 Lists & audience

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| E-06 | Build dynamic campaign lists | Filter registry into audience sets | Admin | Lists page | Filter definitions | Ephemeral recipient set (code filters) | `/admin/lists` | `dynamicCampaignLists.ts`, People registry |
| E-07 | Create / manage saved broadcast lists | Persist reusable audiences | Admin | Lists page CRUD | Name, members | `settings/broadcast_{id}` docs | `/admin/lists` | `broadcastListStore` |
| E-08 | Select Arkaan (all Rukns) audience | Permanent leadership group | Admin | Broadcast / Daily Reports | Rukn Master | Recipient group | Broadcast panel; Daily Reports | `arkaanRecipientGroup.ts` |
| E-09 | Pick individual Karkun or Rukn | One-off recipient selection | Admin | Individual / Rukn / Karkun tools | Search pick | Composer | Communication Messaging Tools | People / Rukn data |
| E-10 | COS Audiences section | Intended audience center | Admin | Communication Workspace | — | Placeholder UI | Communication `audiences` section | Not wired to list store |

### 1.3 Templates, history, delivery, automation

| ID | Capability | Purpose | Primary user | Trigger | Inputs | Outputs | Current owner page | Dependencies |
|----|------------|---------|--------------|---------|--------|---------|-------------------|--------------|
| E-11 | Manage templates | Official + custom message templates | Admin (custom); read official | Templates / Official panels | Template fields | Store in communications state | Communication Templates | `templateService`, store |
| E-12 | Record message history | Local audit of composed/queued sends | Admin (Firestore); callers write via service | After send path | Channel, recipient, body, status | History entries | History / Delivery panels | `communications/state` |
| E-13 | View delivery / failed / scheduled UI | Operator view of statuses | Admin | Messaging Tools sections | History filters | Badges / lists | Delivery, Failed, Scheduled panels | Status enum; stubs for update/retry |
| E-14 | Configure WhatsApp settings UI | Footer / settings for WA messaging | Admin | Tool settings | Settings fields | Persisted settings blob | WhatsApp settings panel | Store |
| E-15 | Manage automation rules (registry) | Toggle campaign reminder rules | Admin | Automation panel | Rule definitions | Rules in store (disabled by default) | Automation Rules panel | `notificationService` stub dispatch |
| E-16 | Schedule message | Capture scheduled send intent | Admin / callers | Composer schedule | Time + payload | Scheduled record in store | Composer / Scheduled panel | `schedulingService` — **no executor found** |
| E-17 | Daily reports distribute | Generate report text and send to Arkaan | Admin | Daily Reports panel | Report content | Copy/export + Arkaan send path | Daily Reports panel | Arkaan group + composer/send |
| E-18 | Rukn companion workspace | Per-Karkun engagement companion surface | Rukn | Companion route | Connected karkunId | Relationship UI; **no new messaging persistence** (page constraint) | `/rukn/communication/companion/:id` | Connected scope |
| E-19 | Reminder / appreciation draft text | Pre-fill message copy for notify flows | Admin (dashboard); Journey WA reminder | Notify / Remind actions | Names | Draft string only | Dashboard drafts; Journey | `dashboardCommunicationDrafts` |
| E-20 | True delivery / read tracking | Webhook-updated sent/delivered/read | — | — | — | — | Stubs only | `deliveryService` reserved Sprint 16 |
| E-21 | Engagement analytics (opens, replies, CTR) | Measure audience response | — | — | — | — | **Not present** as domain entities | — |

---

## 2. Communication Workflow

### 2.1 How is an audience selected?

| Path | Mechanism | Persisted? |
|------|-----------|------------|
| Dynamic Lists | Code filters over Karkun registry | No — computed |
| Saved Lists | Curated member lists | Yes — `settings/broadcast_*` |
| Arkaan | All Rukns from master | Derived |
| Individual picker | Search select one person | No |
| Dashboard / People selection | Checkbox sets | Session UI only |
| Rukn | Connected Karkuns only (UI scoping) | Via Connections |

### 2.2 How are Lists created and reused?

```text
Admin → /admin/lists
  Dynamic list → apply filters → Broadcast / compose (ephemeral audience)
  Saved list → createBroadcastList → members CRUD → reuse → open composer
```

**FACT:** Saved lists persist via `broadcastListStore` to Firestore settings docs. Dynamic lists are definitions in `dynamicCampaignLists.ts`, not Firestore documents.

### 2.3 How is a campaign message composed and delivered?

```text
Select audience
  → MessageComposerModal
      → 1 recipient: compose / optional Schedule / optional “Send via WhatsApp” (wa.me)
      → >1 recipients: PersonalizedBulkComposerModal
            → mail-merge
            → launch WhatsApp Web tabs (wa.me)
            → on launch success: sendIndividualMessage → history status queued
  → sendIndividualMessage also attempts POST /api/communication/send
      → on API miss: still records local queued history (Sprint 15 comment)
```

**FACT:** Frontend must not call Meta directly (`communicationContracts` comment). Client API exists; **no** `api/communication*` server route found under repo `api/` for live Meta adapter.

**FACT:** Non-WhatsApp channels rejected: SMS/EMAIL “not available yet” (`communicationService`).

### 2.4 Where is history recorded?

**FACT:** `communicationStore.history` inside Firestore doc `communications/state` (Admin-only rules). UI panels filter via `historyService`.

### 2.5 How are follow-up communications handled?

| Mechanism | What it does | Class |
|-----------|--------------|-------|
| Automation rule registry | Defines triggers (assignment, meeting, ijtema, JIH, BM, follow-up, milestone) — default disabled | **FACT** |
| `dispatchCampaignEvent` | Empty stub — Sprint 17 | **FACT** |
| Dashboard Remind / Appreciate | Opens composer with draft text | **FACT** |
| Connection Journey reminder | Builds WA deep link with reminder copy | **FACT** |
| Ops follow-up module | **Operations** follow-up records — not Engagement delivery | Dependency only |

**OBSERVATION:** “Follow-up communications” are mostly **manual** or **draft-assisted**; automated dispatch is not live.

### 2.6 Lifecycle sketch

```text
Audience (Lists | Arkaan | picker | selection)
    → Compose (template / free text / official)
    → WhatsApp Web deep link (operator device session)
    → History queued in communications/state (Admin)
    → Delivery badges show queued… (no webhook updater)
```

---

## 3. Ownership Analysis

Distinguish **capability ownership** (mutation / system of record) vs **executive visibility** (summary / launch from elsewhere).

| Capability | Current surface owner | Logical capability owner | Supporting modules | Executive visibility? |
|------------|----------------------|--------------------------|--------------------|------------------------|
| Individual / bulk WhatsApp compose | Communication (+ Lists, Journey, People, Dashboard launches) | **Communication** | Composer, communicationService | Dashboard Notify launches composer |
| Saved / dynamic Lists | Lists page | **Lists** (audience) | broadcastListStore, dynamicCampaignLists | — |
| Arkaan broadcast | Communication Broadcast / Daily Reports | **Communication** | arkaanRecipientGroup | — |
| Templates | Communication Templates / Official | **Communication** | templateService | — |
| Message history | Communication History / Delivery UI | **Communication** | communications/state | Dashboard may show counts |
| Delivery truth / webhooks | Stubs | Intended **Delivery Engine** (not live) | deliveryService | COS Delivery placeholder |
| Automation dispatch | Rules UI only | Intended **Automation** (not live) | notificationService | — |
| Rukn relationship messaging | Rukn Communication / Journey | **Communication (Rukn-scoped)** | Connected set from People | — |
| Companion | Companion route | Engagement companion (thin) | Explicitly limited persistence | — |
| COS Audiences | Placeholder under Communication | Overlaps **Lists** conceptually | — | Structural only |

**OBSERVATION:** Lists and Communication are separate Admin nav peers; audience capability lives primarily under Lists, while send capability lives under Communication — with Broadcast panels overlapping both.

---

## 4. Duplication Matrix

Identify only — no merge recommendation.

| Area | Duplicate / parallel instances | Type | Class |
|------|-------------------------------|------|-------|
| Messaging entry | Communication module, Lists Broadcast, Dashboard Notify/Appreciate/Remind, Connection Journey, Karkun/Muttafiqeen bulk WhatsApp, ContactActionBar deep links | Multiple triggers → same composer/WA utilities | **FACT** |
| Audience selection | Dynamic Lists, saved Lists, Arkaan group, Individual pickers, COS Audiences placeholder, People page selection | Overlapping audience models | **FACT** / **OBSERVATION** |
| Broadcast UX | BroadcastComposerPanel vs Lists Broadcast vs Daily Reports Arkaan send | Parallel “send to many” | **FACT** |
| Custom lists | Lists saved lists **live**; Broadcast panel “Custom recipient list” marked coming later | Incomplete overlap | **FACT** |
| Templates | Official panel + Template management + composer template pickers | Multiple surfaces, one store | **OBSERVATION** |
| Reminder copy | Dashboard drafts, Journey WA reminder, automation rules (undispatched), Ops follow-up | Same business intent, different engines | **OBSERVATION** |
| Delivery UI vs truth | Status badges / Failed panel vs stub `updateDeliveryStatus` | UI ahead of pipeline | **FACT** |
| Admin COS vs Messaging Tools | Dual section trees in one Communication module | Structural duplication | **OBSERVATION** |

---

## 5. Dependency Overview

### 5.1 Repositories & Firestore

| Capability group | Persistence | Path |
|------------------|-------------|------|
| Templates, history, rules, scheduled, WA settings | Communication repository / blob | `communications/state` |
| Saved broadcast lists | Settings docs | `settings/broadcast_{listId}` |
| Dynamic lists | None (computed) | — |
| Delivery events / threads | None | — |

**FACT:** `firestore.rules` — `communications/{docId}` Admin read/write only.

### 5.2 Shared services / stores

| Layer | Role |
|-------|------|
| `communicationStore` + `useCommunication` | State + send facade |
| `communicationService` | send individual/broadcast; API attempt; queue history |
| `broadcastListStore` | Saved lists CRUD |
| `templateService` / `historyService` / `deliveryService` / `schedulingService` / `notificationService` | Domain helpers (several Sprint-reserved) |
| `communicationClient` + contracts | Future backend API |
| `personalizedBulkSend` / `whatsappWebLaunch` / `personContactLinks` | Device-side delivery |
| `dynamicCampaignLists` / `arkaanRecipientGroup` | Audience builders |
| `dashboardCommunicationDrafts` | Dashboard text drafts |

### 5.3 External integrations

| Integration | Reality | Class |
|-------------|---------|-------|
| WhatsApp | `https://wa.me/91…` deep link / Web tab | **FACT** |
| Phone | `tel:+91…` | **FACT** |
| Email | `mailto:` shortcuts | **FACT** |
| Meta Cloud API | Client contracts only; no live server adapter found in repo `api/` | **FACT** |
| SMS | Channel type exists; send rejects as unavailable | **FACT** |

### 5.4 Business rules (Engagement)

| Rule | Evidence |
|------|----------|
| WhatsApp-only send in service | `communicationService` rejects other channels |
| Official templates locked for Rukn in composer | Composer `isOfficialLocked` / footer mode |
| Rukn audience = Connected Karkuns (UI/docs) | Permission matrix doc + companion checks |
| Service-boundary enforcement incomplete | `docs/communication/04-permission-matrix.md` notes no enforcement code in that sprint |
| Communications Firestore Admin-only | `firestore.rules` |
| History typically written as `queued` | Sprint 15 local queue path |
| Delivery webhook / retry / automation dispatch reserved | Explicit empty functions |

---

## 6. Findings

### 6.1 Correctly organized capabilities

**FACT / OBSERVATION:**

1. **Admin Lists** provide a coherent audience workshop (dynamic + saved).
2. **Shared composer** (`MessageComposerModal` / bulk) is reused across entry points — intentional shared capability.
3. **Template + history stores** give a durable Admin audit trail of queued compositions.
4. **Rukn Communication** is correctly scoped toward Connected relationships rather than mission-wide broadcast.
5. **Channel strategy** is explicit: WhatsApp-first; Meta not called from frontend.

### 6.2 Confusing ownership

**OBSERVATION:**

1. **Lists vs Communication Broadcast vs COS Audiences** — three audience concepts; only Lists + Arkaan are real.
2. **“Broadcast”** product language vs personalized multi-`wa.me` implementation.
3. **Delivery Center UI** implies live delivery ops; pipeline is stubbed.
4. **Automation rules UI** implies event-driven reminders; `dispatchCampaignEvent` is empty.
5. **Dashboard / People / Journey** launch messaging without making Engagement ownership obvious to operators.

### 6.3 Misplaced capabilities (surface vs domain)

| Capability | Why it appears misplaced | Class |
|------------|--------------------------|-------|
| Dashboard Notify/Appreciate/Remind | Engagement compose launched from Dashboard | **OBSERVATION** (launch vs owner) |
| People bulk WhatsApp | Engagement send from People registries | **OBSERVATION** |
| COS Audiences placeholder | Lives under Communication but duplicates Lists | **OBSERVATION** |
| Ops follow-up vs message reminders | Different domains share “follow-up/remind” vocabulary | **OBSERVATION** |

### 6.4 Architectural gaps

| Gap | Evidence | Class |
|-----|----------|-------|
| No live delivery receipts | `updateDeliveryStatus` stub | **FACT** |
| No retry queue | `retryFailedMessage` stub | **FACT** |
| No scheduled send executor | Schedule persists; no runner found | **FACT** / **OBSERVATION** |
| No automation dispatch | `dispatchCampaignEvent` stub | **FACT** |
| No engagement analytics domain | No open/reply/CTR entities | **FACT** |
| Rukn vs Admin Firestore for communications | Admin-only rules vs Rukn send callers | **FACT** + open question |
| Meta Cloud backend not present in repo API routes | Client-only contracts | **FACT** |
| Conversations / companion ledger placeholders | COS / companion constraints | **FACT** |

### 6.5 Open questions requiring future validation

1. Should Rukn message history persist to shared `communications/state`, a Rukn-scoped doc, or remain device-local until rules change?
2. Is Lists the **canonical** audience engine, with COS Audiences deferred or retired?
3. Is personalized multi-send the permanent “broadcast” product, or is identical-body broadcast still required?
4. Will Sprint 16+ deliver a real Meta/backend adapter, or remain WhatsApp-Web-assisted for the campaign?
5. Who executes scheduled messages, and under whose WhatsApp session?
6. Should automation rules wire to real campaign events, or stay dormant until a Delivery Engine exists?
7. Should history `queued` after WA open be presented as “sent” in UX, or wait for true receipts?
8. Will Broadcast panel custom lists reuse `broadcastListStore`?
9. Will Connected-Karkun send scope be enforced at the service boundary (not only UI)?
10. On list delete, are orphaned `settings/broadcast_*` docs removed?

---

## 7. Explicit non-actions (this ticket)

- No application code, UI, routing, repository, Firestore, or business-logic changes  
- No navigation redesign  
- No page merges  
- No implementation recommendations beyond labeling gaps for future validation  

**Stop after KC-0103D.**
