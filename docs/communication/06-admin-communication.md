# KC-0090 — Admin Communication
## Mission-Wide Communication Workspace

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 06 — Admin Communication  
> **Nature:** Product specification — no UI implementation  
> **Status:** Authoritative

---

## 1. Purpose

**Admin Communication** is the mission-wide communication and oversight workspace of Karkun COS.

Administrators use it to configure, send, monitor, and improve communication that supports the campaign — without treating communication as a private feature of any single campaign module.

---

## 2. Audience

Admin Communication may address:

| Audience | Description |
|----------|-------------|
| **All Rukns** | Entire active Rukn body for the mission |
| **Selected Rukns** | Explicit subset of Rukns |
| **All Karkuns** | Entire Karkun registry in mission scope |
| **Selected Karkuns** | Explicit subset of Karkuns |
| **Static Groups** | Manually maintained membership |
| **Dynamic Groups** | Rule-resolved membership (e.g., journey stage, connection status) |
| **Hybrid Groups** | Static seed + dynamic rules |

Audience resolution must respect [04-permission-matrix.md](./04-permission-matrix.md).

---

## 3. Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Mission Center** | Single operational view of mission communication health, priorities, and blockers |
| **Campaign Communication** | Configure how the active campaign uses COS libraries (campaign configures; COS owns) |
| **Audience Management** | Create and maintain Static / Dynamic / Hybrid groups; select people |
| **Journey Management** | Align journeys and stage-linked communication patterns |
| **Templates** | Browse, configure, and govern Template Library usage for the mission |
| **Delivery Center** | Monitor delivery attempts across WhatsApp, SMS, Email; handle failures |
| **Reports** | Relationship- and execution-supporting communication reports (action before vanity analytics) |
| **Automation** | Configure quiet automations that recommend or schedule communications per charter |
| **Digital Rafeeq Guidance** | Admin-facing coaching / guidance surfaces that preserve dignity (no surveillance tone) |

---

## 4. Navigation Mapping

See [05-navigation.md](./05-navigation.md):

Mission Center · Workspace · Audience · Journeys · Templates · Delivery · Reports · Settings

Campaign Communication, Automation, and Rafeeq Guidance nest under these roots rather than forming a third workspace.

---

## 5. Operating Rules

1. **Mission First** — Every broadcast or selective send names the objective it serves.
2. **Journey First** — Prefer stage-appropriate templates over generic blasts.
3. **Configuration over Implementation** — Use Shared Libraries; avoid one-off campaign hardcoding.
4. **Channel Independent** — Choose channel via Delivery Policy, not by navigating to a WhatsApp-only module.
5. **Support the Rukn** — Admin communication should make field service clearer, never more surveilled.

---

## 6. Relationship to Rukn Communication

| Admin Communication | Rukn Communication |
|---------------------|--------------------|
| Mission-wide | Connected Karkuns only |
| Configures libraries & policies | Consumes allowed templates & personal relationship tools |
| Oversight & coaching | Companion Ledger & day-to-day relationship work |

Admin may communicate **to** Rukns; that does not grant Rukns Admin audience powers.

---

## 7. Non-Goals

- No new screens or routes in KC-0090
- No schema changes for groups, templates, or delivery
- No replacement of Authentication or Connection Engine

---

## 8. Related Documents

- [01-product-vision.md](./01-product-vision.md)
- [04-permission-matrix.md](./04-permission-matrix.md)
- [05-navigation.md](./05-navigation.md)
- [08-delivery-engine.md](./08-delivery-engine.md)
- [09-shared-libraries.md](./09-shared-libraries.md)

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Code impact | None |
