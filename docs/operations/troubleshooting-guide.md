# Troubleshooting Guide — Pilot V1

Common issues and resolutions for Basavakalyan pilot operators. No developer tools required for most fixes.

---

## Authentication

### Administrator cannot login

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Invalid credentials | Wrong password | Use Forgot Password; check with Technical Lead |
| Blank page after login | Build/env misconfiguration | Technical Lead: verify Vercel `VITE_FIREBASE_*` vars |
| Redirect loop | Session corrupt | Clear site data; login again |
| Permission denied on pages | Missing custom claims | Technical Lead: run claims script; re-login |

### Rukn — "Not registered with the campaign"

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Message before OTP | Mobile not in Rukn Master | Administrator: verify/import Rukn Master; correct mobile |
| Correct number rejected | Format mismatch | Enter 10-digit mobile; try with/without country code as app expects |

**Expected behavior (M7.1):** Unregistered numbers never receive OTP. This is correct — fix master data, not Firebase.

### Rukn — OTP issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| OTP not sent | Phone auth disabled / quota | Technical Lead: Firebase Console → Phone provider |
| `operation-not-allowed` | Phone auth off or domain | Enable Phone auth; add domain to authorized list |
| Wrong OTP | User error | Re-enter; use resend after countdown |
| Expired OTP | Timeout | Request new OTP |
| "Authentication could not be verified" | Phone mismatch after OTP | Rare — logout; contact Technical Lead |

### Session issues

| Symptom | Fix |
|---------|-----|
| Logged out unexpectedly | Re-login; enable Remember Me on trusted device |
| Still logged in after logout | Clear cookies; hard refresh |
| Wrong portal (admin vs rukn) | Logout; login with correct role credentials |

---

## Data and Sync

### Dashboard counts wrong

1. Refresh browser
2. Administrator: verify import completed in Settings → Data Migration
3. Check Firestore sync (Technical Lead): `VITE_REPOSITORY_PROVIDER=firestore`

### Assignment not visible to Rukn

1. Confirm connection saved on admin Connections page
2. Rukn: refresh or re-login
3. Verify gender match and active assignment status
4. Multi-device: wait 5–10 seconds for listener sync

### Visit recorded but not on admin Execution

1. Confirm submission succeeded (no error toast)
2. Refresh admin Execution page
3. Check network was online at submit time
4. If offline: reconnect and refresh

### Data different on two devices

1. Both users logged in with same role?
2. Refresh both browsers
3. If persistent: export backup; contact Technical Lead

---

## Import and Export

### Import skipped rows

- Review migration summary for invalid mobiles and duplicates
- Fix source spreadsheet; re-import or add manually

### Export fails

- Try different browser (Chrome recommended)
- Check pop-up/download blocker
- Ensure administrator session is active

---

## UI and Mobile

### Horizontal scroll on mobile

- Use Chrome or Safari current version
- Rotate to portrait; avoid zoom > 100%

### Button not responding

- Hard refresh (Ctrl+Shift+R)
- Check console only if Technical Lead is present

### Empty state when data expected

- Verify correct role login (Rukn sees only assigned Karkuns)
- Administrator: confirm import and connections

---

## Performance

### Slow dashboard load

- Expected at pilot scale on first load (full hydration)
- Subsequent navigation should be faster
- See [Performance Report](../pilot/performance-report.md)

### Slow search

- Large Karkun list (~493) — type 3+ characters for filter
- Report sustained slowness to Technical Lead

---

## Firebase Console Checks (Technical Lead)

| Check | Location |
|-------|----------|
| Auth providers | Authentication → Sign-in method |
| Authorized domains | Authentication → Settings |
| Rules deployed | Firestore → Rules |
| Indexes enabled | Firestore → Indexes |
| OTP quota | Authentication → Usage |

---

## Escalation

| Severity | Example | Contact |
|----------|---------|---------|
| P1 Critical | No login for all users; data loss | Technical Lead immediately |
| P2 High | Assignments not saving | Technical Lead within 1 hour |
| P3 Medium | Intermittent OTP | Administrator logs; Technical Lead same day |
| P4 Low | Cosmetic UI | Feedback coordinator |

See [Incident Response](incident-response.md) and [Recovery Guide](recovery-guide.md).

---

## Verification Commands (Technical Lead)

```bash
npm run lint
npm run build
npm run verify:production
npm run verify:rc1
```
