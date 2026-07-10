# Release Notes — Karkun Connect Pilot V1 (P3)

**Version:** 1.0.0-rc.1  
**Milestone:** P3 — Pilot Operations & Launch Readiness  
**Target:** Basavakalyan pilot  
**Production URL:** https://karkun-connect.vercel.app

---

## Summary

Karkun Connect is feature complete for Pilot V1. P3 adds operational documentation, acceptance test frameworks, and launch readiness artifacts. No architecture, repository, Firestore, authentication, or UI redesign changes in this milestone.

---

## Platform

- React 19 SPA — Administrator and Rukn portals
- Firebase Authentication — email/password (Administrator), phone OTP (Rukn)
- Cloud Firestore — persistence, offline cache, multi-device sync
- Repository layer — `firestore` provider in production

---

## Authentication (M7 / M7.1)

- **Firebase = Identity Verification** — proves phone ownership via OTP
- **Karkun Connect = Authorization** — Rukn Master lookup before OTP
- Unregistered mobiles never reach Firebase (no reCAPTCHA, no OTP)
- Post-OTP phone match verification against registered Rukn
- Structured auth attempt logging (`[rukn-auth]`)

---

## Administrator Capabilities

- Command center dashboard
- Campaign create and management
- Rukn Master (49) and Karkun Master (~493) import
- Connection engine with gender matching
- Execution monitoring and reports
- Compliance (Ijtema, JIH, Bait-ul-Maal)
- Follow-up queue, communication templates
- Data migration wizard and JSON backup

---

## Rukn Capabilities

- Mobile OTP login (registered numbers only)
- Today's Work dashboard
- Connected Karkuns and journey tracking
- Annexure-1 visit recording with duplicate prevention
- Campaign record and mobile navigation

---

## P3 Deliverables

| Artifact | Location |
|----------|----------|
| Pilot Runbook | [pilot-runbook.md](pilot-runbook.md) |
| Administrator Manual | [administrator-manual.md](administrator-manual.md) |
| Rukn Quick Guide | [rukn-quick-guide.md](rukn-quick-guide.md) |
| Troubleshooting Guide | [troubleshooting-guide.md](troubleshooting-guide.md) |
| Known Limitations | [known-limitations.md](known-limitations.md) |
| Recovery Guide | [recovery-guide.md](recovery-guide.md) |
| Test reports | [docs/pilot/](../pilot/) |
| Go-Live Approval | [go-live-approval.md](../pilot/go-live-approval.md) |

---

## Verification

```bash
npm run lint
npm run build
npm run verify:production
npm run verify:rc1
npm run verify:p3
npm run verify:rc1-cert
```

**RC1 package:** [docs/release/](../release/) — certificate, changelog, deployment sign-off.

---

## Upgrade from P2

- M7.1 Rukn Identity Verification Layer deployed
- Operations docs expanded for pilot acceptance phases
- No breaking changes to Administrator email/password flow
- No Firestore schema changes

---

## Known Issues

See [docs/pilot/known-issues.md](../pilot/known-issues.md) for defect tracking. See [known-limitations.md](known-limitations.md) for intentional scope boundaries.

---

## Previous Releases

- [Release Candidate (RC1)](release-candidate.md) — P1/P2 production readiness
- [Sprint 13 RC1 Notes](../sprints/sprint-13-rc1-release-notes.md)
