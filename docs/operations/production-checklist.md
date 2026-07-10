# Production Checklist — P1 / P2

Master go-live checklist for Basavakalyan pilot. P2 adds staging validation and live-service configuration — see [P2 Staging Validation](p2-staging-validation.md).

## Firebase

- [ ] Production Firebase project created
- [ ] Blaze billing enabled (if OTP/export required)
- [ ] Firestore enabled in `asia-south1` (or confirmed region)
- [ ] Email/Password auth enabled
- [ ] Phone auth enabled
- [ ] Anonymous auth **disabled**
- [ ] Authorized domains include production URL
- [ ] Password reset email template customized
- [ ] reCAPTCHA working on production domain

## Security

- [ ] `firestore.rules` deployed
- [ ] `firestore.indexes.json` deployed
- [ ] No public write access (default deny verified)
- [ ] Custom claims script prepared
- [ ] `VITE_ADMIN_EMAILS` set for bootstrap admins
- [ ] No secrets committed to git

## Environment

- [ ] All `VITE_FIREBASE_*` variables set in hosting
- [ ] `VITE_REPOSITORY_PROVIDER=firestore`
- [ ] Staging environment validated separately
- [ ] Production build tested against staging Firebase first

## Accounts

- [ ] Administrator Firebase accounts created
- [ ] Custom claims `{ role: "administrator" }` set
- [ ] Rukn mobiles match `ruknMaster` records
- [ ] Rukn custom claims `{ role: "rukn", ruknId: "..." }` set
- [ ] Test OTP login for 2 Rukns (male + female)

## Data

- [ ] Production master data loaded (49 Rukns, ~493 Karkuns)
- [ ] Local → Firestore migration completed (if applicable)
- [ ] JSON backup taken before go-live
- [ ] Dashboard counts verified

## Infrastructure

- [ ] HTTPS enabled on production domain
- [ ] SPA routing configured (fallback to index.html)
- [ ] DNS propagated
- [ ] Firebase Hosting or CDN cache headers set

## Verification

- [ ] `npm run lint` passed on release commit
- [ ] `npm run build` passed
- [ ] `npm run verify:rc1` passed
- [ ] `npm run verify:production` passed
- [ ] Smoke test completed (see [Smoke Test](smoke-test.md))

## Monitoring & Backup

- [ ] Firestore daily export scheduled
- [ ] Uptime monitor on production URL
- [ ] Firebase Auth alerts configured
- [ ] Incident contacts documented
- [ ] Rollback build artifact retained

## Pilot Readiness

- [ ] Pilot credentials distributed securely
- [ ] Administrator and Rukn guides shared
- [ ] Feedback coordinator assigned
- [ ] [Pilot Launch Guide](pilot-launch-guide.md) reviewed with team

## P2 — Staging Validation

- [ ] Staging Firebase project configured (Part 1)
- [ ] Firestore rules and indexes deployed to staging
- [ ] Custom claims set (`administrator`, `rukn` + `ruknId`)
- [ ] Vercel staging env vars set and redeployed
- [ ] Production data imported and verified (`verify-firestore-production.mjs`)
- [ ] Smoke test completed on staging URL
- [ ] Multi-device and security tests passed
- [ ] Performance measurements recorded
- [ ] [Go-Live Report](go-live-report.md) completed with Go recommendation

## P3 — Pilot Operations & Launch Readiness

- [ ] [Pilot Runbook](pilot-runbook.md) reviewed with Pilot Lead
- [ ] [Administrator Manual](administrator-manual.md) and [Rukn Quick Guide](rukn-quick-guide.md) distributed
- [ ] Phase 1–7 acceptance reports completed under [docs/pilot/](../pilot/)
- [ ] [Known Issues](../pilot/known-issues.md) has zero Critical and zero High defects
- [ ] [Go-Live Approval](../pilot/go-live-approval.md) signed by leadership
- [ ] `npm run verify:p3` passed on release commit

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Product Owner | | | |
| Pilot Lead | | | |
