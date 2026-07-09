# Security Audit — P1

Review conducted against repository state at Production Readiness Phase P1. No code changes required if all items pass.

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Firestore rules | ✅ Pass | Default deny; role-scoped access |
| Authentication | ✅ Pass | Firebase Auth; no mock auth in production |
| Route guards | ✅ Pass | `ProtectedRoute` / `GuestRoute` |
| Custom claims | ⚠️ Action | Must be set via Admin SDK before pilot |
| Repository provider | ✅ Pass | `local` default; `firestore` for production |
| Environment variables | ✅ Pass | No secrets in source; `.env.example` documented |
| Anonymous access | ✅ Pass | Not enabled in application code |
| Public write access | ✅ Pass | Rules require authenticated role |

## Firestore Rules

Source: `firestore.rules`

- **Default deny:** `match /{document=**}` → `allow read, write: if false`
- **Administrator:** Full write on campaigns, rukns, karkuns, connections, settings, communications
- **Rukn:** Read scoped to `ruknId` claim; write on own connections and scoped execution
- **No unauthenticated access:** All rules require `request.auth != null` or explicit role

### Findings

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| SEC-01 | Medium | `executions` read allows any Rukn (`isRukn()`) | Acceptable for pilot; tighten to `ruknId` match in post-pilot if needed |
| SEC-02 | Medium | `compliance` read allows any Rukn | Rukn portal shows assigned karkuns only via UI; rules are broader than UI |
| SEC-03 | Low | `VITE_ADMIN_EMAILS` client-side allowlist | Replace with custom claims before production cutover |

## Authentication

- Demo auth (`mockAuth`) **removed** in M7
- `authenticationService` is the only login path
- Session stored via Firebase persistence + `authSession` cache
- Password re-auth in Danger Zone uses Firebase `reauthenticateWithCredential`

## Route Guards

- `/admin/*` → `ProtectedRoute allowedRole="administrator"`
- `/rukn/*` → `ProtectedRoute allowedRole="rukn"`
- Cross-role access redirects to role home via `getAuthorizedRedirect()`
- `initializing` state prevents flash redirect during session restore

## Secrets

| Check | Result |
|-------|--------|
| Firebase keys in source code | None — env vars only |
| `.env.local` in git | Not committed (verify `.gitignore`) |
| Hardcoded passwords | None in production path |
| API keys in `dist/` | Expected (Firebase web API key is public; security via rules) |

## Production Configuration

Ensure production hosting **does not** set:

```
VITE_REPOSITORY_PROVIDER=local   # Wrong for production
```

Production must use:

```
VITE_REPOSITORY_PROVIDER=firestore
VITE_FIREBASE_*                  # Production Firebase project
VITE_ADMIN_EMAILS                # Bootstrap only until claims deployed
```

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Technical Lead | | | ☐ |
| Security Reviewer | | | ☐ |
