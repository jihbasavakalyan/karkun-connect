# Rukn Acceptance Test Report — P3 Phase 2

**Project:** Karkun Connect — Basavakalyan Pilot  
**Tester:** _name_  
**Date:** _YYYY-MM-DD_  
**Build / commit:** _hash_  
**URL:** _https://..._

---

## Objective

Verify Rukn login, OTP flow, dashboard, visit recording, and rejection paths using a **real registered Rukn** from Rukn Master.

---

## Test Rukn

| Field | Value |
|-------|-------|
| Name | |
| Mobile (Login ID) | |
| Gender | Male / Female |
| `ruknId` | |
| Custom claims set | ☐ Yes |

---

## Positive Tests

| # | Test | Steps | Expected | Pass | Notes |
|---|------|-------|----------|------|-------|
| R1 | Login — registered mobile | Enter mobile → Send OTP | OTP sent, reCAPTCHA shown | ☐ | M7.1: only after master lookup |
| R2 | OTP verification | Enter valid OTP | Redirect to `/rukn` | ☐ | |
| R3 | Dashboard opens | View `/rukn` | Home loads | ☐ | |
| R4 | Today's Work visible | Check priority section | Assigned work shown | ☐ | |
| R5 | Connected Karkuns visible | My Karkun / Home list | Assigned Karkuns listed | ☐ | Requires admin connection |
| R6 | Record Visit | Complete Annexure-1 | Submission succeeds | ☐ | |
| R7 | Update Journey | Open journey stages | Stages display/update | ☐ | |
| R8 | Logout | Header logout | Session cleared | ☐ | |

---

## Rejection Tests (Must Pass)

| # | Test | Input | Expected | Pass | Firebase called? |
|---|------|-------|----------|------|------------------|
| R9 | Unregistered number | Mobile not in master | "Not registered with the campaign" message | ☐ | ☐ No |
| R10 | Wrong OTP | Invalid 6-digit code | Error; no session | ☐ | Was called for send only |
| R11 | Expired OTP | Code after timeout | Resend required | ☐ | |
| R12 | Invalid format | Too short / invalid | Format validation error | ☐ | ☐ No |

### Unregistered message (exact)

> This mobile number is not registered with the campaign.  
> Please contact the Administrator.

### Verification failed message (post-OTP mismatch)

> Authentication could not be verified.

---

## Session Tests

| # | Test | Expected | Pass |
|---|------|----------|------|
| R13 | Remember Me — same browser | Session restored | ☐ |
| R14 | No Remember Me — new browser | Login required | ☐ |
| R15 | OTP resend | New code after countdown | ☐ |

---

## Auth Logging (AUTH-07)

Technical Lead: confirm `[rukn-auth]` entries in browser console for attempts:

| Attempt | `registered` | `result` | Logged |
|---------|--------------|----------|--------|
| Registered send OTP | true | | ☐ |
| Unregistered | false | NOT_REGISTERED | ☐ |
| OTP success | true | success | ☐ |
| OTP failure | true | failure | ☐ |

---

## Defects Found

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| | | | |

---

## Result

| Outcome | Selected |
|---------|----------|
| **Pass** | ☐ |
| **Fail** | ☐ |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Pilot Lead | | | |

---

## References

- [Rukn Quick Guide](../operations/rukn-quick-guide.md)
- [Rukn Authentication (M7.1)](../architecture/rukn-authentication.md)
