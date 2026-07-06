# Workflows

Orchestration layer for **karkun-connect**.

Workflows coordinate multi-step business processes by composing module services, hooks, and external integrations. They sit above `src/modules/` and define how domain operations are sequenced, validated, and executed as cohesive use cases.

## Principles

- **Use-case driven** — One workflow per business process (e.g., "assign visit and notify assignee").
- **Orchestration, not duplication** — Delegate domain rules to modules; workflows only sequence and coordinate.
- **Framework-agnostic** — Workflow functions should not import React; pages and hooks invoke them.
- **Testable** — Workflows are pure orchestration pipelines, easy to unit test in isolation.

## Subfolders

| Workflow           | Process domain                              |
| ------------------ | ------------------------------------------- |
| `authentication/`  | Sign-in, registration, and session flows    |
| `assignment/`      | End-to-end assignment lifecycle             |
| `visits/`          | Visit scheduling and completion pipelines   |
| `reporting/`       | Report generation and delivery flows        |
| `automation/`      | Trigger evaluation and action execution     |
| `analytics/`       | Metric collection and aggregation pipelines |
| `jih/`             | Jih-specific multi-step processes           |
| `notifications/`   | Notification dispatch and preference flows  |
| `campaign/`        | Campaign creation, targeting, and delivery  |

## Layering

```
pages / hooks  →  invoke workflows
workflows      →  orchestrate modules + services
modules        →  own domain logic and data access
```
