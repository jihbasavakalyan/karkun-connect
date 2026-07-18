# Automation Module

Automated workflows and triggers for **karkun-connect**.

## KC-020 foundation

The Execution Context & Automation Framework lives at:

[`src/execution/`](../../execution/index.ts)

See: [`docs/architecture/execution-automation-framework.md`](../../docs/architecture/execution-automation-framework.md)

This module shell will host future module-facing adapters. Core lifecycle, policies, event bus, and Next Best Action are implemented under `src/execution/`.

## Owns (future)

- Workflow rule definitions and evaluation
- Trigger conditions and action execution
- Automation scheduling and retry logic
- Audit trail for automated actions

Integrates with other modules via their public APIs rather than direct internals access.
