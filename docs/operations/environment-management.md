# Environment Management — P1

## Environments

| Environment | Purpose | Firebase Project | Repository Provider |
|-------------|---------|------------------|---------------------|
| **Development** | Local coding | Dev project or emulators | `local` (default) |
| **Staging** | Pre-production validation | Staging project | `firestore` |
| **Production** | Basavakalyan pilot | Production project | `firestore` |

## Required Variables

Copy `.env.example` to environment-specific files (never commit secrets):

| Variable | Required | Description | Default (dev) |
|----------|----------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | Yes (auth/firestore) | Firebase Web API key | — |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `{project}.firebaseapp.com` | — |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | — |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | `{project}.appspot.com` | — |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | FCM sender ID | — |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID | — |
| `VITE_ADMIN_EMAILS` | Production bootstrap | Comma-separated admin emails | Empty |
| `VITE_REPOSITORY_PROVIDER` | Yes | `local` or `firestore` | `local` |

## Environment Files

| File | Committed | Use |
|------|-----------|-----|
| `.env.example` | Yes | Template |
| `.env.local` | No | Developer machine |
| `.env.staging` | No | CI/CD staging inject |
| `.env.production` | No | CI/CD production inject |

## Deployment Process

1. Set environment variables in hosting platform (Firebase Hosting, Vercel, Netlify, etc.)
2. Run `npm run build` — Vite embeds `VITE_*` at build time
3. Deploy `dist/` to HTTPS endpoint
4. Verify `VITE_REPOSITORY_PROVIDER=firestore` in production build

**Important:** Environment variables are baked into the build. Changing vars requires rebuild and redeploy.

## Rotation Strategy

| Secret | Rotation | Procedure |
|--------|----------|-----------|
| Firebase Web API key | Rarely | Regenerate in console; rebuild app |
| Admin passwords | 90 days | Firebase Auth password reset |
| Service account keys | 90 days | Rotate Admin SDK key; update Cloud Function |
| `VITE_ADMIN_EMAILS` | On staff change | Update env; rebuild; prefer custom claims |

## Verification

```bash
# Development (local storage)
VITE_REPOSITORY_PROVIDER=local npm run dev

# Staging build check
VITE_REPOSITORY_PROVIDER=firestore npm run build
npm run verify:rc1
```
