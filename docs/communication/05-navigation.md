# KC-0090 — Navigation
## Future Communication Navigation (Documentation Only)

> **Initiative:** [KC-0090 — Communication Operating System](./README.md)  
> **Document:** 05 — Navigation  
> **Nature:** Future IA only — **no routing or UI implementation**  
> **Status:** Authoritative navigation intent

---

## 1. Scope of This Document

This document describes **future navigation information architecture** for Karkun COS.

It does **not**:

- Change `AppRouter`, route constants, or sidebar configuration
- Create screens, placeholders, or redirects
- Commit to URL paths

Path strings below are **logical labels**, not production routes.

---

## 2. Workspace Split

```text
Communication Operating System
├── Admin Communication
└── Rukn Communication
```

Only these two workspaces exist.

---

## 3. Admin Communication Navigation

Purpose: Mission-wide communication and oversight.

| Nav item | Responsibility |
|----------|----------------|
| **Mission Center** | Mission communication overview, priorities, health |
| **Workspace** | Operational compose / campaign communication workspace |
| **Audience** | Audience management — people and groups |
| **Journeys** | Journey management aligned to mission |
| **Templates** | Template library browsing and configuration |
| **Delivery** | Delivery Center — attempts, failures, channel status |
| **Reports** | Communication and relationship support reports |
| **Settings** | COS settings for the mission (policies, defaults) |

### Logical outline (non-binding paths)

```text
Admin Communication
├── Mission Center
├── Workspace
├── Audience
├── Journeys
├── Templates
├── Delivery
├── Reports
└── Settings
```

**Related Admin responsibilities** (may appear as sub-areas of the above, not separate top-level workspaces): Campaign Communication, Automation, Digital Rafeeq Guidance.

---

## 4. Rukn Communication Navigation

Purpose: Relationship communication with **Connected Karkuns**.

**Organizing principle:** Navigation and primary lists center on **people (Connected Karkuns)**, not channels.

| Nav item | Responsibility |
|----------|----------------|
| **My Karkuns** | Connected Karkuns hub — primary entry |
| **Conversations** | Relationship threads with Connected Karkuns |
| **Follow-ups** | Promised next steps |
| **Companion Ledger** | Service memory and continuity |
| **Visit Planning** | Planned visits / contact intent |
| **Notes** | Personal notes for Connected Karkuns |
| **Rafeeq** | Digital Rafeeq suggestions and companion surface |

### Logical outline (non-binding paths)

```text
Rukn Communication
├── My Karkuns          ← primary organizing surface
├── Conversations
├── Follow-ups
├── Companion Ledger
├── Visit Planning
├── Notes
└── Rafeeq
```

**Also in product responsibility set** (may nest under My Karkuns or Conversations): Shared Resources.

---

## 5. Navigation Principles

| Principle | Application |
|-----------|-------------|
| **Person First** | Rukn nav leads with Connected Karkuns |
| **Mission First** | Admin nav leads with Mission Center |
| **Mobile First** | Rukn tree must work as a field-first mobile IA |
| **Channel Independent** | No top-level "WhatsApp" / "SMS" / "Email" workspace roots |
| **Campaign Independent** | Nav belongs to COS, not to a single campaign module name |

---

## 6. Explicit Non-Implementation

| Item | Status under KC-0090 |
|------|----------------------|
| New React routes | Not created |
| Sidebar items | Not changed |
| Deep links | Not added |
| Placeholder pages | Not created |

Existing Communication Centre navigation remains as deployed until a future implementation sprint migrates IA under architecture freeze rules.

---

## 7. Related Documents

- [06-admin-communication.md](./06-admin-communication.md)
- [07-rukn-communication.md](./07-rukn-communication.md)
- [02-architecture.md](./02-architecture.md)
- Sprint history: prior Communication Centre IA is operational precursor, not COS final nav

---

## Document Control

| Field | Value |
|-------|-------|
| Sprint | KC-0090 |
| Routing impact | None |
| UI impact | None |
