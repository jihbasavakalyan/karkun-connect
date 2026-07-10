# Pilot Runbook — Basavakalyan (P3)

Operational runbook for launching and running the Karkun Connect Pilot V1 in Basavakalyan. No developer tools are required for day-to-day pilot operations.

**Production URL:** https://karkun-connect.vercel.app  
**Firebase project:** `karkun-connect-75c68`  
**Release:** 1.0.0-rc.1 (Pilot V1)

---

## Roles

| Role | Responsibility |
|------|----------------|
| Pilot Lead | Go-live decision, escalation, daily review |
| Administrator | Campaign setup, imports, connections, monitoring |
| Rukn | Field visits, journey updates, compliance inputs |
| Technical Lead | Deployment, Firebase, incident response |
| Feedback Coordinator | Issue log, severity triage |

---

## Pre-Pilot (T-7 to T-1)

1. Complete [Production Checklist](production-checklist.md) and [P2 Staging Validation](p2-staging-validation.md).
2. Verify Firebase: Email/Password + Phone OTP enabled; authorized domains include production URL.
3. Set Vercel env: all `VITE_FIREBASE_*`, `VITE_REPOSITORY_PROVIDER=firestore`.
4. Create administrator accounts; set custom claims `{ role: "administrator" }`.
5. Prepare master data files: Rukn Master (49), Karkun Master (~493).
6. Run automated verification on release commit:

```bash
npm run lint
npm run build
npm run verify:production
npm run verify:rc1
```

7. Take Firestore export and in-app JSON backup before first production import.
8. Distribute [Administrator Manual](administrator-manual.md) and [Rukn Quick Guide](rukn-quick-guide.md).

---

## Launch Day (T-0)

### Morning checklist

- [ ] Deploy latest `main` to production (or confirm Vercel auto-deploy complete)
- [ ] Administrator login smoke test
- [ ] Two Rukn OTP smoke tests (one male, one female registered mobile)
- [ ] Dashboard counts: 49 Rukns, ~493 Karkuns
- [ ] Confirm no Critical or High defects in [Known Issues](../pilot/known-issues.md)

### Pilot briefing (30 minutes)

- Administrator workflow: Campaign → Import → Connect → Monitor
- Rukn workflow: Login (mobile + OTP) → Today's Work → Record Visit
- Support channel and issue reporting template
- Rollback criteria (see [Recovery Guide](recovery-guide.md))

### Afternoon monitoring

- Firebase Auth dashboard (login failures, OTP quota)
- Firestore read/write metrics
- First-day feedback collection

---

## Daily Operations (T+1 to T+7)

| Day | Focus | Owner |
|-----|-------|-------|
| 1 | Login issues, import verification | Technical Lead |
| 2 | Connections and visit recording | Administrator |
| 3 | Compliance updates, dashboard sync | Administrator |
| 4 | Mobile devices (360px, 390px) | Pilot Lead |
| 5 | Multi-device sync | Technical Lead |
| 6–7 | Review feedback; triage defects | Pilot Lead |

### End-of-day checklist

- [ ] No unresolved P1 incidents
- [ ] Assignment and visit data consistent across admin + Rukn views
- [ ] Issue log updated in [Known Issues](../pilot/known-issues.md)

---

## Standard Workflows

### Administrator — fresh campaign

1. Login (email + password) → `/admin`
2. Campaign → create or confirm active campaign
3. Settings → Data Migration → import Rukn Master, then Karkun Master
4. Verify counts on dashboard and list pages
5. Connections → assign Karkuns to Rukns (same gender)
6. Monitor Execution and Compliance as Rukns work

### Rukn — daily field work

1. Enter registered mobile → OTP → verify
2. Home → review Today's Work and connected Karkuns
3. Open Karkun → Record Visit (Annexure-1) or update Journey
4. Logout when finished on shared devices

### Full campaign simulation

Run end-to-end without shortcuts. Document results in [Campaign Simulation Report](../pilot/campaign-simulation-report.md).

---

## Acceptance Test Phases (P3)

| Phase | Document | Pass criteria |
|-------|----------|---------------|
| 1 | [Administrator Test Report](../pilot/administrator-test-report.md) | All admin workflows without dev tools |
| 2 | [Rukn Test Report](../pilot/rukn-test-report.md) | OTP login, visits, rejections |
| 3 | [Campaign Simulation Report](../pilot/campaign-simulation-report.md) | Full pilot path |
| 4 | [Smoke Test Report](../pilot/smoke-test-report.md) | Every page, dialog, state |
| 5 | Data integrity (in simulation + smoke reports) | Multi-device consistency |
| 6 | [Performance Report](../pilot/performance-report.md) | No obvious delays |
| 7 | [Security Report](../pilot/security-report.md) | Rules, roles, OTP gate |
| 8 | Operations docs (this folder) | Complete and distributed |

---

## Rollback Triggers

Initiate rollback if any of:

- No user can authenticate for > 30 minutes
- Saved assignment or visit data is lost
- Widespread `permission-denied` on authenticated users

Procedure: [Recovery Guide](recovery-guide.md) — target RTO 15 minutes for app rollback.

---

## Sign-Off

Pilot may begin only when [Go-Live Approval](../pilot/go-live-approval.md) is signed with:

- No Critical defects
- No High severity defects
- Authentication and Firestore stable
- Campaign simulation passed
- Multi-device sync verified
- Leadership sign-off obtained

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Administrator Manual](administrator-manual.md) | Step-by-step admin operations |
| [Rukn Quick Guide](rukn-quick-guide.md) | Rukn OTP login and daily tasks |
| [Troubleshooting Guide](troubleshooting-guide.md) | Common issues and fixes |
| [Known Limitations](known-limitations.md) | Pilot scope boundaries |
| [Recovery Guide](recovery-guide.md) | Rollback and data restore |
| [Release Notes](release-notes.md) | Pilot V1 release summary |
| [Incident Response](incident-response.md) | Severity and escalation |
