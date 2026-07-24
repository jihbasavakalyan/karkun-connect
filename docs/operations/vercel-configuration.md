# Vercel Configuration — P2

Configure Vercel for staging validation before production pilot launch.

## Project Setup

1. Import repository: `jihbasavakalyan/karkun-connect` (or your fork).
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Install command: `npm install`

`vercel.json` at repo root configures SPA fallback (all routes → `index.html`).

## Environment Variables

Set in Vercel → Project → Settings → Environment Variables.

Apply to **Preview** (staging) first; promote to **Production** after P2 sign-off.

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_FIREBASE_API_KEY` | `AIza...` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `project.firebaseapp.com` | |
| `VITE_FIREBASE_PROJECT_ID` | `karkun-connect-staging` | |
| `VITE_FIREBASE_STORAGE_BUCKET` | `project.appspot.com` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | |
| `VITE_FIREBASE_APP_ID` | `1:123:web:abc` | |
| `VITE_REPOSITORY_PROVIDER` | `firestore` | **Required** for production |
| `VITE_ADMIN_EMAILS` | `admin@jih.org` | Bootstrap only; remove after claims |
| `GOOGLE_TTS_CREDENTIALS_JSON` | service-account JSON (one line) | **KC-019** Digital Rafeeq TTS/STT (server-only). Also usable by **KC-0100.3** claim provisioning if `FIREBASE_SERVICE_ACCOUNT_JSON` is unset. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | service-account JSON (one line) | **KC-0100.3** `POST /api/rukn-claims-provision` (preferred). Required for automatic Rukn claim provisioning after first OTP. |

Never set Google credentials with a `VITE_` prefix.
Copy from `.env.staging.example` — never commit filled values.

## Firebase Authorized Domains

After first Vercel deploy, add the deployment URL to Firebase Console → Authentication → Settings → Authorized domains:

- `your-project.vercel.app`
- Custom domain (if configured)

Phone OTP and email auth fail on unauthorized domains.

## Deploy

### Staging (Preview)

```bash
# CLI optional — dashboard deploy works too
npx vercel --env VITE_REPOSITORY_PROVIDER=firestore
```

Or push to a `staging` branch with Preview env vars configured.

### Production

1. Complete [P2 Staging Validation](p2-staging-validation.md).
2. Copy staging env vars to **Production** environment in Vercel.
3. Redeploy production branch (`main`).

**Important:** `VITE_*` variables are embedded at build time. Changing env vars requires a new deployment.

## Verification

After deploy:

```bash
# Local build parity check
cp .env.staging.example .env.staging   # fill values locally
# PowerShell:
Get-Content .env.staging | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "env:$($matches[1])" -Value $matches[2] } }
npm run build
```

On staging URL:

1. Open `/login` — no console Firebase config errors.
2. Administrator login → `/admin` loads with Firestore data.
3. Rukn OTP login → `/rukn` loads.
4. Network tab shows `firestore.googleapis.com` requests (not only local storage).

## Rollback

Vercel → Deployments → select previous deployment → **Promote to Production**.

## Related

- [Environment Management](environment-management.md)
- [Deployment Guide](deployment-guide.md)
- [P2 Staging Validation](p2-staging-validation.md)
