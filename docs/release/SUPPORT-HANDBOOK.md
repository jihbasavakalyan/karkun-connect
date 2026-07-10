# Support Handbook — Basavakalyan Pilot (RC1)

Quick reference for supporting Karkun Connect **1.0.0-rc.1** during the Basavakalyan pilot.

**Production:** https://karkun-connect.vercel.app  
**Tag:** `v1.0.0-rc1`

---

## Who to Contact

| Issue type | First contact | Escalate to |
|------------|---------------|-------------|
| Login / OTP / credentials | Administrator | Technical Lead |
| Missing Karkun / wrong assignment | Administrator | Pilot Lead |
| Visit / compliance data wrong | Administrator | Technical Lead |
| Site down / blank page / permission-denied | Technical Lead | Pilot Lead (P1) |
| Feature request / idea | Feedback Coordinator | **1.1 backlog** (do not implement) |

Severity definitions: [Incident Response](../operations/incident-response.md)

---

## Authentication Quick Triage

### Administrator

| Symptom | Action |
|---------|--------|
| Wrong password | Forgot password on login page |
| No access after login | Claims / `VITE_ADMIN_EMAILS` — Technical Lead |
| Blank screen | Hard refresh; Technical Lead checks Vercel env |

### Rukn

| Symptom | Action |
|---------|--------|
| "Not registered with the campaign" | **Expected** if mobile not on Rukn Master — fix master, do not "force" OTP |
| OTP not received | Wait for resend; check Phone auth / quota (Technical Lead) |
| Wrong / expired OTP | Re-enter or request new OTP |
| "Authentication could not be verified" | Logout; Technical Lead |

Constitution: Firebase = identity; Karkun Connect = authorization ([rukn-authentication.md](../architecture/rukn-authentication.md)).

---

## Daily Support Checklist (First Week)

- [ ] Any P1 open?  
- [ ] Admin and Rukn can login  
- [ ] New connections visible to Rukns after refresh  
- [ ] Visits appear on Execution  
- [ ] Issue log updated ([known-issues.md](../pilot/known-issues.md))  

---

## Operator Guides

| Audience | Document |
|----------|----------|
| Administrator | [Administrator Manual](../operations/administrator-manual.md) |
| Rukn | [Rukn Quick Guide](../operations/rukn-quick-guide.md) |
| All operators | [Troubleshooting Guide](../operations/troubleshooting-guide.md) |
| Launch day | [Pilot Runbook](../operations/pilot-runbook.md) |

---

## What Support Must Not Do

- Change architecture, repositories, Firestore schema, or auth design  
- Add features or UI redesigns during pilot  
- Upgrade dependencies unless fixing Critical  
- Start Version 1.1 work before pilot feedback review  
- Bypass M7.1 by sending OTP to unregistered mobiles  

Allowed: Critical/High defect fixes only; document everything else for 1.1.

---

## Rollback

If pilot is blocked (auth down, data loss, widespread permission errors):

1. Notify Pilot Lead + Technical Lead  
2. Follow [Recovery Guide](../operations/recovery-guide.md)  
3. Redeploy last known-good / `v1.0.0-rc1` as appropriate  
4. Communicate to users (template in Recovery Guide)  

---

## Issue Report Template

```
Screen:
Role: Administrator / Rukn
Steps:
Expected:
Actual:
Severity: Critical / High / Medium / Low
Device / Browser:
```

---

## Related

- [RC1 Certificate](RC1-CERTIFICATE.md)  
- [Known Limitations](KNOWN-LIMITATIONS.md)  
- [Deployment Sign-Off](DEPLOYMENT-SIGNOFF.md)  
