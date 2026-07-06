# Entities

Domain entities for **karkun-connect**.

An **entity** is an object with a unique identity that persists over time, even when its attributes change. Two entities are equal if they share the same identity (ID), not the same attribute values.

## Examples (future)

| Entity       | Identity        | Description                              |
| ------------ | --------------- | ---------------------------------------- |
| `User`       | `userId`        | A registered system user                 |
| `Rukn`       | `ruknId`        | A community member                       |
| `Visit`      | `visitId`       | A scheduled or completed visit           |
| `Assignment` | `assignmentId`  | A task assigned to a member              |
| `Campaign`   | `campaignId`    | A targeted outreach campaign             |

## Guidelines

- Every entity has a stable, unique identifier.
- Entities may contain value objects as attributes.
- Entity lifecycle (create, update, archive) is managed by modules and workflows — not here.
- Define entity **shapes** (types) here; persistence mapping belongs in services/firebase.

## What does NOT belong here

- Database schemas or Firestore document shapes (`firebase/`)
- React state or component props (`components/`, `pages/`)
- API request/response DTOs used only at boundaries (`services/`)
