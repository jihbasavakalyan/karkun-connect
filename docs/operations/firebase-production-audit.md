# Firebase Production Audit — P1

Checklist for Firebase Console configuration before Basavakalyan pilot go-live.

## Authentication Providers

| Provider | Required | Console Path | Status |
|----------|----------|--------------|--------|
| Email / Password | Yes (Administrator) | Authentication → Sign-in method | ☐ Enable |
| Phone | Yes (Rukn OTP) | Authentication → Sign-in method | ☐ Enable |
| Anonymous | **No** | Sign-in method | ☐ Must remain disabled |
| Google / Social | No | Sign-in method | ☐ Disabled |

**Action:** Enable only Email/Password and Phone. Disable all other providers.

## Firestore

| Item | Requirement | Status |
|------|-------------|--------|
| Firestore database | Created (production mode) | ☐ |
| Region | `asia-south1` (Mumbai) recommended for India pilot | ☐ Confirm |
| Rules deployed | `firestore.rules` from repository | ☐ `firebase deploy --only firestore:rules` |
| Indexes deployed | `firestore.indexes.json` | ☐ `firebase deploy --only firestore:indexes` |
| Default deny | Catch-all `allow read, write: if false` | ☐ Verified in rules file |

## Authorized Domains

Add every domain that serves the SPA:

| Domain | Environment | Status |
|--------|-------------|--------|
| `localhost` | Development | ☐ (default) |
| Staging hostname | Staging | ☐ |
| Production hostname | Production | ☐ |
| Firebase default domains | Hosting preview | ☐ As needed |

**Console:** Authentication → Settings → Authorized domains

## Email Templates

Customize in Authentication → Templates:

| Template | Customize | Status |
|----------|-----------|--------|
| Password reset | Sender name, reply-to, branding | ☐ |
| Email address verification | If used later | ☐ Optional |

## Phone / OTP Configuration

| Item | Requirement | Status |
|------|-------------|--------|
| reCAPTCHA | Invisible verifier in login UI (`kc-recaptcha-container`) | ☐ |
| Test phone numbers | Dev only — remove before production | ☐ |
| SMS quota | Blaze plan if volume exceeds free tier | ☐ |
| India (+91) | Numbers must match `ruknMaster` mobiles | ☐ |

## Billing

| Tier | When Required |
|------|---------------|
| Spark (free) | Development, low-volume pilot |
| Blaze (pay-as-you-go) | Production OTP volume, Firestore exports, Cloud Functions for custom claims |

**Action:** Upgrade to Blaze before pilot if OTP or export schedules are required.

## Custom Claims (Production)

Custom claims are **not** set automatically by the app. Use Firebase Admin SDK (Cloud Function or one-time script):

```json
{ "role": "administrator" }
{ "role": "rukn", "ruknId": "R001" }
```

Until claims are deployed, `VITE_ADMIN_EMAILS` bootstraps administrator role resolution client-side.

## Missing Configuration Log

Record gaps found during audit:

| Date | Item | Owner | Resolved |
|------|------|-------|----------|
| | | | |

## Related

- [Security Audit](security-audit.md)
- [Admin Setup](admin-setup.md)
- [Deployment Guide](deployment-guide.md)
