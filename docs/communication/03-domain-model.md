# KC-0090 — Domain Model
## Communication Operating System

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 03 — Domain Model  
> **Nature:** Conceptual relationships only — no schema or code  
> **Status:** Authoritative domain specification

---

## 1. Purpose

This document defines the **conceptual domain model** for Karkun COS: entities, relationships, and ownership rules.

It does **not** define Firestore collections, TypeScript types, or repository methods. Schema design is deferred to a future architecture-approved implementation sprint.

---

## 2. Entity Overview

| Entity | One-line meaning |
|--------|------------------|
| **Mission** | The active campaign mission that communication must serve |
| **Journey** | Ordered relationship progression for a Connected Karkun (or cohort) |
| **Objective** | Measurable mission outcome a communication advances |
| **Activity** | Concrete human or system action within a journey stage |
| **Audience** | Resolved set of people or groups eligible to receive communication |
| **Template** | Reusable content + merge fields, channel-agnostic at authoring time |
| **Delivery Policy** | Rules for channel preference, timing, retries, quiet hours |
| **Communication** | A configured act of relationship outreach (intent + audience + content + policy) |
| **Companion Ledger** | Append-oriented relationship memory for Rukn ↔ Connected Karkun service |
| **Digital Rafeeq** | Companion guidance layer that interprets mission truth into human counsel |

---

## 3. Relationship Diagram

```text
Mission
  ├── has many Objectives
  ├── configures Journeys (via Journey Library)
  └── configures Communication (does not own COS)

Journey
  ├── ordered Stages
  ├── contains Activities
  └── advances toward Objectives

Objective
  └── evaluated by execution outcomes / activities

Activity
  └── may trigger or recommend Communication

Audience
  ├── Static Groups | Dynamic Groups | Hybrid Groups
  ├── Admin: Rukns and/or Karkuns (all / selected / groups)
  └── Rukn: Connected Karkuns only

Template
  ├── references Tone (Tone Library)
  └── rendered for a Communication instance

Delivery Policy
  └── applied by Delivery Engine to a Communication

Communication
  ├── for Audience
  ├── uses Template
  ├── under Delivery Policy
  ├── aligned to Journey stage + Objective
  └── produces delivery attempts (channel-specific)

Companion Ledger
  └── belongs to Rukn ↔ Connected Karkun relationship

Digital Rafeeq
  ├── reads Mission / Journey / Companion Ledger / execution context
  └── guides Rukn (and may inform Admin coaching language)
```

---

## 4. Entity Definitions

### 4.1 Mission

The living campaign purpose under which communication operates.

| Attribute (conceptual) | Notes |
|------------------------|-------|
| Identity | Ties to active campaign / mission context already owned by Campaign domain |
| Objectives | What success looks like |
| Active journeys | Which journey configurations apply |

**Rule:** Communication always answers to Mission. Mission does not absorb COS ownership.

### 4.2 Journey

A structured path of relationship stages (Connection Journey orientation).

| Attribute (conceptual) | Notes |
|------------------------|-------|
| Stages | Ordered progression |
| Activities | Work within stages |
| Alignment | Templates and follow-ups map to stages |

**Rule:** Journey First — communication timing and content prefer journey stage over calendar convenience alone.

### 4.3 Objective

A mission outcome (e.g., first meeting completed, follow-up kept, compliance supported).

**Rule:** Communication without an objective is incomplete configuration.

### 4.4 Activity

A unit of human execution (visit, call, reminder, shared resource, ledger note).

Activities may **recommend** communication; they do not bypass permission scope.

### 4.5 Audience

Resolved recipients.

| Audience mode | Admin Communication | Rukn Communication |
|---------------|---------------------|--------------------|
| All Rukns | Yes | No |
| Selected Rukns | Yes | No |
| All Karkuns | Yes | No |
| Selected Karkuns | Yes | Only if Connected |
| Static Groups | Yes | No (unless group ⊆ Connected Karkuns — future policy TBD; default No) |
| Dynamic Groups | Yes | No (default) |
| Hybrid Groups | Yes | No (default) |
| Connected Karkuns (implicit) | Via selection/groups | **Primary organizing audience** |

**Terminology:** Prefer **Connected Karkun** for Rukn-scoped people. Avoid framing Rukn workspace as "assignments list" in product language.

### 4.6 Template

Reusable message content with merge fields. Authored once; rendered per recipient and channel constraints.

Templates live in the **Template Library** and may reference **Tone Library** entries.

### 4.7 Delivery Policy

Channel preference order, quiet hours, retry, failover, and consent constraints.

Policies are **configuration**, not hard-coded channel branches in product logic.

### 4.8 Communication

The central COS act:

> Intent + Audience + Template + Delivery Policy + Journey/Objective alignment → Delivery attempts

A Communication is relationship management configuration, not a raw WhatsApp payload.

### 4.9 Companion Ledger

Relationship memory for the Rukn workspace: promises, visit intent, personal notes, shared resources context, follow-up commitments.

| Property | Rule |
|----------|------|
| Scope | Rukn ↔ Connected Karkun |
| Orientation | Strengthens continuity; not surveillance of the Rukn |
| Relation to Connection Ledger | Conceptual cousin of immutable connection events; Companion Ledger is **service memory**, not a replacement for connection audit |

**Implementation note:** Existing Connection Ledger / activity log systems remain authoritative for structural connection events. Companion Ledger is a COS product concept; persistence mapping is deferred.

### 4.10 Digital Rafeeq

Companion that guides without commanding. Consumes mission truth; presents Urdu-first counsel per KC-003 / DRCS.

Rafeeq may suggest communications or follow-ups; the human decides.

---

## 5. Cardinality Summary

| From | To | Cardinality |
|------|----|-------------|
| Mission | Objective | 1 : many |
| Mission | Journey (configured) | 1 : many |
| Journey | Activity | 1 : many |
| Objective | Communication | 1 : many (alignment) |
| Audience | Person (Rukn/Karkun) | many : many (via membership) |
| Communication | Template | many : 1 (typical) |
| Communication | Delivery Policy | many : 1 |
| Communication | Delivery attempt | 1 : many |
| Rukn | Connected Karkun | 1 : many (via Connection) |
| Companion Ledger entry | Connected Karkun | many : 1 |

---

## 6. Four Relationship Checks (Mandatory)

Every future COS feature must satisfy all four:

1. **Strengthens the relationship** between people in the mission.
2. **Guides the Rukn** without replacing judgment.
3. **Helps the Administrator support the campaign**.
4. **Aligns with the Campaign Journey**.

If any check fails, the feature is out of scope for Karkun COS.

---

## 7. Terminology Notes

| Prefer | Avoid in COS product language |
|--------|-------------------------------|
| Connection | Assignment (except when referring to legacy engine names) |
| Connected Karkun | Assigned Karkun (in Rukn Communication docs/UI copy) |
| Communication | Messaging (as the product name) |
| Delivery / Channel | Treating WhatsApp as the product |

Legacy technical names (`assignmentStore`, Assignment Engine) may appear in architecture cross-references without renaming code.

---

## 8. Related Documents

- [01-product-vision.md](./01-product-vision.md)
- [02-architecture.md](./02-architecture.md)
- [04-permission-matrix.md](./04-permission-matrix.md)
- [09-shared-libraries.md](./09-shared-libraries.md)
- [DATA_PRESERVATION.md](../architecture/DATA_PRESERVATION.md) — Connection Ledger preservation rules

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Schema impact | None |
| Code impact | None |
