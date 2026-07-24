# Administrator Setup — P1

## Create Administrator Accounts

### Firebase Console

1. Authentication → Users → Add user
2. Email + temporary password
3. Send password reset link for first login

### Custom Claims (Required for Production)

Use Firebase Admin SDK (Node.js example):

```javascript
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

initializeApp({ credential: cert(serviceAccount) })

await getAuth().setCustomUserClaims(uid, { role: 'administrator' })
```

**Important:** User must sign out and sign in again for claims to refresh.

### Bootstrap Allowlist (Temporary)

Until claims are deployed, set in production build:

```env
VITE_ADMIN_EMAILS=admin1@jih.org,admin2@jih.org
```

Remove dependency on allowlist once all admins have claims.

## Create Rukn Access

### Phone Authentication

1. Confirm Rukn mobile in `ruknMaster` (10 digits, active status)
2. Rukn signs in via **Rukn** tab → mobile → OTP
3. `findRuknIdByPhone()` maps phone to `ruknId`

### Custom Claims (Recommended)

```javascript
await getAuth().setCustomUserClaims(uid, {
  role: 'rukn',
  ruknId: 'R001',  // Must match ruknMaster.id
})
```

### Bulk Claim Script

Audit and repair Active Rukn JWT claims (KC-0100.2):

```bash
npm run admin:kc0100:claims:audit   # report only
npm run admin:kc0100:claims:dry     # show repairs without writing
npm run admin:kc0100:claims:apply   # idempotent repair of missing/wrong claims
```

Reports are written under `production-data/exports/kc0100-rukn-claims-audit-*.json`.
Does not create Auth users, does not modify Admin accounts, and does not bypass KC-0100 fail-closed login.

For one-off claims, prepare CSV: `email_or_phone, ruknId, role` and run Admin SDK batch script before pilot.

## Verify Setup

| Check | How |
|-------|-----|
| Admin login | Email + password → `/admin` |
| Admin full access | Open Settings, Migration, Danger Zone |
| Rukn login | Phone OTP → `/rukn` |
| Rukn scope | Only assigned karkuns visible |
| Cross-role block | Rukn cannot open `/admin` |

## Password Policy

- Minimum 8 characters (Firebase default)
- Encourage password manager
- Danger Zone requires re-authentication

## Related

- [Firebase Production Audit](firebase-production-audit.md)
- [Security Audit](security-audit.md)
