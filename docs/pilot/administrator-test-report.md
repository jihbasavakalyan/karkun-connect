# Administrator Acceptance Test Report — P3 Phase 1

**Project:** Karkun Connect — Basavakalyan Pilot  
**Environment:** Fresh Firebase project + empty Firestore (or clean staging equivalent)  
**Tester:** _name_  
**Date:** _YYYY-MM-DD_  
**Build / commit:** _hash_  
**URL:** _https://..._

---

## Objective

Verify an Administrator can complete the full setup workflow **without developer tools**.

---

## Automated Pre-Check

| Command | Result | Date |
|---------|--------|------|
| `npm run lint` | ☐ Pass | |
| `npm run build` | ☐ Pass | |
| `npm run verify:production` | ☐ Pass | |
| `npm run verify:rc1` | ☐ Pass | |

---

## Test Matrix

| # | Test | Steps | Expected | Pass | Notes |
|---|------|-------|----------|------|-------|
| A1 | Login | Email + password | Redirect to `/admin` | ☐ | |
| A2 | Create Campaign | `/admin/campaign` → create | Campaign active | ☐ | |
| A3 | Import Rukn Master | Settings → Migration → import | 49 Rukns | ☐ | |
| A4 | Import Karkun Master | Import male + female lists | ~493 Karkuns | ☐ | |
| A5 | Verify imported data | Dashboard + list pages | Counts match | ☐ | |
| A6 | Connect Karkuns | `/admin/assignments` → connect | Assignment saved | ☐ | |
| A7 | Search | Global search + page search | Correct results | ☐ | |
| A8 | Filter | Karkun filters (gender, status) | List updates | ☐ | |
| A9 | Logout | Top bar logout | Session cleared → `/login` | ☐ | |

---

## Detailed Observations

### Login (A1)

_Screenshots, timing, issues._

### Campaign (A2)

_Campaign name, dates, status._

### Import (A3–A5)

| Dataset | Expected | Actual | Skipped | Pass |
|---------|----------|--------|---------|------|
| Rukn Master | 49 | | | ☐ |
| Male Karkuns | ~196 | | | ☐ |
| Female Karkuns | ~297 | | | ☐ |

### Connections (A6)

| Rukn | Karkun | Gender match | Saved | Visible to Rukn |
|------|--------|--------------|-------|-----------------|
| | | ☐ | ☐ | ☐ |

---

## Defects Found

| ID | Severity | Description | Steps to reproduce | Status |
|----|----------|-------------|-------------------|--------|
| | Critical / High / Medium / Low | | | Open / Fixed |

**Critical or High defects block go-live.**

---

## Result

| Outcome | Selected |
|---------|----------|
| **Pass** — all tests passed, no Critical/High defects | ☐ |
| **Fail** — defects require resolution | ☐ |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Administrator | | | |
| Technical Lead | | | |

---

## References

- [Administrator Manual](../operations/administrator-manual.md)
- [Pilot Runbook](../operations/pilot-runbook.md)
- [Troubleshooting Guide](../operations/troubleshooting-guide.md)
