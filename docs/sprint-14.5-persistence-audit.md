# Sprint 14.5 — Data Integrity & Persistence Audit

## Executive Summary

Karkun Connect is a Campaign Operating System. Before Sprint 14.5, only **Connections (assignments)** and **auth sessions** survived browser refresh. All other operational data lived in memory and was lost on F5 or browser restart. Production migration also re-imported the Karkun registry on every page load, wiping user edits.

Sprint 14.5 adds **localStorage persistence** to every runtime store and gates production migration so master data imports run once, not on every refresh.

---

## Phase 1 — Data Flow Audit

| Entity | Canonical Source | Persisted | Storage Key | Reload Point |
|--------|------------------|-----------|-------------|--------------|
| Rukn | `data/ruknMaster.ts` + `peopleStore` | **Yes** | `karkun-connect.rukn-master` | Module init via `loadPeopleRegistryFromPersistence()` |
| Karkun | `mockKarkunRegistry` + `peopleStore` | **Yes** | `karkun-connect.karkun-registry` | Gated migration or persistence load |
| Connections | `assignmentStore` | **Yes** | `karkun-connect.assignments` | Module init |
| Campaign | `constants/mockMissions.ts` | Static | — | Bundled constants (intentional) |
| Annexure-1 | `annexure1Store` | **Yes** | `karkun-connect.annexure1` | Module init |
| Follow-up | `followUpStore` | **Yes** | `karkun-connect.followups` | Module init |
| Bait-ul-Maal | `baitulMaalStore` | **Yes** | `karkun-connect.baitul-maal` | Module init |
| Ijtema | `ijtemaAttendanceStore` | **Yes** | `karkun-connect.ijtema` | Module init |
| JIH Portal | `jihWebPortalStore` | **Yes** | `karkun-connect.jih-portal` | Module init |
| Communication | `communicationStore` | **Yes** | `karkun-connect.communication` | Module init |
| Activity Log | `activityLogStore` | **Yes** | `karkun-connect.activity-log` | Module init |
| Auth Session | `authSession.ts` | **Yes** | `karkun-connect.auth.*` | `AuthProvider` mount |
| Settings | `SettingsPage` | Static | — | Constants only (V2) |

---

## Phase 2 — Defects Found & Fixed

| # | Defect | Root Cause | Fix |
|---|--------|------------|-----|
| 1 | Connections lost on refresh | In-memory `assignmentStore` | Fixed in P0 (`c1e4e13`) |
| 2 | Karkun registry reset every load | `runProductionDataMigration()` always re-imported | Gate migration with `karkun-connect.migration.version` |
| 3 | Rukn/Karkun edits lost | No people registry persistence | `peopleRegistryPersistence.ts` + `notifyPeopleChange()` |
| 4 | Annexure-1 lost | In-memory `annexure1Store` | localStorage on every mutation |
| 5 | Follow-ups lost | In-memory `followUpStore` | localStorage on every mutation |
| 6 | Compliance lost | In-memory Map stores | localStorage on every upsert |
| 7 | Template edits lost | In-memory `communicationStore` | localStorage blob |
| 8 | Karkun visit fields lost | Annexure updates not persisted | People registry persist on `notifyPeopleRegistryChange()` |
| 9 | Dashboard/Connection desync after refresh | Registry not synced from assignments | `syncAllKarkunRegistryFromAssignments()` in `main.tsx` |

---

## Phase 3 — Persistence Flow (After Fix)

```
App Start (main.tsx)
  ↓
runProductionDataMigration()  — skip if version + registry exist
  ↓
syncAllKarkunRegistryFromAssignments()
  ↓
All stores hydrate from localStorage at module import
  ↓
Dashboard / Connections / Annexure / Compliance read same canonical stores
```

---

## Phase 4 — Connection Engine Verification

Verified by `npm run verify:assignments` and `npm run verify:persistence`:

- One Rukn → multiple connected Karkuns
- One Karkun → one active Rukn
- Connect / Disconnect / Reconnect
- Connection history preserved
- Simulated browser reload (`reloadAssignmentStoreFromPersistence`)

---

## Phase 5 — Persistence Layer

**Implementation:** Browser `localStorage` with in-memory fallback for vite-node verification scripts (`browserStorage.ts`).

**Not used:** Zustand Persist, IndexedDB, Firebase, repository layer.

**Recommendation for production:** Backend API + database (Sprint 16+) while keeping the same store interfaces.

---

## Phase 6 — Product Language (UI Only)

User-facing terminology updated to Connection language. Internal code (`AssignmentService`, `assignmentStore`, etc.) unchanged per sprint rules.
