# Karkun Connect – Workflow Automation Constitution (Version 1)

## Purpose

This document defines the **Workflow Automation Philosophy** for Karkun Connect.

It is **not** a feature specification and does not authorize new modules by itself. It is the governing principle that all future development must follow.

Whenever a workflow is designed or modified, it should comply with this constitution.

---

## Core Philosophy

Karkun Connect is a **Campaign Execution Platform**.

The system should **guide the user** rather than asking the user to decide what to do next. The application should behave like an intelligent assistant.

> **If the system already knows the next step, it should automatically guide the user there.**

---

## Principle 1 – Event-Driven Workflow

Users perform actions. The system manages workflow.

Example:

```text
Administrator assigns Karkun
        ↓
System creates Pending Assignment

        ↓

Rukn opens Annexure-1
        ↓
System changes status to In Progress

        ↓

Rukn submits Annexure
        ↓
System evaluates result

        ↓

Commitment?

        ↓

Follow-up?

        ↓

Completed

        ↓

Dashboard Updates

        ↓

Reports Update

        ↓

Compliance reflects latest status
```

Users should never manually change workflow states.

---

## Principle 2 – Derived Status

Status should be calculated from user actions.

Never ask users to select workflow status manually.

| User Action                          | System Status      |
| ------------------------------------ | ------------------ |
| Assignment created                   | Pending            |
| Annexure opened                      | In Progress        |
| Annexure submitted without follow-up | Completed          |
| Follow-up created                    | Follow-up Required |
| Follow-up completed                  | Completed          |

---

## Principle 3 – Progressive Workflow

Show only the information required at the current step.

**Visit not conducted**

Show only:

- Reason

Hide:

- Meeting
- Commitment
- Follow-up

**Commitment = No**

Hide:

- Follow-up

**Follow-up = No**

Hide:

- Follow-up Date
- Purpose

---

## Principle 4 – Smart Defaults

The system should automatically populate whenever possible.

Examples:

- Active Campaign
- Current Date
- Assigned Rukn
- Karkun
- Existing Registration Status

Reduce typing.

---

## Principle 5 – Next Action Guidance

Every screen should answer:

> **"What should I do next?"**

**Pending Assignment**

→ Open Annexure-1

**Follow-up Required**

→ Open Follow-up

**No Pending Work**

→ Show: *You're all caught up.*

---

## Principle 6 – Automatic Navigation

After completing an action, navigate to the most logical next screen.

**Submit Annexure → No Follow-up**

→ Return to Today's Assigned Karkuns

**Submit Annexure → Follow-up Required**

→ Open Follow-up List

Avoid unnecessary confirmation pages.

---

## Principle 7 – Single Source of Truth

Every major entity must have one authoritative source.

| Entity            | Source                    |
| ----------------- | ------------------------- |
| Campaign          | Campaign Library          |
| Assignment        | Assignment Engine         |
| Execution Status  | Execution Status Service  |
| Follow-up         | Follow-up Service         |

Never duplicate business logic.

---

## Principle 8 – Minimal Cognitive Load

Users should think about the campaign—not the software.

Remove:

- Duplicate buttons
- Duplicate navigation
- Repeated information
- Unnecessary decisions

---

## Principle 9 – Version 1 Boundaries

Automation must remain within Version 1 scope.

Do **not** introduce:

- AI recommendations
- Background schedulers
- Notifications
- Firebase automation
- Server-side jobs
- Workflow engines

Automation in Version 1 means **UI and business logic automation only**.

---

## Principle 10 – Future Ready

Design Version 1 so Version 2 can later introduce:

- Firebase persistence
- Notifications
- Scheduled reminders
- Smart dashboards
- Multi-Jamaat support
- Multi-campaign support

…without redesigning the workflow.

---

## Development Rule

Whenever a new feature or workflow is proposed, first ask:

1. Can the system infer this automatically?
2. Can the system navigate automatically?
3. Can the system populate this automatically?
4. Can the system remove one click?
5. Can the system remove one decision?
6. Can the system remove one field?

If **yes**, prefer automation over additional UI.

---

## Relationship to Sprint Work

This constitution captures the philosophy established during Sprint 11 execution workflow work. It exists to keep Sprint 12 and later development consistent—preventing drift toward unnecessary screens, manual status changes, or duplicate workflows—while preserving Version 1 scope and providing a clear foundation for Version 2.

---

## Status

| Attribute   | Value                                      |
| ----------- | ------------------------------------------ |
| Version     | 1.0                                        |
| Scope       | Version 1 and Version 2 design guidance    |
| Code impact | Documentation only; no runtime behavior    |
| Location    | `docs/architecture/workflow-automation-constitution.md` |
