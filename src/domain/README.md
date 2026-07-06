# Domain Layer

Core domain model for **karkun-connect**, following lightweight Domain-Driven Design (DDD) principles.

This layer defines the **language of the business** — the entities, value objects, contracts, and events that describe what the system is and does, independent of UI, infrastructure, or framework concerns.

## Purpose

The domain layer sits at the center of the architecture. Every other layer depends on it; it depends on nothing above it.

```
         UI (pages, components)
              ↓
         workflows (orchestration)
              ↓
         modules (application logic)
              ↓
         services (integration)
              ↓
    ┌── domain (business model) ──┐
    │  entities · value-objects  │
    │  interfaces · events       │
    └────────────────────────────┘
              ↓
         firebase (infrastructure)
```

## Subfolders

| Folder           | Responsibility                                      |
| ---------------- | --------------------------------------------------- |
| `entities/`      | Objects with identity and a lifecycle               |
| `value-objects/` | Immutable objects defined by their attributes       |
| `interfaces/`    | Domain contracts (repository and service ports)       |
| `events/`        | Domain events representing significant state changes|

## Principles

- **Pure domain** — No React, Firebase, or HTTP imports. Framework-agnostic.
- **Ubiquitous language** — Names reflect business terminology (Rukn, Jih, Visit, Assignment).
- **Thin layer** — Types and contracts only at this stage; behavior arrives in modules and workflows.
- **Dependency rule** — Domain never imports from modules, workflows, services, or firebase.

## Integration

| Layer       | Relationship to domain                                           |
| ----------- | ---------------------------------------------------------------- |
| `modules/`  | Import domain types; implement application use-case logic        |
| `workflows/`| Orchestrate domain operations across modules using domain events |
| `services/` | Implement domain `interfaces/` (repository ports, adapters)      |
| `firebase/` | Infrastructure adapter — satisfies domain repository interfaces  |

See each subfolder README for detailed responsibility and usage guidelines.
