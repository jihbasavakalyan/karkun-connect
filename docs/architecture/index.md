# Architecture Index — Karkun Connect 1.0 RC1

## Overview

Karkun Connect is a single-page React application with role-based routing (Administrator / Rukn). All data is in-memory for RC1; production master records load via client-side migration on boot.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                       │
├──────────────┬──────────────────────────────────────────┤
│  Auth Layer  │  authSession.ts + AuthProvider           │
├──────────────┼──────────────────────────────────────────┤
│   Routing    │  AppRouter.tsx + route guards              │
├──────────────┼──────────────────────────────────────────┤
│    Pages     │  admin/*  |  rukn/*  |  shared/*         │
├──────────────┼──────────────────────────────────────────┤
│   Services   │  assignment, compliance, execution       │
├──────────────┼──────────────────────────────────────────┤
│    Stores    │  assignment, activity, compliance        │
├──────────────┼──────────────────────────────────────────┤
│  Master Data │  ruknMaster + karkun production seeds    │
└──────────────┴──────────────────────────────────────────┘
```

## Key Directories

| Path | Purpose |
|------|---------|
| `src/routes/AppRouter.tsx` | Route definitions and legacy redirects |
| `src/constants/adminNavigation.ts` | Admin sidebar navigation |
| `src/constants/routes.ts` | Route path constants |
| `src/constants/mockAuth.ts` | Demo credentials |
| `src/constants/demoRukn.ts` | Rukn email → ID mapping |
| `src/data/ruknMaster.ts` | 49 Rukn master records |
| `src/data/production/` | Male/female karkun production seeds |
| `src/lib/peopleStore.ts` | Rukn/Karkun registry operations |
| `src/lib/assignmentEngine.ts` | Assignment facade for UI |
| `src/services/assignmentService.ts` | Assign/replace/remove logic |
| `src/stores/assignmentStore.ts` | In-memory assignment records |
| `src/services/productionDataMigrationService.ts` | Boot-time data import |
| `src/services/ijtemaAttendanceService.ts` | Ijtema compliance |
| `src/services/jihWebPortalService.ts` | JIH registration & reporting |
| `src/services/baitulMaalService.ts` | Bait-ul-Maal compliance |
| `src/lib/authSession.ts` | Session persistence |
| `scripts/verify-*.ts` | RC1 regression verification |

## Data Flow

1. **Boot** — `main.tsx` calls `runProductionDataMigration()`
2. **Migration** — Imports male/female karkun CSV seeds into `MOCK_KARKUN_REGISTRY`
3. **Compliance init** — Creates default Ijtema/JIH/Bait-ul-Maal records per Karkun
4. **Runtime** — Assignments, execution, and compliance updates mutate in-memory stores
5. **Reload** — Master data re-imports; runtime assignments reset (session auth may persist)

## Authentication

- Mock credential validation in `mockAuth.ts`
- Session stored in `localStorage` (Remember Me) or `sessionStorage` (tab session)
- Role-based home redirect: `/admin` or `/rukn`

## Assignment Invariants

- One active assignment per Rukn
- Gender must match between Rukn and Karkun
- Valid 10-digit mobile required before assign
- Replace/remove require reason and existing active assignment

## Compliance Model

Each Karkun has parallel records across three services:

- Ijtema attendance (current period status)
- JIH web portal (registration + monthly reporting)
- Bait-ul-Maal (contribution status)

Dashboard metrics aggregate pending counts from these services.

## Verification

```bash
npm run verify:rc1
```

Scripts validate routes, auth, data integrity, assignments, and compliance without a browser.

## Related Documents

- [Repository Layer (M6.9)](./repository-layer.md)
- [Product Experience Constitution (PX Constitution)](../architecture/product-experience-constitution.md)
- [Workflow Automation Constitution](../architecture/workflow-automation-constitution.md)
- [Testing Strategy](../testing/README.md)
- [Database Conventions](../database/README.md) (future backend)

## RC1 Exclusions

No Firebase, REST API, WebSocket, or persistent database in this release. Architecture assumes future backend integration at store/service boundaries.
