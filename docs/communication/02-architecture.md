# KC-0090 — Architecture
## Communication Operating System (Conceptual)

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 02 — Architecture  
> **Nature:** Documentation only — frozen platform boundaries  
> **Status:** Authoritative conceptual architecture

---

## 1. Architecture Posture

Karkun COS is specified **within** the existing Karkun Connect architecture.

This sprint does **not**:

- Change architecture
- Refactor repositories
- Change Firestore schema
- Change routing
- Change authentication
- Change state management
- Introduce UI or placeholder screens
- Modify production code

If a future implementation proposal requires any of the above, **stop** and document the conflict. Do not implement around frozen boundaries without explicit architectural approval.

---

## 2. Placement in Karkun Connect

```text
┌──────────────────────────────────────────────────────────────┐
│                     Karkun Connect Platform                    │
├──────────────┬───────────────┬───────────────┬───────────────┤
│ Auth (M7)    │ Routing       │ Repositories  │ Execution /   │
│ (unchanged)  │ (unchanged)   │ (unchanged)   │ Automation    │
└──────┬───────┴───────┬───────┴───────┬───────┴───────┬───────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│              Karkun Communication Operating System             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │ Admin Communication │    │ Rukn Communication          │  │
│  │ (mission oversight) │    │ (Connected Karkuns only)    │  │
│  └──────────┬──────────┘    └──────────────┬──────────────┘  │
│             └──────────────┬───────────────┘                   │
│                            ▼                                   │
│              Shared Libraries + Domain Model                   │
│                            ▼                                   │
│                    Delivery Engine                               │
│         (channel-independent; adapters pluggable)              │
└──────────────────────────────────────────────────────────────┘
```

COS consumes platform truth (mission, connections, journeys, execution outcomes). It does not invent parallel people or connection stores.

---

## 3. Architectural Invariants

| Invariant | Rule |
|-----------|------|
| **Two workspaces** | Admin Communication and Rukn Communication only |
| **Connection terminology** | Product language prefers **Connection** / **Connected Karkun**; legacy code may still say Assignment — COS docs do not redefine the Connection Repository |
| **Campaign configures, does not own** | Campaigns select libraries and policies; COS remains platform-level |
| **Channel independence** | Relationship and content decisions are above WhatsApp / SMS / Email |
| **Permission boundary** | Admin = mission-wide; Rukn = Connected Karkuns only |
| **Rafeeq separation** | Digital Rafeeq presents guidance; Delivery Engine delivers messages; Execution Automation may recommend next actions |
| **Repository freeze** | Existing `CommunicationRepository` and related interfaces remain as-is until a dedicated implementation sprint with architecture approval |

---

## 4. Logical Layers

### 4.1 Workspace Layer

| Workspace | Purpose | Primary actor |
|-----------|---------|---------------|
| Admin Communication | Mission-wide communication and oversight | Administrator |
| Rukn Communication | Relationship communication with Connected Karkuns | Rukn |

### 4.2 Domain Layer

Entities: Mission, Journey, Objective, Activity, Audience, Template, Delivery Policy, Communication, Companion Ledger, Digital Rafeeq.

See [03-domain-model.md](./03-domain-model.md).

### 4.3 Shared Library Layer

Reusable configuration libraries (objectives, activities, journeys, templates, tone, audience, automation, campaign packs, Rafeeq guidance).

See [09-shared-libraries.md](./09-shared-libraries.md).

### 4.4 Delivery Engine Layer

Channel-independent orchestration. Initial adapters: WhatsApp, SMS, Email. Future adapters documented only.

See [08-delivery-engine.md](./08-delivery-engine.md).

---

## 5. Relationship to Existing Systems

| Existing system | COS relationship |
|-----------------|------------------|
| **Connection / Assignment Engine** | Source of Connected Karkun truth for Rukn scope. COS does not replace connection lifecycle. |
| **Campaign Engine** | Campaigns configure COS libraries; they do not embed a private messaging stack. |
| **Execution Automation Framework (KC-020)** | May emit structured next-best actions that COS / Rafeeq can present; COS is not the automation engine. |
| **Digital Rafeeq (KC-003)** | Companion voice and guidance inside both workspaces; DRCS governs tone across channels. |
| **Current Admin Communication Centre** | Operational precursor. COS product vision supersedes messaging-centric framing; future implementation must migrate presentation toward COS workspaces without schema/auth/routing redesign unless separately approved. |
| **Firestore / Repository Layer** | Unchanged in KC-0090. Future persistence of COS entities requires an architecture decision record before schema change. |

---

## 6. Data Ownership (Conceptual)

| Concern | Owner of truth | COS role |
|---------|----------------|----------|
| Who is connected to whom | Connection domain | Reads for audience resolution |
| Journey stage per Connected Karkun | Journey / guidance domain | Aligns communication to stage |
| Mission objectives | Mission / campaign domain | Constrains why communication exists |
| Template body & tone | Template / Tone libraries | Configures content |
| Delivery attempt status | Delivery Engine | Records channel outcomes |
| Companion notes / ledger | Companion Ledger | Relationship memory for Rukn workspace |
| Rafeeq utterances | Digital Rafeeq + DRCS | Guidance, not raw broadcast |

COS must not duplicate people registries or invent a second connection graph.

---

## 7. Security & Permission Boundary

Documented fully in [04-permission-matrix.md](./04-permission-matrix.md).

Summary:

- **Administrator** — may address All / Selected Rukns, All / Selected Karkuns, and Groups.
- **Rukn** — may address **only Connected Karkuns**.

Delivery and UI implementations must enforce this boundary; documentation alone does not grant access.

---

## 8. Explicit Non-Changes

The following remain **frozen** under KC-0090:

1. `AppRouter` and route constants — future navigation in [05-navigation.md](./05-navigation.md) is **documentation of intent only**.
2. Firebase Authentication and role guards.
3. Repository interfaces and Firestore collection contracts.
4. Existing stores and state-management patterns.
5. Assignment / Connection engine business rules.

---

## 9. Conflict Protocol

If implementation requires architectural change:

1. Stop.
2. Document the required change and why existing boundaries cannot satisfy the product need.
3. Seek explicit architecture approval.
4. Do not ship silent schema, routing, auth, or repository mutations under a COS feature sprint.

---

## 10. Related Documents

- [01-product-vision.md](./01-product-vision.md)
- [03-domain-model.md](./03-domain-model.md)
- [08-delivery-engine.md](./08-delivery-engine.md)
- [Architecture Index](../architecture/index.md)
- [Repository Layer](../architecture/repository-layer.md)
- [Firestore Backend](../architecture/firestore.md)
- [Execution Automation Framework](../architecture/execution-automation-framework.md)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Code impact | None |
| Architecture impact | Specification within freeze — no runtime change |
