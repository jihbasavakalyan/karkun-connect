# Modules

Feature modules for **karkun-connect**.

Each module encapsulates a bounded domain of the application — its types, services, hooks, and internal logic. Modules are the primary unit of feature organization and team ownership.

## Principles

- **Self-contained domains** — Each module owns its business logic and data access patterns.
- **Thin public API** — Export only what other modules need via the barrel `index.ts`.
- **No cross-module UI** — Page and component code lives in `src/pages/` and `src/components/`; modules supply the logic layer.
- **Composable** — Modules may depend on shared layers (`types/`, `utils/`, `firebase/`) but should avoid tight coupling to other modules.

## Submodules

| Module           | Domain                                      |
| ---------------- | ------------------------------------------- |
| `authentication/`| User identity, sessions, and access control   |
| `dashboard/`     | Dashboard data aggregation and widgets      |
| `assignment/`    | Task and responsibility assignment          |
| `visits/`        | Visit scheduling, tracking, and records     |
| `reporting/`     | Report generation and export                |
| `automation/`    | Automated workflows and triggers            |
| `analytics/`     | Metrics, trends, and data insights          |
| `jih/`           | Jih-specific domain logic                   |
| `notifications/` | Notification delivery and preferences       |
