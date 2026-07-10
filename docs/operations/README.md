# Operations — Karkun Connect Production & Pilot Readiness (P1 / P2 / P3)

Operational documentation for deploying and running Karkun Connect in production. Core product development is complete; this folder covers configuration, security, deployment, recovery, staging validation, and **pilot launch operations (P3)**.

> **RC1 certified:** See [docs/release/](../release/) — tag `v1.0.0-rc1`. Feature development is frozen; only Critical/High fixes before pilot.

## Quick Links — P3 Pilot Operations

| Document | Purpose |
|----------|---------|
| [Pilot Runbook](pilot-runbook.md) | Day-to-day Basavakalyan launch and operations |
| [Administrator Manual](administrator-manual.md) | Production admin workflows (no demo accounts) |
| [Rukn Quick Guide](rukn-quick-guide.md) | Mobile OTP login and field tasks |
| [Troubleshooting Guide](troubleshooting-guide.md) | Common issues and fixes |
| [Known Limitations](known-limitations.md) | Intentional Pilot V1 boundaries |
| [Recovery Guide](recovery-guide.md) | Rollback and data restore |
| [Release Notes](release-notes.md) | Pilot V1 / P3 release summary |

## Quick Links — Infrastructure

| Document | Purpose |
|----------|---------|
| [Production Checklist](production-checklist.md) | Master go-live checklist |
| [Deployment Guide](deployment-guide.md) | Build, configure, deploy |
| [Firebase Production Audit](firebase-production-audit.md) | Firebase console verification |
| [Security Audit](security-audit.md) | Rules, auth, secrets review |
| [Environment Management](environment-management.md) | Dev / staging / production vars |
| [Backup Guide](backup-guide.md) | Export, restore, retention |
| [Monitoring](monitoring.md) | Logging and alerting recommendations |
| [Performance Review](performance-review.md) | Firestore and listener audit |
| [Smoke Test](smoke-test.md) | Production smoke test procedures |
| [Admin Setup](admin-setup.md) | Administrator accounts and claims |
| [Pilot Launch Guide](pilot-launch-guide.md) | Timeline companion to Pilot Runbook |
| [Incident Response](incident-response.md) | Severity levels and escalation |
| [Release Candidate](release-candidate.md) | RC1 release notes, risks, go-live |
| [P2 Staging Validation](p2-staging-validation.md) | Production config & staging validation |
| [Vercel Configuration](vercel-configuration.md) | Vercel env vars and deploy |
| [Go-Live Report](go-live-report.md) | P2 staging sign-off template |

## Pilot Acceptance Reports (P3)

See [docs/pilot/](../pilot/) for Phase 1–7 test reports and [Go-Live Approval](../pilot/go-live-approval.md).

## Verification Commands

```bash
npm run lint
npm run build
npm run verify:rc1
npm run verify:production   # P1 + P3 operational readiness checks
npm run verify:p2           # P2 staging validation artifacts
npm run verify:p3           # P3 pilot documentation artifacts
npm run verify:rc1-cert     # RC1 release package certification
npm run admin:export-seed   # Export seed JSON for Firestore import
```

## Architecture References

- [Authentication (M7)](../architecture/authentication.md)
- [Rukn Identity Verification (M7.1)](../architecture/rukn-authentication.md)
- [Firestore Backend (M8)](../architecture/firestore.md)
- [Repository Layer (M6.9)](../architecture/repository-layer.md)
