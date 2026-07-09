# Production Smoke Test — P1

Manual smoke test to run after each production deployment. Automated regression is covered by `npm run verify:rc1`.

## Automated Pre-Smoke

```bash
npm run lint
npm run build
npm run verify:rc1
npm run verify:production
```

## Authentication

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| A1 | Administrator login | Email + password, Remember Me | Redirect to `/admin` | ☐ |
| A2 | Administrator logout | Logout from top bar | Redirect to `/login`, session cleared | ☐ |
| A3 | Rukn OTP login | Mobile → OTP → verify | Redirect to `/rukn` | ☐ |
| A4 | OTP resend | Wait for countdown, resend | New OTP received | ☐ |
| A5 | Forgot password | Request reset email | Email received | ☐ |
| A6 | Session restore | Login, close browser, reopen | Still authenticated (Remember Me) | ☐ |
| A7 | Unauthorized route | Rukn opens `/admin` | Redirect to `/rukn` | ☐ |

## Administrator Workflows

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| B1 | Campaign | `/admin/campaign` | Active campaign visible | ☐ |
| B2 | Rukn master | `/admin/rukn` | 49 Rukns listed | ☐ |
| B3 | Karkun registry | `/admin/karkun` | ~493 Karkuns listed | ☐ |
| B4 | Connection | Assign karkun to rukn (matching gender) | Assignment saved | ☐ |
| B5 | Execution | `/admin/execution` | Submitted forms visible | ☐ |
| B6 | Compliance | Update Ijtema / JIH / Bait-ul-Maal | Metrics update on home | ☐ |
| B7 | Communication | `/admin/communication` | Templates load | ☐ |
| B8 | Settings / Migration | Export JSON backup | File downloads | ☐ |
| B9 | Reports | Execution → Reports section | Data visible | ☐ |

## Rukn Workflows

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| C1 | Home dashboard | `/rukn` | Assigned karkuns visible | ☐ |
| C2 | Connected karkun | Open karkun from list | Journey / visit accessible | ☐ |
| C3 | Visit recording | Complete Annexure-1 form | Submission succeeds | ☐ |
| C4 | Journey | View connection journey | Stages display | ☐ |
| C5 | Campaign record | `/rukn/campaign-record` | Visit history visible | ☐ |
| C6 | Call / WhatsApp | Tap contact action | OS handler opens | ☐ |

## Infrastructure

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| D1 | Offline edit | Disable network, update compliance | Queued (no crash) | ☐ |
| D2 | Reconnect sync | Re-enable network, refresh | Data synced | ☐ |
| D3 | Multi-device | Login on two devices, assign on admin | Rukn device sees update | ☐ |
| D4 | Mobile layout | 390px width Rukn portal | No horizontal scroll | ☐ |
| D5 | HTTPS | Check browser padlock | Valid HTTPS | ☐ |

## Sign-Off

| Tester | Role | Date | Build / Commit |
|--------|------|------|----------------|
| | | | |

**Result:** ☐ Pass — ready for pilot  ☐ Fail — see incident log
