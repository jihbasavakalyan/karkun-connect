# Domain Interfaces

Domain contracts (ports) for **karkun-connect**.

This folder defines **interfaces** that describe what the domain needs from the outside world, without specifying how it is implemented. These are the boundaries between the domain and infrastructure.

## Port categories (future)

| Category              | Purpose                                      | Implemented by   |
| --------------------- | -------------------------------------------- | ---------------- |
| Repository interfaces | Persist and retrieve entities                | `services/`, `firebase/` |
| Service interfaces    | External capabilities (email, storage, etc.) | `services/`, `lib/`      |
| Query interfaces      | Read-optimized data access patterns          | `services/`, `firebase/` |

## Examples (future)

- `IVisitRepository` — `findById`, `save`, `findByAssignee`
- `INotificationService` — `send`, `getPreferences`
- `IAuthProvider` — `signIn`, `signOut`, `getCurrentUser`

## Guidelines

- Define **what**, never **how** — no Firebase, HTTP, or SDK references.
- One interface per file, named with an `I` prefix or descriptive port name.
- Modules depend on these interfaces; services provide concrete implementations.
- Enables swapping infrastructure (e.g., Firebase → another backend) without touching domain or modules.

## Dependency inversion

```
modules  →  depends on  →  domain/interfaces  ←  implemented by  ←  services/firebase
```

The domain defines the contract. Infrastructure satisfies it.
