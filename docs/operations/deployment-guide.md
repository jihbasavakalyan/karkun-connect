# Deployment Guide — P1

## Prerequisites

- Node.js 20+ and npm
- Firebase project (production) with Auth + Firestore
- Firebase CLI (`npm install -g firebase-tools`)
- GCP billing (Blaze) if using phone OTP at scale or scheduled exports
- HTTPS hosting target

## 1. Clone and Build

```bash
git clone https://github.com/jihbasavakalyan/karkun-connect.git
cd karkun-connect
git checkout main
npm install
```

## 2. Configure Environment

Create production env file (or CI secrets):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAILS=admin@your-org.org
VITE_REPOSITORY_PROVIDER=firestore
```

## 3. Verify Build

```bash
npm run lint
npm run build
npm run verify:rc1
npm run verify:production
```

## 4. Deploy Firestore

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Configure Firebase Auth

See [Firebase Production Audit](firebase-production-audit.md):

- Enable Email/Password and Phone
- Add authorized domains
- Create administrator accounts
- Set custom claims (see [Admin Setup](admin-setup.md))

## 6. Deploy Application

### Option A — Firebase Hosting

```bash
# Initialize once: firebase init hosting
firebase deploy --only hosting
```

### Option B — Static Host

Upload contents of `dist/` to any HTTPS static host (S3+CloudFront, Netlify, etc.).

Ensure SPA fallback: all routes → `index.html`.

## 7. Data Migration

If migrating from browser local storage:

1. Deploy with `VITE_REPOSITORY_PROVIDER=firestore`
2. Administrator logs in
3. Run migration utility (`migrateLocalStorageToFirestore`) or use Settings → Data Migration import
4. Verify dashboard counts

## 8. Post-Deploy Smoke Test

Follow [Smoke Test](smoke-test.md) checklist.

## Rollback

1. Redeploy previous `dist/` artifact from git tag
2. If rules changed: `git checkout TAG -- firestore.rules && firebase deploy --only firestore:rules`
3. If data corrupted: [Recovery Guide](recovery-guide.md)

## Related

- [Production Checklist](production-checklist.md)
- [Environment Management](environment-management.md)
