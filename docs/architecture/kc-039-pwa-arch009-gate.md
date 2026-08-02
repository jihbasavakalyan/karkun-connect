# KC-039 — Progressive Web App (ARCH-009 Gate)

**Classification:** Infrastructure / Configuration  
**Standards:** KC-ARCH-009 · no campaign/auth/Firestore/business rule changes  
**Scope:** Vite PWA (manifest, SW, install/offline/update UX, icons only)

## Phase 0

Deliver installable home-screen access without URL typing. Offline shell only (no offline entry).

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Vite build | Y | vite-plugin-pwa |
| index.html | Y | apple icons, theme meta |
| App shell UI | Y | install card, offline banner, update toast |
| Auth / Firestore / Dashboard / Reports / Ijtema | N | untouched |
| Routing | N | start_url `/` |

## Phase 1

| Domain | Risk | Mitigation |
|--------|------|------------|
| Service worker cache of API/Firestore | **HIGH** | Network-only for navigations to API; precache static assets only; never cache auth tokens specially |
| Install spam | MEDIUM | 30-day dismiss localStorage |
| Update loops | MEDIUM | prompt via workbox, user Refresh click |

## Go / No-Go

| Question | Answer |
|----------|--------|
| Offline data entry? | **NO** |
| Custom SW logic beyond plugin? | Prefer plugin defaults + navigateFallback offline |
| Proceed? | **GO** |

## Phase 5 target

**READY** when typecheck/build pass and Production deploy serves manifest + SW.
