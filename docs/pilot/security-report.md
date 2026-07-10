# Security Report — P3 Phase 7

**Project:** Karkun Connect — Basavakalyan Pilot  
**Reviewer:** _name_  
**Date:** _YYYY-MM-DD_  
**Build / commit:** _hash_  
**Firebase project:** _project-id_

---

## Objective

Verify Firestore rules, role isolation, unauthorized routes, session behaviour, OTP gate, and repository permissions for pilot go-live.

Baseline: [Security Audit (P1)](../operations/security-audit.md).

---

## Automated Checks

| Check | Command / Source | Pass |
|-------|------------------|------|
| Default-deny rules | `npm run verify:production` | ☐ |
| No public write | `firestore.rules` review | ☐ |
| Auth service present | verify:production | ☐ |
| No mock auth | `mockAuth.ts` absent | ☐ |
| Provider firestore mode | Env + provider.ts | ☐ |

---

## Firestore Rules

| Check | Expected | Pass | Notes |
|-------|----------|------|-------|
| Default deny | `allow read, write: if false` | ☐ | |
| Unauthenticated access | Denied | ☐ | |
| Administrator write | Allowed on masters, connections, settings | ☐ | |
| Rukn write | Own connections / scoped execution | ☐ | |
| Indexes deployed | Enabled in console | ☐ | |

### Known rule breadth (not blockers)

| ID | Finding | Severity | Accept for pilot |
|----|---------|----------|------------------|
| SEC-01 | Executions readable by any Rukn | Medium | ☐ Yes |
| SEC-02 | Compliance readable by any Rukn | Medium | ☐ Yes |
| SEC-03 | `VITE_ADMIN_EMAILS` bootstrap | Low | ☐ Until claims set |

---

## Role Isolation

| Test | Steps | Expected | Pass |
|------|-------|----------|------|
| Admin cannot open Rukn as Rukn | Login admin → navigate `/rukn` | Redirect to admin home | ☐ |
| Rukn cannot open Admin | Login rukn → navigate `/admin` | Redirect to rukn home | ☐ |
| Guest blocked | Logged out → `/admin` | Redirect to login | ☐ |
| Guest blocked | Logged out → `/rukn` | Redirect to login | ☐ |

---

## Unauthorized Routes

| Route | As Guest | As Rukn | As Admin |
|-------|----------|---------|----------|
| `/admin/*` | Login redirect | Rukn home | Allowed |
| `/rukn/*` | Login redirect | Allowed | Admin home |
| `/login` | Allowed | Role home (guest route) | Role home |

Manual verification: ☐ Pass

---

## Session Expiry / Persistence

| Test | Expected | Pass |
|------|----------|------|
| Remember Me on | Session restored after browser restart | ☐ |
| Remember Me off | New browser requires login | ☐ |
| Logout | Session cleared; cannot back-button into app | ☐ |
| Token refresh | Long session remains valid | ☐ |

---

## OTP Flow Security (M7.1)

| Rule | Verified | Pass |
|------|----------|------|
| AUTH-01 Registered mobile is Login ID | ☐ | ☐ |
| AUTH-02 OTP only after Rukn Master lookup | ☐ | ☐ |
| AUTH-04 Unregistered never reaches Firebase | ☐ | ☐ |
| AUTH-05 Firebase proves ownership only | ☐ | ☐ |
| AUTH-06 App authorizes access | ☐ | ☐ |
| AUTH-07 Auth attempts logged | ☐ | ☐ |
| Post-OTP phone match | Mismatch → logout + message | ☐ |

---

## Repository Permissions

| Check | Expected | Pass |
|-------|----------|------|
| Production uses `firestore` provider | Env set | ☐ |
| Local provider not used in production | Confirmed | ☐ |
| Client cannot bypass rules via SDK | Rules enforce | ☐ |

---

## Secrets

| Check | Pass |
|-------|------|
| No secrets in git | ☐ |
| `.env.local` gitignored | ☐ |
| Service account keys not in repo | ☐ |

---

## Defects

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| | | | |

---

## Result

| Outcome | Selected |
|---------|----------|
| **Pass** — security acceptable for controlled pilot | ☐ |
| **Fail** | ☐ |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Reviewer | | | |
| Technical Lead | | | |

---

## References

- [Rukn Authentication](../architecture/rukn-authentication.md)
- [Firestore Architecture](../architecture/firestore.md)
- [Known Limitations](../operations/known-limitations.md)
