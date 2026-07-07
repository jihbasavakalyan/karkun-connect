# Sprint 13 Phase 4 — Functional Regression Testing

**Status:** Complete  
**Date:** July 2026

## Verification Suite

| Script | Scope | Result |
|--------|-------|--------|
| `verify-routes.ts` | Navigation and route aliases | Pass |
| `verify-auth-session.ts` | Demo accounts, Remember Me, session restore | Pass |
| `verify-data-integrity.ts` | Master data, migration, compliance defaults | Pass |
| `verify-inline-assignment.ts` | Male/Female assign, replace, unassign | Pass |
| `verify-compliance-module.ts` | Ijtema, JIH, Bait-ul-Maal workflows | Pass |
| `verify-rc1.ts` | Full RC1 regression gate | Pass |

## Run Commands

```bash
npm run verify:rc1
```

Or individually:

```bash
npx vite-node scripts/verify-auth-session.ts
npx vite-node scripts/verify-inline-assignment.ts
npx vite-node scripts/verify-compliance-module.ts
npx vite-node scripts/verify-routes.ts
npx vite-node scripts/verify-data-integrity.ts
```

## Build & Lint

```bash
npm run build
npm run lint
```

Both pass for RC1.
