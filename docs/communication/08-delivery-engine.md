# KC-0090 — Delivery Engine
## Channel-Independent Delivery Architecture (Documented Only)

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 08 — Delivery Engine  
> **Nature:** Architecture documentation — **adapters not implemented in this sprint**  
> **Status:** Authoritative conceptual design

---

## 1. Purpose

The **Delivery Engine** executes Communications across channels without making any single channel the product.

Product logic decides **who**, **why**, **what**, and **when**.  
The Delivery Engine decides **how** a payload is handed to a channel adapter and how outcomes are recorded.

---

## 2. Design Rules

| Rule | Statement |
|------|-----------|
| Channel Independent | Core COS never hardcodes WhatsApp as the only path |
| Adapter pattern | Each channel is a pluggable adapter behind a stable contract |
| Permission upstream | Audience must already be authorized before delivery |
| Policy-driven | Delivery Policy selects preference, quiet hours, retries, failover |
| Observable | Every attempt has a recorded outcome suitable for Delivery Center |
| No schema change in KC-0090 | This document does not alter Firestore or repositories |

---

## 3. Logical Pipeline

```text
Communication (intent + audience + template + policy + journey alignment)
        │
        ▼
  Audience already resolved & authorized
        │
        ▼
  Template render (per recipient, merge fields)
        │
        ▼
  Delivery Policy evaluation
        │  · preferred channel order
        │  · quiet hours / emergency override
        │  · consent / capability checks
        ▼
  Adapter selection
        │
        ├── WhatsApp Adapter
        ├── SMS Adapter
        ├── Email Adapter
        └── Future adapters…
        │
        ▼
  Delivery attempt + status
        │
        ▼
  Delivery Center / history (Admin); scoped history (Rukn)
```

---

## 4. Initial Supported Channels

| Channel | Role in COS |
|---------|-------------|
| **WhatsApp** | Primary field channel in many localities; still an adapter |
| **SMS** | Reach when WhatsApp unavailable or policy prefers SMS |
| **Email** | Longer-form or formal mission communication |

COS product language must remain **multi-channel**, never WhatsApp-only.

---

## 5. Future Adapters (Documented, Not Implemented)

| Adapter | Notes |
|---------|-------|
| Push Notifications | In-app / device push |
| Voice Calls | Click-to-call or telephony bridge — human still executes relationship |
| Telegram | Optional messenger adapter |
| Signal | Optional messenger adapter |
| External APIs | Jamaat or vendor integrations |

Future adapters plug into the same engine contract. They do not create new communication workspaces.

---

## 6. Conceptual Adapter Contract

Documentation-level contract (not TypeScript in this sprint):

| Operation | Responsibility |
|-----------|----------------|
| `capabilities(recipient)` | Which channels are available / consented |
| `send(attempt)` | Hand off rendered payload |
| `status(attemptId)` | Provider or local status |
| `normalizeError(error)` | Map to retryable / terminal failure |

Adapters must not expand audience scope.

---

## 7. Delivery Policy (Conceptual)

| Policy concern | Examples |
|----------------|----------|
| Channel preference | WhatsApp → SMS → Email |
| Timing | Quiet hours, local timezone, mission calendar |
| Retry | Transient failure backoff |
| Failover | Fall to next channel if policy allows |
| Emergency | Admin-bounded override |
| Consent | Do not send on refused channels |

Policies live as **configuration** (see Shared Libraries / Settings), not scattered `if (whatsapp)` product branches.

---

## 8. Relationship to Existing Communication Services

Karkun Connect today includes communication services and a Communication Centre (operational precursor).

KC-0090 **documents** the target Delivery Engine architecture. It does **not**:

- Refactor existing delivery code
- Replace providers
- Change `CommunicationRepository`
- Add new Firestore collections

A future implementation sprint must map this architecture onto existing services or propose an ADR if boundaries are insufficient.

---

## 9. Digital Rafeeq Separation

| Layer | Role |
|-------|------|
| Delivery Engine | Transmits rendered messages |
| Digital Rafeeq | Conversational guidance; may *suggest* a send |
| DRCS | Tone standard across channels |

Rafeeq is not a channel adapter. Delivery is not a companion.

---

## 10. Failure & Reporting

Delivery Center (Admin) surfaces:

- Queued / sent / failed / retrying
- Channel-specific error classes
- Audience-level success ratios **in service of mission action** (PX Constitution: action before analytics)

Rukn sees only outcomes for own Connected Karkun communications.

---

## 11. Related Documents

- [02-architecture.md](./02-architecture.md)
- [03-domain-model.md](./03-domain-model.md)
- [06-admin-communication.md](./06-admin-communication.md)
- [KC-003 Communication Standard](../kc-003-digital-rafeeq/06-communication-standard.md)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Adapter implementation | None |
| Code impact | None |
