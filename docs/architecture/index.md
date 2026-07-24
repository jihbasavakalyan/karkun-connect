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
| `src/lib/auth/authorization.ts` | Role-based home routes and path guards |
| `src/services/authenticationService.ts` | Firebase Authentication service |
| `src/constants/demoRukn.ts` | Rukn email → ID mapping |
| `src/data/ruknMaster.ts` | 49 Rukn master records |
| `src/data/production/` | Male/female karkun production seeds |
| `src/lib/peopleStore.ts` | Rukn/Karkun registry operations |
| `src/lib/peopleClassification.ts` | KC-0101 — Karkun / Muttafiq classification |
| `docs/architecture/people-classification.md` | People classification model |
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

- Firebase Authentication via `authenticationService` (M7)
- Session cached in `authSession.ts`; Firebase handles token persistence
- Role-based home redirect: `/admin` or `/rukn`
- Rukn OTP + JWT claims: [rukn-authentication.md](./rukn-authentication.md); activation audit [KC-0100.3](./kc-0100-3-activation-reliability.md)

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

- [**KC-ARCH-001 — Reliability & Persistence Standard**](./kc-arch-001-reliability-persistence.md) (mandatory for all modules)
- [Data Preservation & Recovery (KC-0058)](./DATA_PRESERVATION.md)
- [Firestore Backend (M8)](./firestore.md)
- [Authentication (M7)](./authentication.md)
- [Repository Layer (M6.9)](./repository-layer.md)
- [Product Experience Constitution (PX Constitution)](../architecture/product-experience-constitution.md)
- [Workflow Automation Constitution](../architecture/workflow-automation-constitution.md)
- [Communication Operating System (KC-0090)](../communication/README.md) — documentation-only product specification
- [Testing Strategy](../testing/README.md)
- [Database Conventions](../database/README.md) (future backend)

## RC1 Exclusions

No Firebase, REST API, WebSocket, or persistent database in this release. Architecture assumes future backend integration at store/service boundaries.
