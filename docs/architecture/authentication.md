# Authentication — M7

## Purpose

Karkun Connect uses **Firebase Authentication** for production identity. The UI never calls Firebase APIs directly — all auth flows go through `authenticationService`, with roles resolved centrally and routes protected at the router boundary.

Authentication is independent from Firestore (M8). Firebase Auth provides identity; role and Rukn scope are resolved in the client until custom claims and Firestore profiles are fully deployed.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Login UI (LoginCard)                      │
│         Administrator: Email + Password                      │
│         Rukn: Mobile + OTP                                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ useAuth()
┌─────────────────────────────▼───────────────────────────────┐
│                      AuthProvider                            │
│   status, session cache, online/offline                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                 authenticationService                        │
│   login, logout, OTP, password reset, reauth                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Firebase Auth (src/lib/firebase)                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    roleResolver                              │
│   custom claims → admin allowlist → Rukn phone lookup        │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              ProtectedRoute / GuestRoute                       │
│              authorization.ts                                │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flows

### Administrator — Email + Password

1. User selects **Administrator** on the login card.
2. `authenticationService.loginWithEmail()` calls Firebase `signInWithEmailAndPassword`.
3. `resolveAuthUser()` checks custom claims `{ role: 'administrator' }` or `VITE_ADMIN_EMAILS` allowlist.
4. On success, `AuthProvider` caches `AuthUser` via `authSession` and Firebase persistence (`rememberMe`).

**Forgot password:** `sendPasswordResetEmail` via `resetPassword()`.

### Rukn — Mobile + OTP

1. User selects **Rukn** and enters a 10-digit mobile number.
2. `sendOtp()` formats `+91` E.164 and calls `signInWithPhoneNumber` with invisible reCAPTCHA.
3. User enters OTP; `verifyOtp()` confirms and resolves role.
4. `findRuknIdByPhone()` matches the verified number against `ruknMaster` (until Firestore profiles in M8).

**Resend:** 60-second countdown; `resendOtp()` clears and re-issues.

## Role Resolution

| Priority | Source | Result |
|----------|--------|--------|
| 1 | Custom claim `role: 'administrator'` | Administrator |
| 2 | Custom claim `role: 'rukn'` + `ruknId` | Rukn (scoped) |
| 3 | Email in `VITE_ADMIN_EMAILS` | Administrator |
| 4 | Verified phone matches active Rukn mobile | Rukn (scoped) |
| — | No match | Sign-in rejected |

`AuthUser` shape:

```ts
{
  uid: string
  email: string
  phone?: string
  role: 'administrator' | 'rukn'
  ruknId?: string
  displayName?: string
}
```

## Protected Routes

| Role | Home | Allowed paths |
|------|------|----------------|
| Administrator | `/admin` | `/admin/*` |
| Rukn | `/rukn` | `/rukn/*` |

`ProtectedRoute` redirects unauthenticated users to `/login` with `state.from` for post-login return. Wrong-role access redirects via `getAuthorizedRedirect()`.

**Auth states:** `initializing`, `signing-in`, `sending-otp`, `verifying-otp`, `authenticated`, `unauthenticated`, `session-expired`, `offline`.

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_ADMIN_EMAILS` | Comma-separated admin emails (pre-claims bootstrap) |

Never commit `.env.local` or hard-code credentials.

## Session Management

- **Remember Me:** `browserLocalPersistence` vs `browserSessionPersistence` (Firebase).
- **Cache:** `authSession.ts` mirrors `AuthUser` for fast restore and verification scripts.
- **Refresh:** Firebase `onAuthStateChanged` + automatic token refresh.
- **Logout:** `signOut()` + `clearAuthSession()`.

## Error Handling

Firebase errors are mapped in `src/lib/auth/authErrors.ts`. User-facing messages never expose `auth/*` codes.

## Deployment Checklist

- [ ] Create Firebase project and enable **Email/Password** + **Phone** sign-in
- [ ] Add authorized domains (production URL, localhost for dev)
- [ ] Configure phone auth reCAPTCHA (invisible verifier in login card)
- [ ] Set all `VITE_FIREBASE_*` variables in hosting environment
- [ ] Set `VITE_ADMIN_EMAILS` for initial administrators
- [ ] Create administrator accounts in Firebase Auth
- [ ] Ensure Rukn mobiles in master data match Firebase-verified numbers
- [ ] (Recommended) Set custom claims via Admin SDK before go-live
- [ ] Run `npm run verify:rc1` before release

## Future MFA Strategy

M7 establishes Firebase Auth as the identity layer. Multi-factor authentication can be added without UI layout changes:

1. **Administrator:** Enroll TOTP/SMS as a second factor via Firebase MFA; gate sensitive actions (Danger Zone) with `multiFactor(user).getSession()`.
2. **Rukn:** Phone OTP is already a possession factor; optional step-up for high-risk actions.
3. **Custom claims:** Continue using `role` / `ruknId` claims; MFA enrollment flag in claims for policy enforcement.
4. **Firestore (M8):** Store MFA enrollment metadata in user profile documents; auth service remains the single entry point.

## Verification

```bash
npm run verify:auth    # role resolution, routes, errors, session cache
npm run verify:rc1     # full regression suite
```

## Related Files

```
src/lib/firebase/firebase.ts
src/services/authenticationService.ts
src/lib/auth/roleResolver.ts
src/lib/auth/authorization.ts
src/lib/auth/authErrors.ts
src/providers/AuthProvider.tsx
src/routes/ProtectedRoute.tsx
src/components/forms/LoginCard.tsx
```
