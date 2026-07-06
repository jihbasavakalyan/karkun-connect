# Domain Events

Domain events for **karkun-connect**.

A **domain event** represents something significant that happened in the business domain. Events are immutable records of past occurrences, named in past tense.

## Examples (future)

| Event                    | Trigger                              | Consumers                    |
| ------------------------ | ------------------------------------ | ---------------------------- |
| `VisitScheduled`         | A visit is created and assigned      | notifications, automation    |
| `AssignmentCompleted`    | An assignee marks work as done       | reporting, analytics         |
| `UserRegistered`         | A new user completes registration    | authentication, notifications|
| `CampaignLaunched`       | A campaign is sent to its audience     | analytics, notifications     |
| `JihStatusChanged`       | A Jih entity transitions state       | workflows, reporting         |

## Guidelines

- Named in **past tense** — events describe what already happened.
- Immutable — events are records; never modified after creation.
- Carry minimal payload — entity ID, timestamp, and changed attributes only.
- Published by modules/workflows; consumed by other modules, workflows, or automation.

## Event flow

```
module action  →  emits domain event  →  workflow/automation reacts
                                      →  notification dispatched
                                      →  analytics recorded
```

## What does NOT belong here

- UI events (click handlers, form submissions) — those are React concerns.
- Firebase Cloud Messaging payloads — those are infrastructure (`firebase/`).
- Audit log storage format — that is a service/infrastructure concern.
