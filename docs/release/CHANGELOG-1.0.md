# Changelog — Karkun Connect 1.0

All notable changes through Release Candidate **1.0.0-rc.1** (`v1.0.0-rc1`).

Format: milestone-oriented summary for pilot operators and leadership.

---

## [1.0.0-rc.1] — 2026-07-10 — RC1 Certification

### Added

- Release package under `docs/release/` (certificate, version, changelog, limitations, deployment sign-off, support handbook)
- `npm run verify:rc1-cert` — release documentation integrity check
- Feature freeze policy for Basavakalyan pilot

### Certification

- Build integrity: lint, build, verify:rc1, verify:production, verify:p3
- Zero Critical / Zero High open defects at certification
- Tag: `v1.0.0-rc1`

---

## [P3] — Pilot Operations & Launch Readiness

### Added

- Pilot runbook, administrator manual, Rukn quick guide
- Troubleshooting guide, known limitations, release notes (operations)
- Pilot acceptance report templates (admin, Rukn, simulation, smoke, performance, security)
- Go-live approval and known-issues log
- `npm run verify:p3`

### Notes

- No architecture, repository, Firestore, authentication, or UI redesign

---

## [M7.1] — Rukn Identity Verification Layer

### Added

- `ruknIdentityService` — normalize, validate, lookup by mobile (no Firebase)
- OTP gated behind Rukn Master lookup (AUTH-01–AUTH-07)
- Post-OTP phone match; mismatch signs out
- Auth attempt logging (`[rukn-auth]`)
- `docs/architecture/rukn-authentication.md`
- `npm run verify:rukn-identity`

### Security

- Unregistered mobiles never reach Firebase (no reCAPTCHA, no OTP)

---

## [Startup Fix]

### Fixed

- Mount React before Firestore hydration so login renders when unauthenticated
- Deferred Firestore init; refresh after auth

---

## [P2] — Production Configuration & Staging Validation

### Added

- Admin scripts (claims, import, verify, seed export)
- Staging validation runbook, Vercel configuration docs
- Go-live report template
- `npm run verify:p2`

---

## [P1] — Production Deployment & Operational Readiness

### Added

- Operations documentation (deployment, security, backup, recovery, smoke test, monitoring)
- Production checklist and Firebase audit guides
- `npm run verify:production`

---

## [M6–M8] — Product Core (summary)

### Platform

- React 19 SPA — Administrator and Rukn portals
- Repository layer with local and Firestore providers
- Firebase Authentication (email/password + phone OTP)
- Cloud Firestore rules, indexes, offline cache
- Campaign, people masters, connections, execution, compliance, communication
- Annexure-1 visit recording, guidance engine, campaign automation
- RC1 automated verification suite (`verify:rc1`)

---

## Unreleased / Deferred to 1.1+

See [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) — push notifications, live WhatsApp API, multi-jamaat, incremental queries, client error monitoring.

**Do not begin Version 1.1 until pilot feedback has been reviewed.**
