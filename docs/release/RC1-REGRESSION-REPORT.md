# RC1 Final Regression Report — Basavakalyan Pilot

**Product:** Karkun Connect 1.0.0-rc.1  
**Auth baseline:** commit `a2ea6c8` (Authentication certified & frozen)  
**Regression date:** 11 July 2026  
**Method:** Automated RC1 suite + code-path audit of all ten certification areas  
**Auth constraint:** No authentication architecture, OTP workflow, or identity-layer changes

---

## Executive Verdict

| Gate | Result |
|------|--------|
| Critical open | **0** |
| High open | **0** (1 found and fixed: H-01) |
| Automated `verify:rc1` | **Pass** |
| Lint / build | **Pass** |
| Authentication freeze respected | **Yes** |
| Pilot regression gate | **PASS** — ready for leadership go-live sign-off |

---

## Tests Performed

### Automated

| Suite | Result |
|-------|--------|
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run verify:rc1` | Pass |
| `npm run verify:production` | Pass |
| `npm run verify:rc1-cert` | Pass |
| `npm run verify:auth` | Pass |
| `npm run verify:rukn-identity` | Pass |
| `npm run verify:routes` | Pass |
| `npm run verify:assignments` (incl. new multi-replace case) | Pass |

### Area coverage

| # | Area | Result | Evidence |
|---|------|--------|----------|
| 1 | Administrator workflow | **Pass** | Campaign, people pages, import tooling, logout paths intact |
| 2 | Rukn OTP workflow | **Pass** (frozen) | M7.1 identity-before-OTP confirmed; auth cert `a2ea6c8` |
| 3 | Connections | **Pass after H-01 fix** | Assign/remove/gender validation sound; replace now targets correct Karkun |
| 4 | Execution | **Pass** | Annexure-1 submit/draft; admin execution + reports empty states |
| 5 | Compliance | **Pass** | Ijtema / JIH / Bait-ul-Maal update handlers |
| 6 | Communication | **Pass** | Templates + send paths (live WhatsApp = known limitation) |
| 7 | Lists and Reports | **Pass with M-02** | Admin lists/reports OK; Rukn Campaign Record scoping deferred to 1.1 |
| 8 | Session persistence | **Pass with L-04** | Remember Me + logout clear; minor preference default noted |
| 9 | Route protection | **Pass** | ProtectedRoute / GuestRoute / role isolation verified |
| 10 | Responsive layouts | **Pass with M-03 / L-02** | Rukn bottom nav OK; admin mobile chips OK; drawer UX deferred |

---

## Issues Found

### Critical

_None._

### High — fixed before pilot

| ID | Area | Description | Fix |
|----|------|-------------|-----|
| **H-01** | Connections — Replace | `replaceKarkun()` discarded `currentKarkunId` (`void currentKarkunId`), so with multiple active connections a Rukn could replace the wrong Karkun. | Pass `currentKarkunId` into `replaceAssignment()`. Added `verifyMultiAssignmentReplaceTargetsCorrectKarkun` to `verify-inline-assignment.ts`. |

**Files:** `src/lib/assignmentEngine.ts`, `scripts/verify-inline-assignment.ts`

### Medium — Version 1.1 backlog

| ID | Area | Description | Workaround |
|----|------|-------------|------------|
| **M-01** | Connections (Rukn UI) | Available / Replace lists are not gender-filtered; opposite-gender rows appear until validation rejects. | Admin desk filters correctly; Rukn sees validation error if wrong gender selected. |
| **M-02** | Rukn Campaign Record | Visit / follow-up panels use campaign-wide data (escalates KL-S02). | Use Connected / Journey for own work; admin Execution for oversight. |
| **M-03** | Admin mobile drawer | Hamburger drawer content uses `hidden lg:flex` sidebar; primary mobile nav is top-bar chips. Drawer may not close on link click. | Use horizontal chip navigation on mobile. |

### Low — Version 1.1 backlog

| ID | Area | Description |
|----|------|-------------|
| **L-01** | Admin Connections | “View History” sets unused modal mode; timeline already inline. |
| **L-02** | RuknLayout | User label contrast on dark hero may be weak. |
| **L-03** | Admin search | Placeholder mentions Rukn/assignments but navigates to Karkun search only. |
| **L-04** | Session | Module `rememberMePreference` defaults to `true` on cold reload edge cases. |

---

## Fixes Applied

1. **H-01** — `replaceKarkun` now forwards `currentKarkunId` to `replaceAssignment`.
2. Regression coverage — multi-assignment targeted replace verified for Male and Female.

No authentication, Firestore schema, repository pattern, navigation structure, or business-rule redesigns.

---

## Remaining Known Limitations

See [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) and [known-issues.md](../pilot/known-issues.md). Notable for pilot:

- KL-S01 / KL-S02 — Firestore rule breadth vs UI scope
- KL-D01 — Full collection hydration at pilot scale
- Live WhatsApp API deferred
- Medium/Low items M-01–M-03, L-01–L-04 above

---

## Go-Live Checklist (Regression)

| Check | Status |
|-------|--------|
| Zero Critical | ✅ |
| Zero High (open) | ✅ |
| Auth certified & frozen | ✅ (`a2ea6c8`) |
| Automated RC1 suite | ✅ |
| H-01 fix verified | ✅ |
| Medium/Low documented for 1.1 | ✅ |
| Leadership sign-off | ☐ [DEPLOYMENT-SIGNOFF.md](DEPLOYMENT-SIGNOFF.md) / [go-live-approval.md](../pilot/go-live-approval.md) |

---

## Recommendation

**Proceed to leadership go-live approval.** RC1 regression gate is met. Schedule M-01–M-03 for early Version 1.1 after pilot feedback.
