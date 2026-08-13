# KC Phase 6 Communication Surfaces — KC-ARCH-009 Gate

**Ticket:** BATCH-06A / TASK-052 → TASK-056  
**Type:** Enhancement (existing Admin Inbox + existing WhatsApp actions)  
**Standards:** KC-ARCH-009 · KC-ARCH-001  
**Authority:** [Phase 0 — CERTIFIED](./kc-post-campaign-phase0-system-mapping.md) · [Phase 5 certification](./kc-phase5-certification.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 readiness gate for communication surfaces only  
**Certification:** [TASK-053 — PHASE 6 CERTIFIED](./kc-phase6-certification.md) (authoritative TASK-046–049; this gate’s original TASK-052–056 label was not applied in code)

Phase 0–5 of prior post-campaign work are already certified and are **not** re-analysed here.

Notifications, Calendar, Occurrence, and tracking rules are **out of scope**. No Vercel deploy.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Refine Admin Inbox; add Rukn → Admin one-way internal message; keep Admin/Rukn WhatsApp actions on existing people surfaces |
| Not | Rukn Inbox, Karkun Inbox, chat, threads, second communication model, notification architecture, Calendar/Occurrence, tracking rules |

**STOP checks (this batch):**

| Check | Result |
|-------|--------|
| Frozen model requires a new chat/thread entity? | **NO** — one-way Inbox records + device WhatsApp only |
| Communications WhatsApp blob is the Rukn→Admin SoT? | **NO** — that blob is Admin-only organisational WhatsApp; using it would mix channels and LWW-risk the shared state |
| New Firestore collection required? | **NO** — reuse `settings/{docId}` (same pattern as `karkunRequests`) |
| Rukn / Karkun Inbox required? | **NO** — forbidden |

**Persistence decision (reuse, not a new system):** Rukn → Admin internal messages persist as `settings/ruknAdminMessages` (array merge by id). This is the existing settings collection and the existing Admin Inbox read model (`InboxEngine` kind `rukn_message`). It is **not** a second communication product and **not** a new collection.

---

## Impact (this batch only)

| Area | Impacted? | How |
|------|-----------|-----|
| Admin Inbox UI | Y | Intake + internal Rukn messages only; WhatsApp history removed from Inbox |
| InboxEngine | Y | `rukn_message` sourced from `ruknAdminMessages`, not WhatsApp history |
| Settings repository / Firestore rules | Y | `settings/ruknAdminMessages`; Rukn create/update; Admin read/update; transactional merge |
| Rukn Home | Y | One-way “Message Administrator” compose (not an inbox) |
| Admin → Rukn / Karkun WhatsApp | Y | Existing `CommunicationActions` / Official Briefing / device `wa.me` — labels only where needed |
| Rukn → Karkun WhatsApp | N (preserve) | Existing device WhatsApp on Connected / Companion / journey |
| Notifications / Calendar / Occurrence / tracking | N | Untouched |
| communications blob | N | WhatsApp history stays there; no longer mapped into Inbox |

---

## Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| People intake (`karkunRequests`) | **HIGH** if mixed into the same merge blob | Separate settings doc; intake merge unchanged |
| WhatsApp communications blob | **HIGH** if Rukn writes the shared state | Rukn does not write `communications` |
| Chat / thread product | **HIGH** if reply threads added | One-way records only; no `threadId` / parent / replies |
| Rukn / Karkun Inbox | **HIGH** if new routes | No `/rukn/inbox` or `/karkun/inbox` |
| Bootstrap | MEDIUM | Soft-empty hydrate of the new settings doc |

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Does this create a Rukn or Karkun Inbox? | **NO** |
| Does this create internal chat or threads? | **NO** |
| Does this modify notification / calendar / occurrence / tracking architecture? | **NO** |
| Does this require a new communication collection or chat SoT? | **NO** |
| May implementation start? | **YES** |
