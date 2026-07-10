# Version 1.0 — Identity & Freeze

**Product:** Karkun Connect  
**Line:** 1.0  
**Release Candidate:** 1.0.0-rc.1  
**Git tag:** `v1.0.0-rc1`  
**Target:** Basavakalyan Pilot V1

---

## Version Scheme

| Identifier | Meaning |
|------------|---------|
| `1.0.0-rc.1` | Package / npm version (`package.json`) |
| `v1.0.0-rc1` | Git tag for Release Candidate certification |
| `1.0` | Product line for Pilot V1 |
| `1.1` | Post-pilot backlog (not started until feedback reviewed) |

---

## What Is Included in 1.0 RC1

- Administrator portal (campaign, masters, connections, execution, compliance, communication, reports, settings)
- Rukn portal (OTP login, Today's Work, visits, journey, campaign record)
- Firebase Authentication (email/password + phone OTP)
- M7.1 Rukn Identity Verification Layer (OTP only after Rukn Master lookup)
- Cloud Firestore persistence with offline cache and multi-device sync
- Repository layer (`local` / `firestore`)
- Production operations and pilot acceptance documentation (P1–P3)

---

## What Is Explicitly Frozen

After `v1.0.0-rc1`:

| Change type | Allowed before pilot? |
|-------------|----------------------|
| Critical / High defect fix | Yes |
| Feature development | No |
| UI redesign | No |
| Architecture / repository / Firestore redesign | No |
| Authentication redesign | No |
| Dependency upgrades (non-Critical) | No |
| Version 1.1 work | No — wait for pilot feedback |

---

## Environments

| Environment | URL / Project | Notes |
|-------------|---------------|-------|
| Production | https://karkun-connect.vercel.app | Firebase `karkun-connect-75c68` |
| Local | `npm run dev` | Defaults to local repositories unless env set |

---

## Certification Reference

See [RC1-CERTIFICATE.md](RC1-CERTIFICATE.md).
