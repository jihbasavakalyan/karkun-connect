# Pilot Launch Guide — Basavakalyan

Operational runbook for launching the Karkun Connect pilot with production Firebase and Firestore.

## Timeline

| Phase | When | Activities |
|-------|------|------------|
| T-7 days | Week before | Firebase audit, staging deploy, admin setup |
| T-3 days | | Data migration, smoke test, backup |
| T-1 day | | Final production deploy, pilot briefing |
| T-0 | Launch day | Go-live sign-off, monitor first logins |
| T+1 to T+7 | First week | Daily check-in, feedback collection |

## Pre-Launch (T-7 to T-1)

1. Complete [Production Checklist](production-checklist.md)
2. Deploy to **staging** with production-equivalent config
3. Run full [Smoke Test](smoke-test.md) on staging
4. Create administrator accounts and Rukn OTP access
5. Load production master data (49 Rukns, ~493 Karkuns)
6. Take JSON backup via Settings → Data Migration
7. Brief pilot lead and administrators

## Launch Day (T-0)

### Morning

- [ ] Final `npm run verify:rc1` on release commit
- [ ] Deploy production build
- [ ] Verify HTTPS and login page loads
- [ ] Administrator smoke login
- [ ] Two Rukn OTP smoke logins (male + female)

### Pilot Briefing (30 min)

- Administrator: campaign, assignments, execution monitoring
- Rukn: home dashboard, visit recording, call/WhatsApp
- Support channel for issues
- Feedback template (screen, role, steps, expected vs actual)

### Afternoon

- [ ] Monitor Firebase Auth dashboard
- [ ] Monitor Firestore read/write metrics
- [ ] Collect first-day feedback

## First Week

| Day | Focus |
|-----|-------|
| Day 1 | Login issues, assignment workflow |
| Day 2 | Visit recording, Annexure-1 |
| Day 3 | Compliance updates |
| Day 4 | Mobile devices (360px, 390px) |
| Day 5 | Multi-device sync test |
| Day 6-7 | Review feedback; triage P1/P2 |

## Credentials

**Production uses Firebase Authentication — not demo accounts.**

- Administrators: email + password (distributed securely)
- Rukns: registered mobile number + OTP

Update [Basavakalyan Pilot Checklist](../pilot/basavakalyan-pilot-checklist.md) with actual pilot accounts (do not commit passwords to git).

## Success Metrics

| Metric | Target (Week 1) |
|--------|-----------------|
| Administrator daily login | 100% of pilot admins |
| Rukn daily login | > 80% of pilot Rukns |
| Assignments created | Per campaign plan |
| Visits recorded | > 1 per assigned karkun |
| Critical incidents | 0 unresolved > 24h |

## Rollback Trigger

Rollback if any of:

- No user can authenticate for > 30 minutes
- Assignment or visit data lost after save
- Widespread permission-denied errors

See [Recovery Guide](recovery-guide.md).

## Related

- [Pilot Checklist](../pilot/basavakalyan-pilot-checklist.md)
- [Release Candidate](release-candidate.md)
