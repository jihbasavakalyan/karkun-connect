# Go-Live Approval — Basavakalyan Pilot V1 (P3)

**Project:** Karkun Connect  
**Production URL:** https://karkun-connect.vercel.app  
**Firebase project:** `karkun-connect-75c68`  
**Release:** 1.0.0-rc.1  
**Approval date:** _YYYY-MM-DD_  
**Build / commit:** _hash_

---

## Purpose

Formal leadership sign-off that Pilot V1 may begin. Pilot may start **only if** all acceptance criteria below are met.

---

## Acceptance Criteria

| # | Criterion | Evidence | Met |
|---|-----------|----------|-----|
| 1 | No Critical defects | [known-issues.md](known-issues.md) | ☐ |
| 2 | No High severity defects | [known-issues.md](known-issues.md) | ☐ |
| 3 | Authentication stable | [rukn-test-report.md](rukn-test-report.md), admin login | ☐ |
| 4 | Firestore stable | Multi-device sync, no permission storms | ☐ |
| 5 | Campaign simulation passes | [campaign-simulation-report.md](campaign-simulation-report.md) | ☐ |
| 6 | Multi-device sync verified | Simulation + smoke reports | ☐ |
| 7 | Documentation complete | [docs/operations/](../operations/), [docs/pilot/](./) | ☐ |
| 8 | Leadership sign-off obtained | Signatures below | ☐ |

---

## Phase Completion

| Phase | Report | Result |
|-------|--------|--------|
| 1 Administrator Acceptance | [administrator-test-report.md](administrator-test-report.md) | ☐ Pass / ☐ Fail |
| 2 Rukn Acceptance | [rukn-test-report.md](rukn-test-report.md) | ☐ Pass / ☐ Fail |
| 3 Campaign Simulation | [campaign-simulation-report.md](campaign-simulation-report.md) | ☐ Pass / ☐ Fail |
| 4 Smoke Testing | [smoke-test-report.md](smoke-test-report.md) | ☐ Pass / ☐ Fail |
| 5 Data Integrity | Embedded in simulation + smoke | ☐ Pass / ☐ Fail |
| 6 Performance | [performance-report.md](performance-report.md) | ☐ Pass / ☐ Fail |
| 7 Security | [security-report.md](security-report.md) | ☐ Pass / ☐ Fail |
| 8 Production Documentation | Operations folder updated | ☐ Pass / ☐ Fail |

---

## Automated Verification

| Command | Result | Date / Commit |
|---------|--------|---------------|
| `npm run lint` | ☐ Pass | |
| `npm run build` | ☐ Pass | |
| `npm run verify:production` | ☐ Pass | |
| `npm run verify:rc1` | ☐ Pass | |

---

## Environment Confirmation

| Item | Status |
|------|--------|
| Production HTTPS | ☐ |
| `VITE_REPOSITORY_PROVIDER=firestore` | ☐ |
| Firebase Email/Password enabled | ☐ |
| Firebase Phone OTP enabled | ☐ |
| Firestore rules deployed | ☐ |
| Indexes enabled | ☐ |
| Administrator accounts + claims | ☐ |
| Rukn Master mobiles verified | ☐ |
| Backup taken | ☐ |

---

## Open Risks

| Risk | Severity | Mitigation | Accepted |
|------|----------|------------|----------|
| | | | ☐ |

Known limitations (non-blocking): [known-limitations.md](../operations/known-limitations.md)

---

## Decision

| Decision | Selected |
|----------|----------|
| **GO** — Pilot may begin | ☐ |
| **NO-GO** — Blockers listed in known-issues | ☐ |

**Conditions (if GO with conditions):**

_

---

## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Pilot Lead | | | |
| Administrator Lead | | | |
| Technical Lead | | | |
| Organizational Leadership | | | |

---

## Post-Approval

1. Announce go-live to pilot participants
2. Follow [Pilot Runbook](../operations/pilot-runbook.md) T-0 checklist
3. Monitor first 48 hours per [Incident Response](../operations/incident-response.md)
4. Daily review for first week

---

## Related

- [P2 Go-Live Report](../operations/go-live-report.md) (staging validation)
- [Pilot Launch Guide](../operations/pilot-launch-guide.md)
- [Basavakalyan Pilot Checklist](basavakalyan-pilot-checklist.md)
