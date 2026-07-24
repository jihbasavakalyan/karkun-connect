# Repository Layer — M6.9

## Purpose

Karkun Connect stores application state in memory and persists it through a **repository layer**. Stores and services never call `localStorage`, Firestore, or IndexedDB directly. This milestone prepares the application for **M7 (Firebase Authentication)** and **M8 (Firestore Backend)** without further store refactoring.

Users should notice no behavioral change. Only persistence boundaries move.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI / Pages                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Stores & Services                         │
│  assignmentStore, communicationStore, peopleRegistry, …      │
│  (in-memory state, business queries, subscribe/notify)       │
└─────────────────────────────┬───────────────────────────────┘
                              │ getRepositories()
┌─────────────────────────────▼───────────────────────────────┐
│                   Repository Interfaces                      │
│  Campaign, Rukn, Karkun, Connection, Execution,              │
│  Communication, Compliance, Settings                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│   Local Repositories    │     │  Firestore Repositories     │
│   (M6.9 — current)      │     │  (M8 — future)              │
│   browserStorage.ts     │     │  batched writes, listeners  │
└─────────────────────────┘     └─────────────────────────────┘
```

### Provider

`getRepositories()` in `src/repositories/provider.ts` returns a singleton `RepositoryBundle`. Today every slot is a `*LocalRepository` class. M8 will switch the factory to Firestore implementations while keeping the same interfaces.

```ts
const { connection, karkun, settings } = getRepositories()
```

## Repository Interfaces

| Repository | Domain | Key operations |
|------------|--------|----------------|
| `CampaignRepository` | Campaign library | `getAll`, `getById`, `getActive` |
| `RuknRepository` | Rukn master | `loadAll`, `saveAll`, `clear`, `exists` |
| `KarkunRepository` | Karkun registry + next ID | `loadState`, `saveState`, `clear`, `exists` |
| `ConnectionRepository` | Assignments + activity log | `loadState`, `saveState`, `loadActivityLog`, `clear*` |
| `ExecutionRepository` | Annexure-1, follow-ups, guidance | `load/save/clear` per entity group |
| `CommunicationRepository` | Templates, drafts, sends | `loadState(fallback)`, `saveState`, `clear` |
| `ComplianceRepository` | Bait-ul-Maal, Ijtema, JIH portal | `load/save/clear` per compliance area |
| `SettingsRepository` | Migration version, broadcast lists, backups | version + backup index CRUD |

All methods return `RepositoryResult<T>` — never throw for expected storage failures.

## Responsibilities

### Stores

- Own in-memory collections and derived queries.
- Call repositories only inside `persist*`, `load*`, `clear*`, and migration helpers.
- Must not import `browserStorage`, `STORAGE_KEYS`, or Firebase SDKs.

### Repositories

- Map domain types to persistence keys or Firestore documents.
- Centralize JSON serialization and key naming (`src/repositories/storageKeys.ts`).
- Return standardized errors; local implementations use `tryRepository()` for sync I/O.

### Services / Engines

- Connection, Journey, Guidance, Communication, and Campaign engines are unchanged.
- `productionDataMigrationService` and `migrationBackupService` use `SettingsRepository` for version and backup I/O.

## Error Model

Defined in `src/repositories/errors.ts`:

| Code | When |
|------|------|
| `NotFound` | Entity or backup ID missing |
| `Duplicate` | Unique constraint violation (future Firestore) |
| `Validation` | Invalid payload before write |
| `Permission` | Auth / rules denial (M7/M8) |
| `StorageFailure` | Local I/O or network failure |
| `Unexpected` | Unhandled failure |

Stores typically use `unwrapRepository(result, fallback)` for read paths that previously defaulted silently.

## Transactions

`runLocalTransaction()` in `src/repositories/transactions.ts` defines a commit/rollback boundary. Local repos run synchronously today. Firestore repos will map `commit()` to a batched write and `rollback()` to discarding pending ops.

## Offline Extension Points

`src/repositories/offline.ts` defines types and `OfflineSyncPort` for:

- Sync status (`synced` | `pending` | `offline` | `conflict`)
- Pending write queue
- Conflict resolution strategies
- Retry / flush lifecycle

`offlineSyncPort` is a no-op placeholder in local-only mode. No synchronization is implemented in M6.9.

## Storage Key Registry

All local keys live in `STORAGE_KEYS`. Deprecated exports in `peopleRegistryPersistence.ts` remain for backward compatibility but new code must use repositories.

| Key constant | Data |
|--------------|------|
| `ruknMaster` | Rukn array |
| `karkunRegistry` / `karkunNextId` | Karkun records + ID counter |
| `assignments` / `assignmentSequence` | Connection records |
| `activityLog` | Assignment audit trail |
| `annexure1`, `followUps`, `guidance` | Execution artifacts |
| `communication` | Communication engine blob |
| `baitulMaal`, `ijtema`, `jihPortal` | Compliance maps |
| `broadcastLists`, `migrationVersion`, `migrationBackups` | Settings / migration |

Entity IDs (karkun `id`, assignment `assignmentNumber`, form `id`, etc.) are owned by domain logic and stored verbatim — repositories do not remap identifiers.

## Future Firestore Mapping (M8)

| Local key / entity | Firestore collection (proposed) | Notes |
|--------------------|----------------------------------|-------|
| `ruknMaster` | `rukns/{ruknId}` | One doc per Rukn |
| `karkunRegistry` | `karkuns/{karkunId}` | Counter in `meta/karkun` |
| `assignments` | `assignments/{assignmentId}` | Composite indexes for Rukn/Karkun queries |
| `activityLog` | `activityLog/{entryId}` | Append-only |
| Execution blobs | `execution/{type}` or subcollections | May split annexure / follow-ups |
| `communication` | `communication/state` | Single doc or subcollections per template |
| Compliance maps | `compliance/{karkunId}` | Nested baitulMaal / ijtema / jih fields |
| Settings / backups | `settings/*` | Admin-only rules |

`getRepositoryProviderMode()` will return `'firestore'` when Firebase is configured. Stores remain unchanged.

## Migration Strategy

1. **M6.9 (complete)** — Introduce interfaces, local implementations, provider, refactor stores.
2. **M7** — Firebase Auth; `Permission` errors wired to security rules.
3. **M8** — Implement `*FirestoreRepository` classes; feature-flag provider switch.
4. **Data import** — One-time export via `migrationBackupService` → Firestore import script.
5. **Dual-write (optional)** — Short window validating Firestore reads against local snapshots.
6. **Cutover** — Provider mode `firestore`; local keys retained for offline cache only.

## Verification

```bash
npm run verify:repositories   # repository round-trips and provider wiring
npm run verify:reliability    # KC-ARCH-001 reliability layer contracts
npm run verify:rc1            # full RC1 regression suite (includes repositories)
```

## Policy

All repository and Firestore work must comply with
[KC-ARCH-001 — Reliability & Persistence Standard](./kc-arch-001-reliability-persistence.md).

## Related Files

```
src/repositories/
  provider.ts
  errors.ts
  transactions.ts
  offline.ts
  storageKeys.ts
  interfaces/
  local/localRepositories.ts
  firestore/firestoreRepositories.ts
src/lib/reliability/
  persistErrors.ts
  guidanceStateMerge.ts
```
