# KC-0131.6 — Execution Adapter Foundation

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131A · KC-0131.1–5 · [`kc-0131-6-arch009-gate.md`](./kc-0131-6-arch009-gate.md)  
**Module:** `src/conversation/executionAdapters/`  

> **Note:** Suggested path `src/conversation/adapters/` is already occupied by KC-004 repository integration adapters. KC-0131.6 lives as a sibling module to preserve existing behaviour and avoid type collisions (`AdapterResult`, `AdapterRegistry`, etc.).

---

## Purpose

Provide a **reusable adapter architecture** that maps secretary `ExecutionPlan` steps to **canonical platform capabilities**.

Adapters define **routing only**. They do **not** contain business rules, call repositories, invoke Firestore, or execute platform services.

---

## Adapter lifecycle

```text
ExecutionStep
      ↓
Capability mapping (intent / operation → AdapterCapability)
      ↓
Adapter resolution (exact | fallback | unsupported | unavailable | conflict)
      ↓
Placeholder AdapterResult
```

No service invocation occurs at any stage in this sprint.

---

## Capability registry

Canonical capabilities (metadata only):

| Capability | Typical intent codes |
|------------|----------------------|
| `VISIT` | `VISIT_UPDATE`, `FOLLOW_UP` |
| `COMMUNICATION` | generic communication routing |
| `ATTENDANCE` | `IJTEMA_ATTENDANCE` |
| `REPORTING` | `REPORT` |
| `REMINDER` | `REMINDER` |
| `SEARCH` | `SEARCH` |
| `NAVIGATION` | `NAVIGATION` |
| `CALL` | `CALL` |
| `WHATSAPP` | `WHATSAPP` |
| `DOCUMENT` | `BAITUL_MAAL`, `APP_REGISTRATION` |
| `UNKNOWN` | `UNKNOWN` / unmapped |

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `contracts/` | `ExecutionAdapter`, registry / resolver interfaces |
| `registry/` | Capability + adapter registration (metadata) |
| `routing/` | Step → capability mapping |
| `resolution/` | Exact / fallback / unsupported / unavailable / conflict |
| `results/` | Placeholder `AdapterResult` factories |
| `errors/` | Unavailable, unsupported, invalid mapping, configuration |
| `validators/` | Structural validation of mappings / registry |
| `services/` | Façade — route + resolve + placeholder result |

**Public entry:** `import { conversationExecutionAdapters } from '@/conversation'`

---

## Routing architecture

1. **Route** — map `ExecutionStep.intentCode` / `operationCode` to an `AdapterCapability`.
2. **Resolve** — look up a registered `ExecutionAdapter` for that capability.
3. **Result** — emit a placeholder `AdapterResult` (`isPlaceholder: true`, `invokedService: false`).

Resolution outcomes:

- **Exact match** — adapter registered for capability
- **Fallback** — capability remapped to a declared fallback capability
- **Unsupported capability** — no mapping / unknown
- **Unavailable adapter** — capability known but no adapter registered
- **Conflict** — multiple adapters claim the same capability without priority

---

## Error model

| Code | Meaning |
|------|---------|
| `adapter_unavailable` | Capability known; adapter missing |
| `capability_unsupported` | No valid capability mapping |
| `invalid_mapping` | Step / mapping structurally invalid |
| `configuration_error` | Registry misconfiguration / conflict |

Placeholders only — **no retry**, **no recovery**, **no service calls**.

---

## Extension points

Future sprints may register real adapters that bridge to KC platform services. Extension strategy:

1. Implement `ExecutionAdapter` for a capability.
2. Register via `AdapterRegistry.register`.
3. Keep business logic inside existing KC services — adapters only route and translate contracts.
4. Orchestrator remains the sole lifecycle owner; adapters remain invocation targets for a future integration sprint.
5. Do not conflate with KC-004 `src/conversation/adapters/` repository adapters — those stay the repository boundary.

---

## Relationship to Orchestrator (KC-0131.5)

| Concern | Owner |
|---------|-------|
| Plan lifecycle, progress, pause/cancel | Orchestrator |
| Step → capability → adapter routing | Execution Adapter Foundation |
| Service invocation | **Neither** (future Service Integration) |

The orchestrator **must not** import adapters in a way that executes work. Integration wiring is deferred.

---

## Relationship to future Service Integration

A later sprint will:

- Bind adapters to existing KC services (assignment, communication, attendance, etc.)
- Translate `AdapterResult` into durable platform outcomes
- Preserve KC-ARCH-001 persistence standards inside those services

This foundation intentionally leaves that boundary empty.

---

## Constraints (enforced)

Repository · Firestore · React · business-service · framework · voice · AI — **independent**.

Verify: `npm run verify:kc-0131.6`
