# Release Candidate — Karkun Connect 1.0.0 RC1

**Release date:** July 2026  
**Target:** Basavakalyan pilot  
**Phase:** P1 Production Readiness  
**Commit baseline:** `main` after M6–M8 milestones

## Release Notes

### Platform

- React 19 SPA with Administrator and Rukn portals
- Firebase Authentication (email/password + phone OTP)
- Cloud Firestore persistence with offline cache and multi-device sync
- Repository layer isolating storage from business logic

### Administrator

- Command center dashboard with campaign, people, and compliance metrics
- Campaign management, Rukn master (49), Karkun registry (~493)
- Connection engine with gender matching, replace, and remove
- Execution monitoring, follow-up queue, compliance modules
- Communication templates, data migration wizard, settings

### Rukn

- Mission dashboard with prioritized karkun list
- Connection journey and Annexure-1 visit recording
- Campaign record and mobile-optimized navigation

### Infrastructure (M6.9 – M8)

- Repository interfaces with local and Firestore implementations
- Production authentication with role resolution and route guards
- Firestore security rules, indexes, and migration utility

### Quality Assurance

```bash
npm run verify:rc1   # 11 automated verification scripts
```

## Known Issues

| ID | Severity | Description | Workaround |
|----|----------|-------------|------------|
| KI-01 | Low | Full collection hydration on Firestore snapshot | Acceptable at pilot scale |
| KI-02 | Low | Rukn compliance rules broader than UI scope | UI filters to assigned karkuns |
| KI-03 | Medium | Custom claims require manual Admin SDK setup | Use `VITE_ADMIN_EMAILS` bootstrap |
| KI-04 | Low | No built-in client error monitoring | Use Firebase console + manual reports |
| KI-05 | Low | WhatsApp integration shows disconnected status | Templates work; live API post-pilot |

**No known P1 blockers** for controlled pilot deployment when Firebase is configured per operations docs.

## Deferred Items (Post-Pilot)

| Item | Reason |
|------|--------|
| Push notifications | Out of RC1 scope |
| Territory mapping / analytics | Out of RC1 scope |
| Scoped Firestore queries for Rukn role | Performance optimization |
| Sentry / Crashlytics integration | Monitoring enhancement |
| Incremental Firestore writes | Cost optimization at scale |
| MFA for administrators | M7 future strategy documented |
| WhatsApp Business API live connection | External dependency |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OTP quota exceeded | Medium | High | Blaze plan; monitor Auth dashboard |
| Custom claims not set | Medium | High | Admin setup guide; bootstrap allowlist |
| Firestore rules mis-deploy | Low | High | Staging test; rules in git |
| Pilot user training gap | Medium | Medium | Guides + Help page + briefing |
| Offline conflict | Low | Medium | Refresh; documented in smoke test |
| Data migration error | Low | High | JSON backup before migration |

**Overall risk:** **Low–Medium** for controlled pilot with operations checklist completed.

## Go-Live Checklist

See [Production Checklist](production-checklist.md) for full itemized list.

Minimum requirements:

- [ ] Firebase production project configured
- [ ] `firestore.rules` and indexes deployed
- [ ] `VITE_REPOSITORY_PROVIDER=firestore` in production build
- [ ] Administrator and Rukn auth verified
- [ ] Master data loaded and backed up
- [ ] Smoke test passed
- [ ] Pilot team briefed

## Upgrade Path

```bash
git pull origin main
npm install
npm run build
npm run verify:rc1
# Deploy dist/ + firestore rules if changed
```

## Previous Release Notes

- [Sprint 13 RC1 Notes](../sprints/sprint-13-rc1-release-notes.md) — initial RC1 (pre-Firebase)
