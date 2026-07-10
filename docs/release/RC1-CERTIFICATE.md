# RC1 — Release Candidate Certificate

**Product:** Karkun Connect  
**Version:** 1.0.0-rc.1  
**Git tag:** `v1.0.0-rc1`  
**Branch:** `main`  
**Certification date:** 10 July 2026  
**Production URL:** https://karkun-connect.vercel.app  
**Firebase project:** `karkun-connect-75c68`  
**Pilot scope:** Basavakalyan Pilot V1

---

## Certification Statement

This document certifies that Karkun Connect **1.0.0-rc.1** has completed Release Candidate engineering certification. Feature development is **frozen**. Only Critical and High severity defects may be fixed before pilot. All enhancements move to the Version 1.1 backlog after pilot feedback review.

**Certified artifact:** the commit tagged `v1.0.0-rc1` on `origin/main`.

---

## Version & Build

| Field | Value |
|-------|-------|
| Package version | `1.0.0-rc.1` (`package.json`) |
| Release tag | `v1.0.0-rc1` |
| Build command | `npm run build` (`tsc -b && vite build`) |
| Repository provider (production) | `firestore` |
| Auth | Firebase Email/Password + Phone OTP (M7 / M7.1) |

---

## Verification (Automated)

| Command | Result |
|---------|--------|
| `npm install` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run verify:rc1` | Pass |
| `npm run verify:production` | Pass |
| `npm run verify:p3` | Pass |
| `npm run verify:rc1-cert` | Pass |

Non-blocking build notes (do not block production): Vite chunk-size warnings; ineffective dynamic-import warnings for modules also statically imported.

---

## Certification Areas

| # | Area | Status | Evidence |
|---|------|--------|----------|
| 1 | Build Integrity | **Pass** | Automated suite above |
| 2 | Authentication | **Pass** (engineering) | M7/M7.1 + `verify:auth` / `verify:rukn-identity`; live checklists in [docs/pilot/](../pilot/) |
| 3 | Firestore / Repositories | **Pass** (engineering) | `verify:repositories`, `verify:firestore`, `verify:persistence` |
| 4 | Operational Campaign Path | **Ready** | [campaign-simulation-report.md](../pilot/campaign-simulation-report.md); execute before go-live |
| 5 | Security | **Pass** (engineering) | Rules + [security-report.md](../pilot/security-report.md) |
| 6 | Performance | **Acceptable for pilot** | [performance-report.md](../pilot/performance-report.md); KL-D01 at pilot scale |
| 7 | Documentation | **Pass** | Architecture, operations, pilot, release package |
| 8 | Release Packaging | **Pass** | This folder |

---

## Known Issues

| Severity | Open count | Gate |
|----------|------------|------|
| Critical | **0** | Must remain 0 |
| High | **0** | Must remain 0 |
| Medium / Low | See [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) | Non-blocking |

---

## Risk Level

| Dimension | Level | Notes |
|-----------|-------|-------|
| Overall pilot risk | **Low–Medium** | Controlled single-jamaat pilot; KL-S01/S02 accepted |
| Authentication | Low | M7.1 gates OTP behind Rukn Master |
| Data loss | Low | Backup + recovery documented |
| Scale | Low | ~49 Rukns / ~493 Karkuns |

---

## Pilot Scope

- Single jamaat: Basavakalyan
- Roles: Administrator (email/password), Rukn (registered mobile + OTP)
- Masters: 49 Rukns, ~493 Karkuns
- Workflows: Campaign → Import → Connect → Visit → Execution → Compliance → Communication → Reports → Review
- Out of scope: multi-jamaat, push notifications, live WhatsApp API, Version 1.1 features

---

## Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| Zero Critical defects | ✓ |
| Zero High defects | ✓ |
| Production build pass | ✓ |
| Firestore engineering pass | ✓ |
| Authentication engineering pass | ✓ |
| Pilot documentation / gates ready | ✓ |
| Documentation complete | ✓ |
| Rollback plan documented | ✓ |
| Leadership approval ready | ✓ |

---

## Go-Live Decision

| Decision | Status |
|----------|--------|
| **RC1 engineering certification** | **APPROVED** |
| **Pilot go-live** | Pending signatures on [DEPLOYMENT-SIGNOFF.md](DEPLOYMENT-SIGNOFF.md) / [go-live-approval.md](../pilot/go-live-approval.md) after live acceptance |

---

## Rollback Plan

1. Redeploy previous known-good build or prior tag  
2. Or redeploy `v1.0.0-rc1` after Critical/High hotfix only  
3. Restore Firestore from export or Settings → Data Migration JSON backup  
4. Target RTO: 15 minutes for application-only rollback  

Full procedure: [Recovery Guide](../operations/recovery-guide.md)

---

## Freeze Policy

Effective upon tagging `v1.0.0-rc1`:

- No feature development, UI redesign, or architecture/repository/Firestore/auth redesign  
- No dependency upgrades unless required to fix Critical  
- Only Critical and High defects may be fixed before pilot  
- All new ideas → Version 1.1 backlog  
- Do not begin Version 1.1 until pilot feedback has been reviewed  

---

## Leadership Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Pilot Lead | | | |
| Organizational Leadership | | | |

Also complete: [DEPLOYMENT-SIGNOFF.md](DEPLOYMENT-SIGNOFF.md)

---

## Related Release Package

| Document | Purpose |
|----------|---------|
| [VERSION-1.0.md](VERSION-1.0.md) | Version identity and freeze |
| [CHANGELOG-1.0.md](CHANGELOG-1.0.md) | Changes through RC1 |
| [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) | Non-defect boundaries |
| [DEPLOYMENT-SIGNOFF.md](DEPLOYMENT-SIGNOFF.md) | Deploy / go-live signatures |
| [SUPPORT-HANDBOOK.md](SUPPORT-HANDBOOK.md) | Pilot support playbook |
