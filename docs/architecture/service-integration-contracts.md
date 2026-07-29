# KC-0131.7 — Service Integration Contracts

**Status:** Implemented (architecture only)  
**Standards:** DRDS v1.0 · ARR · KC-0131A · KC-0131.1–6 · [`kc-0131-7-arch009-gate.md`](./kc-0131-7-arch009-gate.md)  
**Module:** `src/conversation/serviceContracts/`  

---

## Purpose

Define the **contract layer** that allows Execution Adapters (KC-0131.6) to communicate with **existing** Karkun Connect application services through stable interfaces.

**Primary principle:** adapt to existing KC services — never replace, duplicate, or redesign them. Repositories remain the single source of truth.

No service invocation occurs in this sprint.

---

## Capability registry

Canonical service capabilities (metadata only):

| Capability | Illustrative platform services (string refs only) |
|------------|---------------------------------------------------|
| `VISIT` | `assignmentService`, `followUpService` |
| `COMMUNICATION` | `communicationService`, `deliveryService`, `notificationService` |
| `ATTENDANCE` | `ijtemaAttendanceService`, `weeklyIjtemaService` |
| `REPORTING` | `dailyReportService`, `dashboardMetricsService`, `metricsService` |
| `CAMPAIGN` | `campaignService`, `campaignAutomationEngine` |
| `PEOPLE` | `peopleClassificationService`, `karkunRequestService`, `duplicateResolutionService` |
| `REMINDER` | `schedulingService`, `notificationService` |
| `SEARCH` | people / person-profile search (via existing libs — future bind) |
| `NAVIGATION` | client navigation (no backend service) |
| `DOCUMENT` | `baitulMaalService`, `annexure1Service`, `templateService` |
| `SETTINGS` | settings / guidance surfaces |
| `UNKNOWN` | unmapped |

Descriptors record logical service ids as **strings**. This module never imports `src/services/*`.

---

## Module layout

| Path | Responsibility |
|------|----------------|
| `contracts/` | Core interfaces (`ServiceContract`, registry, etc.) |
| `registry/` | Descriptor registration |
| `capabilities/` | Canonical capability metadata |
| `discovery/` | Registered / unavailable / unsupported / deprecated |
| `invocation/` | Immutable request contracts + transaction scopes |
| `responses/` | Immutable result / availability models |
| `errors/` | Unavailable, mismatch, configuration, validation, infrastructure |
| `validators/` | Structural contract validation |
| `audit/` | Extension points — audit, history, metrics, observability |
| `services/` | Engine façade (placeholder simulation only) |

**Public entry:** `import { conversationServiceContracts } from '@/conversation'`

---

## Discovery model

| Status | Meaning |
|--------|---------|
| `registered` | Descriptor present and available |
| `unavailable` | Known but not available |
| `unsupported` | Capability / service unknown |
| `deprecated` | Registered but marked deprecated |

Placeholder discovery only — no live health checks.

---

## Invocation contracts

Immutable shapes:

- `ServiceInvocationRequest` — capability, operation, payload, transaction scope, correlation ids
- `ServiceInvocationResult` — status, placeholder payload, errors, `invokedService: false`

**No implementation. No service calls.**

---

## Transaction model

Architecture scopes for future execution:

| Scope | Intent |
|-------|--------|
| `single_action` | One service operation |
| `grouped_actions` | Related operations sharing context |
| `batch_execution` | Homogeneous batch |
| `compensating_action` | Undo / compensate prior action |

No transactional runtime in this sprint.

---

## Audit extension points

Interfaces only (no implementations):

- Audit logging
- Execution history
- Metrics
- Observability

---

## Relationship to Execution Adapters (KC-0131.6)

| Layer | Role |
|-------|------|
| Execution Adapters | Step → capability routing |
| Service Integration Contracts | Capability → service descriptor / invocation **shape** |
| Platform services | Real business logic (unchanged; future bind) |

Adapters will eventually build `ServiceInvocationRequest`s against these contracts. This sprint defines shapes only.

---

## Relationship to existing KC services

- Services under `src/services/` remain authoritative.
- Repositories remain SSOT for persistence (KC-ARCH-001).
- This layer records **logical** service ids and capabilities for future binding.
- Direct imports of platform services are **forbidden** here.

---

## Constraints (enforced)

Repository · Firestore · React · business-service · framework · voice · AI — **independent**.  
No direct imports of platform services.

Verify: `npm run verify:kc-0131.7`
