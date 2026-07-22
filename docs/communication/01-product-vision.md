# KC-0090 — Product Vision
## Karkun Communication Operating System (Karkun COS)

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 01 — Product Vision  
> **Nature:** Documentation only — no implementation  
> **Status:** Authoritative product specification

---

## 1. What Karkun COS Is

**Karkun Communication Operating System (Karkun COS)** is a permanent platform capability of Karkun Connect.

It is the product layer that turns campaign execution into **relationship communication** — deliberate, journey-aligned outreach that strengthens bonds between Administrators, Rukns, and Karkuns.

Karkun COS is **not** a messaging product bolted onto the campaign. It is an operating system for how the mission speaks, guides, and follows through.

---

## 2. What Communication Means Here

| Communication **is** | Communication **is not** |
|----------------------|--------------------------|
| Relationship management driven by mission execution | Generic chat or inbox software |
| Journey-aware guidance and follow-through | Channel-first broadcast tooling |
| Configuration of who, when, why, and how | Ad-hoc one-off messages without context |
| A platform capability shared across campaigns | A feature owned by a single campaign |

**Communication is not messaging.**

Messaging is one delivery mechanism. Communication is the discipline of serving people through the campaign journey.

---

## 3. Campaign Relationship

**Campaigns configure communication.**

**Communication does not belong to campaigns.**

| Principle | Meaning |
|-----------|---------|
| Campaign Independent | Templates, audiences, journeys, and delivery policies are platform libraries. A campaign selects and configures them; it does not own the Communication OS. |
| Mission First | Every communication serves the active mission's objectives. |
| Execution First | Communication advances real work — visits, follow-ups, compliance, companionship — not vanity engagement. |

When a campaign ends, the Communication Operating System remains. Libraries, policies, and relationship history persist as platform capability.

---

## 4. Two Workspaces Only

Karkun COS has exactly **two** communication workspaces:

### 4.1 Admin Communication

Mission-wide communication and oversight.

**Audience scope:** All Rukns, Selected Rukns, All Karkuns, Selected Karkuns, Static Groups, Dynamic Groups, Hybrid Groups.

### 4.2 Rukn Communication

Relationship communication with **Connected Karkuns** only.

**Audience scope:** Only the Rukn's Connected Karkuns.

**Organizing principle:** Always centered on **Connected Karkuns**, not channels.

No other communication workspace is authorized by this specification.

---

## 5. Communication Principles

These principles are mandatory for all COS design and future implementation.

| Principle | Meaning |
|-----------|---------|
| **Mission First** | Communication exists to serve the active mission, not to maximize message volume. |
| **Execution First** | Prefer communications that advance real campaign work (visits, follow-ups, compliance, companionship). |
| **Journey First** | Content and timing align to Connection Journey stage before convenience or channel habit. |
| **Relationship First** | Success is stronger trust and continuity between people — not open rates alone. |
| **Person First** | Address humans with dignity; Rukn workspace is organized around Connected Karkuns. |
| **Mobile First** | Field Rukn experience is designed for mobile constraints first. |
| **Campaign Independent** | COS is a platform capability; campaigns configure it, they do not own it. |
| **Channel Independent** | WhatsApp, SMS, and Email are adapters; the product is not WhatsApp-only. |
| **Shared Libraries** | Objectives, activities, journeys, templates, tone, audiences, automation, packs, and Rafeeq guidance are reusable libraries. |
| **Configuration over Implementation** | Prefer configuring libraries and policies over writing one-off communication code per campaign. |

Every future feature must also pass the **Four Relationship Checks** in [03-domain-model.md](./03-domain-model.md).

---

## 6. Multi-Channel Reality

Communication remains **channel-independent**.

| Initial channels | Future adapters (documented, not implemented) |
|------------------|-----------------------------------------------|
| WhatsApp | Push Notifications |
| SMS | Voice Calls |
| Email | Telegram, Signal, External APIs |

Channel choice is a **delivery concern**. Relationship, audience, journey, and template decisions remain above the channel layer.

---

## 7. Success Definition

Karkun COS succeeds when:

1. Administrators can configure mission communication without reinventing messaging for each campaign.
2. Rukns experience communication as companionship with Connected Karkuns — not as a channel switchboard.
3. Every outbound or guided communication can answer: *Which mission objective, journey stage, and relationship does this serve?*
4. Digital Rafeeq guidance and Companion Ledger continuity feel native to communication, not external add-ons.

---

## 8. Non-Goals (This Specification)

This document does **not**:

- Change application code, routing, authentication, or state management
- Alter Firestore schema or repository interfaces
- Implement adapters, screens, or placeholder UI
- Redefine Assignment Engine, Campaign Engine, or Execution Automation Framework

Implementation sprints consume this specification; they do not amend product vision casually.

---

## 9. Related Documents

| Document | Role |
|----------|------|
| [02-architecture.md](./02-architecture.md) | Conceptual architecture within frozen platform boundaries |
| [03-domain-model.md](./03-domain-model.md) | Domain entities and relationships |
| [06-admin-communication.md](./06-admin-communication.md) | Admin workspace responsibilities |
| [07-rukn-communication.md](./07-rukn-communication.md) | Rukn workspace responsibilities |
| [Product Experience Constitution](../architecture/product-experience-constitution.md) | Platform UX governance |
| [KC-003 Digital Rafeeq](../kc-003-digital-rafeeq/00-master-index.md) | Companion voice and conversation standards |
| [Automation Philosophy Charter](../architecture/automation-philosophy-charter.md) | Quiet assistance principles |

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Terminology | Prefer **Connection** / **Connected Karkun** over Assignment where product language applies |
| Code impact | None |
