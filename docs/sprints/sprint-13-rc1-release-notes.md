# Karkun Connect 1.0.0 RC1 — Release Notes

**Release date:** July 7, 2026  
**Target:** Basavakalyan pilot  
**Codename:** RC1

## Summary

Karkun Connect 1.0.0 RC1 is the first release candidate for field pilot deployment. This build completes application-wide QA across navigation, workflows, UI consistency, mobile responsiveness, functional regression, and data integrity.

## What's Included

### Administrator Portal

- Command center dashboard with people, assignment, and compliance metrics
- Campaign management
- Rukn master (49 records) and Karkun registry (~493 production records)
- Assignment engine with gender matching, replace, and remove
- Execution monitoring and reports
- Compliance: Ijtema, JIH registration, monthly reporting, Bait-ul-Maal
- Follow-up queue, Settings, and Help

### Rukn Portal

- Mission dashboard with visit queue
- My Karkun list with Annexure-1 access
- Campaign Record view
- Mobile-optimized bottom navigation

### Authentication

- Administrator and four Rukn demo accounts
- Remember Me session persistence
- Logout on all portal layouts

### Quality Assurance

- Five verification scripts + unified `npm run verify:rc1`
- Navigation audit with legacy redirect coverage
- Data integrity checks for masters and compliance defaults

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@demo.com | password |
| Rukn | rukn1@demo.com – rukn4@demo.com | password |

## Upgrade / Install

```bash
git pull origin main
npm install
npm run build
npm run verify:rc1
```

Deploy the `dist/` folder to your static hosting target.

## Known Limitations

- **No persistence:** Assignments and execution data reset on full page reload
- **No backend:** All data is client-side mock stores
- **No notifications, analytics, or territory mapping**
- **Bundle size:** Single JS chunk ~527 KB (code-splitting deferred post-pilot)

## Documentation

- [README](../../README.md)
- [User Guide](../guides/user-guide.md)
- [Administrator Guide](../guides/administrator-guide.md)
- [Rukn Guide](../guides/rukn-guide.md)
- [Pilot Checklist](../pilot/basavakalyan-pilot-checklist.md)
- [Architecture Index](../architecture/index.md)

## Sprint 13 Phase Commits

| Phase | Hash | Description |
|-------|------|-------------|
| 1 | `d615616` | Navigation and routing audit |
| 2 | `0b4ec29` | Workflow validation |
| 3 | `cd433da` | UI consistency and responsive polish |
| 4 | `ee230ff` | Functional regression testing |
| 5 | `487699b` | Release candidate preparation |

## Feedback

Report pilot issues with: role, screen URL, steps to reproduce, expected vs actual behavior, and device/browser.
